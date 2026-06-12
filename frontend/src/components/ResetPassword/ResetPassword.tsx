import { useState, type FormEvent } from "react";
import { Eye, EyeOff } from "lucide-react";

const BASE_URL = "";

interface Props {
  token: string;
  onSuccess: (accessToken: string) => void;
}

function PasswordInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        type={show ? "text" : "password"}
        required
        autoComplete="new-password"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-surface-raised border border-border rounded px-3 py-2 pr-9 text-sm outline-none focus:border-indigo-500"
      />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        tabIndex={-1}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-foreground transition-colors"
      >
        {show ? <EyeOff size={15} /> : <Eye size={15} />}
      </button>
    </div>
  );
}

export default function ResetPassword({ token, onSuccess }: Props) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (password !== confirm) { setError("Passwords do not match"); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters"); return; }
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, new_password: password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.detail ?? `HTTP ${res.status}`);
      onSuccess(data.access_token);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reset failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="bg-surface border border-border rounded-xl p-8 w-full max-w-sm shadow-xl">
        <div className="flex items-center gap-2 font-bold text-xl mb-6">
          <span>📈</span>
          <span>FinDash</span>
        </div>
        <h1 className="text-lg font-semibold mb-1">Set new password</h1>
        <p className="text-xs text-muted mb-4">Choose a new password for your account.</p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <PasswordInput value={password} onChange={setPassword} placeholder="New password (8+ characters)" />
          <PasswordInput value={confirm} onChange={setConfirm} placeholder="Confirm new password" />
          {error && <p className="text-xs text-negative">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded transition-colors"
          >
            {loading ? "Saving…" : "Set new password"}
          </button>
        </form>
      </div>
    </div>
  );
}
