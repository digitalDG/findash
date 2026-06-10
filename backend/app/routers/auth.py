import base64
import secrets

from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.core.auth import create_access_token, get_current_user, hash_password, verify_password
from app.core.config import settings
from app.core.database import get_db
from app.models.db import User
from app.models.schemas import (
    DeleteAccountRequest,
    ForgotPasswordRequest,
    ProfileUpdate,
    ResetPasswordRequest,
    Token,
    UserCreate,
    UserLogin,
    UserSchema,
)
from app.services.cache import cache
from app.services.email_service import (
    send_account_deleted_email,
    send_email_changed_email,
    send_password_changed_email,
    send_password_reset_email,
)

RESET_TOKEN_TTL = 3600  # 1 hour

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=Token, status_code=201)
def register(payload: UserCreate, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    user = User(email=payload.email, password_hash=hash_password(payload.password))
    db.add(user)
    db.commit()
    db.refresh(user)
    return Token(access_token=create_access_token(user.id, user.email))


@router.post("/login", response_model=Token)
def login(payload: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    return Token(access_token=create_access_token(user.id, user.email))


@router.get("/me", response_model=UserSchema)
def me(current_user: User = Depends(get_current_user)):
    return current_user


@router.put("/me", response_model=Token)
def update_profile(
    background_tasks: BackgroundTasks,
    payload: ProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not verify_password(payload.current_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect")

    old_email = current_user.email
    email_changed = False
    password_changed = False

    if payload.new_email and payload.new_email != current_user.email:
        if db.query(User).filter(User.email == payload.new_email, User.id != current_user.id).first():
            raise HTTPException(status_code=400, detail="Email already in use")
        current_user.email = payload.new_email
        email_changed = True

    if payload.new_password:
        if len(payload.new_password) < 8:
            raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
        current_user.password_hash = hash_password(payload.new_password)
        password_changed = True

    db.commit()
    db.refresh(current_user)

    if email_changed:
        background_tasks.add_task(send_email_changed_email, old_email, current_user.email)
    if password_changed:
        background_tasks.add_task(send_password_changed_email, current_user.email)

    return Token(access_token=create_access_token(current_user.id, current_user.email))


@router.post("/me/avatar", response_model=UserSchema)
async def upload_avatar(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    allowed = {"image/jpeg", "image/png", "image/webp", "image/gif"}
    if file.content_type not in allowed:
        raise HTTPException(status_code=400, detail="Only JPEG, PNG, WebP, and GIF are allowed")
    content = await file.read()
    if len(content) > 2 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Image must be smaller than 2MB")
    b64 = base64.b64encode(content).decode()
    current_user.avatar = f"data:{file.content_type};base64,{b64}"
    db.commit()
    db.refresh(current_user)
    return current_user


@router.post("/forgot-password", status_code=200)
def forgot_password(
    background_tasks: BackgroundTasks,
    payload: ForgotPasswordRequest,
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.email == payload.email).first()
    if user:
        token = secrets.token_urlsafe(32)
        cache.set(f"reset:{token}", str(user.id), ttl=RESET_TOKEN_TTL)
        reset_url = f"{settings.frontend_url}/?reset_token={token}"
        background_tasks.add_task(send_password_reset_email, user.email, reset_url)
    # Always return 200 — never reveal whether the email exists
    return {"message": "If that email is registered, a reset link is on its way."}


@router.post("/reset-password", response_model=Token)
def reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)):
    if len(payload.new_password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
    user_id = cache.get(f"reset:{payload.token}")
    if not user_id:
        raise HTTPException(status_code=400, detail="Reset link is invalid or has expired")
    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user:
        raise HTTPException(status_code=400, detail="Reset link is invalid or has expired")
    user.password_hash = hash_password(payload.new_password)
    db.commit()
    cache.delete(f"reset:{payload.token}")
    return Token(access_token=create_access_token(user.id, user.email))


@router.delete("/me", status_code=204)
def delete_account(
    background_tasks: BackgroundTasks,
    payload: DeleteAccountRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not verify_password(payload.password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Incorrect password")
    email = current_user.email
    db.delete(current_user)
    db.commit()
    background_tasks.add_task(send_account_deleted_email, email)
