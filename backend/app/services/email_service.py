import httpx
from app.core.config import settings

TOKEN_URL = "https://login.microsoftonline.com/common/oauth2/v2.0/token"
SCOPE = "https://graph.microsoft.com/Mail.Send offline_access"


async def _get_access_token() -> str:
    async with httpx.AsyncClient() as client:
        resp = await client.post(TOKEN_URL, data={
            "grant_type": "refresh_token",
            "client_id": settings.ms_client_id,
            "refresh_token": settings.ms_refresh_token,
            "scope": SCOPE,
        })
        if resp.status_code != 200:
            raise RuntimeError(f"Token refresh failed {resp.status_code}: {resp.text}")
        return resp.json()["access_token"]


async def send_price_alert_email(
    to_email: str,
    ticker: str,
    direction: str,
    target_price: float,
    current_price: float,
) -> None:
    if not settings.ms_client_id or not settings.ms_refresh_token:
        return

    symbol = ">=" if direction == "above" else "<="
    html = f"""
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
      <h2 style="margin:0 0 8px">Price Alert: {ticker}</h2>
      <p style="color:#555;margin:0 0 16px">Your alert condition has been met.</p>
      <table style="width:100%;border-collapse:collapse">
        <tr>
          <td style="padding:8px 0;color:#888">Ticker</td>
          <td style="padding:8px 0;font-weight:600">{ticker}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#888">Condition</td>
          <td style="padding:8px 0;font-weight:600">Price {symbol} ${target_price:.2f}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#888">Current Price</td>
          <td style="padding:8px 0;font-weight:600">${current_price:.2f}</td>
        </tr>
      </table>
      <p style="color:#aaa;font-size:12px;margin-top:24px">Sent by FinDash · This alert has been removed.</p>
    </div>
    """

    token = await _get_access_token()

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"https://graph.microsoft.com/v1.0/users/{settings.ms_sender_email}/sendMail",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "message": {
                    "subject": f"FinDash Alert: {ticker} is {symbol} ${target_price:.2f}",
                    "body": {"contentType": "HTML", "content": html},
                    "toRecipients": [{"emailAddress": {"address": to_email}}],
                }
            },
            timeout=15,
        )
        if resp.status_code not in (200, 202):
            raise RuntimeError(f"sendMail failed {resp.status_code}: {resp.text}")


async def _send(to_email: str, subject: str, html: str) -> None:
    if not settings.ms_client_id or not settings.ms_refresh_token:
        return
    token = await _get_access_token()
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"https://graph.microsoft.com/v1.0/users/{settings.ms_sender_email}/sendMail",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "message": {
                    "subject": subject,
                    "body": {"contentType": "HTML", "content": html},
                    "toRecipients": [{"emailAddress": {"address": to_email}}],
                }
            },
            timeout=15,
        )
        if resp.status_code not in (200, 202):
            raise RuntimeError(f"sendMail failed {resp.status_code}: {resp.text}")


def _base(title: str, body_html: str) -> str:
    return f"""
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
      <h2 style="margin:0 0 8px">{title}</h2>
      {body_html}
      <p style="color:#aaa;font-size:12px;margin-top:24px">Sent by FinDash · If you didn't make this change, contact support immediately.</p>
    </div>
    """


async def send_password_changed_email(to_email: str) -> None:
    html = _base(
        "Your password was changed",
        "<p style='color:#555;margin:0 0 16px'>Your FinDash account password was just updated. "
        "If this was you, no action is needed.</p>",
    )
    await _send(to_email, "FinDash: Password changed", html)


async def send_email_changed_email(old_email: str, new_email: str) -> None:
    html = _base(
        "Your email address was changed",
        f"<p style='color:#555;margin:0 0 16px'>The email address on your FinDash account has been "
        f"updated to <strong>{new_email}</strong>.</p>"
        "<p style='color:#555;margin:0'>If you didn't request this change, contact support immediately.</p>",
    )
    await _send(old_email, "FinDash: Email address changed", html)


async def send_account_deleted_email(to_email: str) -> None:
    html = _base(
        "Your account has been deleted",
        "<p style='color:#555;margin:0'>Your FinDash account and all associated data have been permanently deleted. "
        "We're sorry to see you go.</p>",
    )
    await _send(to_email, "FinDash: Account deleted", html)


async def send_password_reset_email(to_email: str, reset_url: str) -> None:
    html = _base(
        "Reset your password",
        f"<p style='color:#555;margin:0 0 16px'>We received a request to reset your FinDash password. "
        f"Click the button below — this link expires in 1 hour.</p>"
        f"<a href='{reset_url}' style='display:inline-block;background:#6366f1;color:#fff;"
        f"text-decoration:none;padding:10px 20px;border-radius:6px;font-weight:600;margin-bottom:16px'>"
        f"Reset Password</a>"
        f"<p style='color:#aaa;font-size:12px;margin:0'>If you didn't request this, you can safely ignore this email.</p>",
    )
    await _send(to_email, "FinDash: Reset your password", html)
