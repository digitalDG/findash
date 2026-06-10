import { useState, useRef, type FormEvent, type ChangeEvent } from "react";
import { Eye, EyeOff, ArrowLeft, Trash2, Camera } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";
const TOKEN_KEY = "findash_token";

const AVATAR_COLORS = ["#6366f1", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#3b82f6", "#ef4444"];

function avatarColor(email: string): string {
  let h = 0;
  for (let i = 0; i < email.length; i++) h = email.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

export function Avatar({
  email,
  size = 36,
  src,
}: {
  email: string;
  size?: number;
  src?: string | null;
}) {
  if (src) {
    return (
      <img
        src={src}
        alt={email[0].toUpperCase()}
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          objectFit: "cover",
          flexShrink: 0,
        }}
      />
    );
  }
  return (
    <div
      style={{
        width: size,
        height: size,
        background: avatarColor(email),
        borderRadius: "50%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#fff",
        fontWeight: 700,
        fontSize: size * 0.42,
        flexShrink: 0,
      }}
    >
      {email[0].toUpperCase()}
    </div>
  );
}

async function authFetch(
  path: string,
  method: string,
  body: object
): Promise<{ access_token?: string; detail?: string }> {
  const token = localStorage.getItem(TOKEN_KEY);
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.detail ?? `HTTP ${res.status}`);
  return data;
}

async function uploadAvatarFile(file: File): Promise<void> {
  const token = localStorage.getItem(TOKEN_KEY);
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${BASE_URL}/api/auth/me/avatar`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.detail ?? `HTTP ${res.status}`);
}

function PasswordInput({
  value,
  onChange,
  placeholder,
  autoComplete,
  required = true,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  autoComplete?: string;
  required?: boolean;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        type={show ? "text" : "password"}
        required={required}
        autoComplete={autoComplete}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-surface-raised border border-border rounded px-3 py-2 pr-9 text-sm outline-none focus:border-indigo-500 webkit-autofill-dark"
      />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        tabIndex={-1}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-foreground transition-colors"
      >
        {show ? <EyeOff size={14} /> : <Eye size={14} />}
      </button>
    </div>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

interface Props {
  onBack: () => void;
}

export default function ProfilePage({ onBack }: Props) {
  const { user, logout, updateToken, refreshUser } = useAuth();

  // Avatar upload
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  // Combined profile update form
  const [currentPw, setCurrentPw] = useState("");
  const [newEmail, setNewEmail] = useState(user?.email ?? "");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [saveStatus, setSaveStatus] = useState<{ ok: boolean; msg: string } | null>(null);
  const [saveLoading, setSaveLoading] = useState(false);

  // Delete account
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deletePw, setDeletePw] = useState("");
  const [deleteStatus, setDeleteStatus] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showDeleteForm, setShowDeleteForm] = useState(false);

  async function handleAvatarChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarLoading(true);
    setAvatarError(null);
    try {
      await uploadAvatarFile(file);
      await refreshUser();
    } catch (err) {
      setAvatarError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setAvatarLoading(false);
      // Reset input so same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    const emailChanged = newEmail.trim() && newEmail.trim() !== user?.email;
    const passwordChanged = newPw.length > 0;

    if (!emailChanged && !passwordChanged) {
      setSaveStatus({ ok: false, msg: "No changes to save" });
      return;
    }
    if (passwordChanged && newPw !== confirmPw) {
      setSaveStatus({ ok: false, msg: "Passwords do not match" });
      return;
    }
    if (passwordChanged && newPw.length < 8) {
      setSaveStatus({ ok: false, msg: "New password must be at least 8 characters" });
      return;
    }

    setSaveLoading(true);
    setSaveStatus(null);
    try {
      const body: Record<string, string> = { current_password: currentPw };
      if (emailChanged) body.new_email = newEmail.trim();
      if (passwordChanged) body.new_password = newPw;

      const data = await authFetch("/api/auth/me", "PUT", body);
      if (data.access_token) updateToken(data.access_token);
      await refreshUser();
      setSaveStatus({ ok: true, msg: "Changes saved" });
      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");
    } catch (err) {
      setSaveStatus({ ok: false, msg: err instanceof Error ? err.message : "Failed" });
    } finally {
      setSaveLoading(false);
    }
  }

  async function handleDelete(e: FormEvent) {
    e.preventDefault();
    if (deleteConfirm !== user?.email) {
      setDeleteStatus("Type your email exactly to confirm");
      return;
    }
    setDeleteLoading(true);
    setDeleteStatus(null);
    try {
      await authFetch("/api/auth/me", "DELETE", { password: deletePw });
      logout();
    } catch (err) {
      setDeleteStatus(err instanceof Error ? err.message : "Failed");
      setDeleteLoading(false);
    }
  }

  if (!user) return null;

  return (
    <div className="max-w-lg mx-auto">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-muted hover:text-foreground text-sm mb-6 transition-colors"
      >
        <ArrowLeft size={15} /> Back
      </button>

      {/* Avatar + identity */}
      <div className="flex items-center gap-4 mb-8">
        <div className="relative group">
          <Avatar email={user.email} size={60} src={user.avatar} />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={avatarLoading}
            className="absolute inset-0 rounded-full flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity disabled:cursor-wait"
            title="Upload photo"
          >
            <Camera size={18} className="text-white" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={handleAvatarChange}
          />
        </div>
        <div>
          <p className="font-semibold">{user.email}</p>
          <p className="text-xs text-muted">
            {user.createdAt ? `Member since ${formatDate(user.createdAt)}` : ""}
          </p>
          {avatarLoading && <p className="text-xs text-muted mt-0.5">Uploading…</p>}
          {avatarError && <p className="text-xs text-negative mt-0.5">{avatarError}</p>}
        </div>
      </div>

      {/* Update profile (combined form) */}
      <section className="bg-surface border border-border rounded-[10px] p-5 mb-4">
        <h2 className="text-sm font-semibold mb-4">Update Profile</h2>
        <form onSubmit={handleSave} className="flex flex-col gap-3">
          <div>
            <label className="block text-xs text-muted mb-1">Current password</label>
            <PasswordInput
              value={currentPw}
              onChange={setCurrentPw}
              placeholder="Required to save changes"
              autoComplete="current-password"
            />
          </div>

          <div className="border-t border-border/50 pt-3 flex flex-col gap-3">
            <div>
              <label className="block text-xs text-muted mb-1">New email</label>
              <input
                type="email"
                autoComplete="email"
                placeholder={user.email}
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="w-full bg-surface-raised border border-border rounded px-3 py-2 text-sm outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs text-muted mb-1">New password</label>
              <PasswordInput
                value={newPw}
                onChange={setNewPw}
                placeholder="Leave blank to keep current"
                autoComplete="new-password"
                required={false}
              />
            </div>
            {newPw.length > 0 && (
              <PasswordInput
                value={confirmPw}
                onChange={setConfirmPw}
                placeholder="Confirm new password"
                autoComplete="new-password"
                required={false}
              />
            )}
          </div>

          {saveStatus && (
            <p className={`text-xs ${saveStatus.ok ? "text-positive" : "text-negative"}`}>
              {saveStatus.msg}
            </p>
          )}
          <button
            type="submit"
            disabled={saveLoading}
            className="self-start bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white text-xs font-medium px-4 py-1.5 rounded transition-colors"
          >
            {saveLoading ? "Saving…" : "Save changes"}
          </button>
        </form>
      </section>

      {/* Danger Zone */}
      <section className="bg-surface border border-negative/30 rounded-[10px] p-5">
        <h2 className="text-sm font-semibold text-negative mb-1">Danger Zone</h2>
        <p className="text-xs text-muted mb-4">
          Permanently delete your account and all data — watchlists, portfolios, and alerts. This
          cannot be undone.
        </p>
        {!showDeleteForm ? (
          <button
            onClick={() => setShowDeleteForm(true)}
            className="flex items-center gap-1.5 text-xs text-negative border border-negative/40 hover:bg-negative/10 px-3 py-1.5 rounded transition-colors"
          >
            <Trash2 size={13} /> Delete Account
          </button>
        ) : (
          <form onSubmit={handleDelete} className="flex flex-col gap-3">
            <p className="text-xs text-muted">
              Type <span className="text-foreground font-mono">{user.email}</span> to confirm:
            </p>
            <input
              type="email"
              required
              placeholder={user.email}
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              className="w-full bg-surface-raised border border-border rounded px-3 py-2 text-sm outline-none focus:border-negative"
            />
            <PasswordInput
              value={deletePw}
              onChange={setDeletePw}
              placeholder="Your password"
              autoComplete="current-password"
            />
            {deleteStatus && <p className="text-xs text-negative">{deleteStatus}</p>}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={deleteLoading || deleteConfirm !== user.email}
                className="flex items-center gap-1.5 text-xs bg-negative/80 hover:bg-negative disabled:opacity-40 text-white px-3 py-1.5 rounded transition-colors"
              >
                <Trash2 size={13} /> {deleteLoading ? "Deleting…" : "Delete my account"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowDeleteForm(false);
                  setDeleteConfirm("");
                  setDeletePw("");
                  setDeleteStatus(null);
                }}
                className="text-xs text-muted hover:text-foreground px-3 py-1.5"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}
