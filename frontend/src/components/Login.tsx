import { useState, type FormEvent } from "react";
import { Eye, EyeOff, ArrowLeft } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const BASE_URL = "";

interface Props {
  onSwitchToRegister: () => void;
}

export default function Login({ onSwitchToRegister }: Props) {
  const { login } = useAuth();

  // Sign-in state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Forgot password state
  const [view, setView] = useState<"login" | "forgot">("login");
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotStatus, setForgotStatus] = useState<string | null>(null);
  const [forgotLoading, setForgotLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleForgot(e: FormEvent) {
    e.preventDefault();
    setForgotLoading(true);
    setForgotStatus(null);
    try {
      await fetch(`${BASE_URL}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail }),
      });
      setForgotStatus("If that email is registered, a reset link is on its way. Check your inbox.");
    } catch {
      setForgotStatus("Something went wrong. Please try again.");
    } finally {
      setForgotLoading(false);
    }
  }

  const card = "bg-surface border border-border rounded-xl p-8 w-full max-w-sm shadow-xl";

  if (view === "forgot") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className={card}>
          <div className="flex items-center gap-2 font-bold text-xl mb-6">
            <span>📈</span>
            <span>FinDash</span>
          </div>
          <button
            onClick={() => { setView("login"); setForgotStatus(null); setForgotEmail(""); }}
            className="flex items-center gap-1.5 text-muted hover:text-foreground text-xs mb-4 transition-colors"
          >
            <ArrowLeft size={13} /> Back to sign in
          </button>
          <h1 className="text-lg font-semibold mb-1">Reset password</h1>
          <p className="text-xs text-muted mb-4">
            Enter your email and we'll send you a link to reset your password.
          </p>
          {forgotStatus ? (
            <p className="text-sm text-positive">{forgotStatus}</p>
          ) : (
            <form onSubmit={handleForgot} className="flex flex-col gap-3">
              <input
                type="email"
                required
                autoComplete="email"
                placeholder="Your email address"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                className="w-full bg-surface-raised border border-border rounded px-3 py-2 text-sm outline-none focus:border-indigo-500"
              />
              <button
                type="submit"
                disabled={forgotLoading}
                className="w-full bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded transition-colors"
              >
                {forgotLoading ? "Sending…" : "Send reset link"}
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className={card}>
        <div className="flex items-center gap-2 font-bold text-xl mb-6">
          <span>📈</span>
          <span>FinDash</span>
        </div>
        <h1 className="text-lg font-semibold mb-4">Sign in</h1>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="email"
            required
            autoComplete="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-surface-raised border border-border rounded px-3 py-2 text-sm outline-none focus:border-indigo-500"
          />
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              required
              autoComplete="current-password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-surface-raised border border-border rounded px-3 py-2 pr-9 text-sm outline-none focus:border-indigo-500 [&::-webkit-credentials-auto-fill-button]:hidden [&::-webkit-strong-password-auto-fill-button]:hidden"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-foreground transition-colors"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setView("forgot")}
              className="text-xs text-muted hover:text-indigo-400 transition-colors"
            >
              Forgot password?
            </button>
          </div>
          {error && <p className="text-xs text-negative">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded transition-colors"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
        <p className="text-xs text-muted mt-4 text-center">
          No account?{" "}
          <button onClick={onSwitchToRegister} className="text-indigo-400 hover:underline">
            Create one
          </button>
        </p>
      </div>
    </div>
  );
}
