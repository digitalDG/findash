import { useState, useEffect, useRef } from "react";
import { ErrorBoundary as SentryErrorBoundary } from "@sentry/react";
import { useQueryClient } from "@tanstack/react-query";
import { Sun, Moon } from "lucide-react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { useTheme } from "./hooks/useTheme";
import Login from "./components/Login";
import Register from "./components/Register";
import ResetPassword from "./components/ResetPassword";
import Watchlist from "./components/Watchlist";
import StockDetail from "./components/StockDetail";
import Portfolio from "./components/Portfolio";
import ProfilePage, { Avatar } from "./components/ProfilePage";
import "./index.css";

type Tab = "watchlist" | "portfolio";

function getResetToken(): string | null {
  const params = new URLSearchParams(window.location.search);
  return params.get("reset_token");
}

function clearResetToken() {
  const url = new URL(window.location.href);
  url.searchParams.delete("reset_token");
  window.history.replaceState({}, "", url.toString());
}

function AppShell() {
  const { user, logout, updateToken } = useAuth();
  const { theme, toggle: toggleTheme } = useTheme();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<Tab>("watchlist");
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null);
  const [authView, setAuthView] = useState<"login" | "register">("login");
  const [showProfile, setShowProfile] = useState(false);
  const [resetToken, setResetToken] = useState<string | null>(getResetToken);

  const prevUserId = useRef(user?.id);
  useEffect(() => {
    const changed = prevUserId.current !== user?.id;
    prevUserId.current = user?.id;
    if (!changed) return;

    setActiveTab("watchlist");
    setSelectedTicker(null);
    setShowProfile(false);

    if (!user) {
      queryClient.clear();
      setAuthView("login");
    }
  }, [user, queryClient]);

  const themeButton = (extraClass = "") => (
    <button
      onClick={toggleTheme}
      className={`p-1.5 rounded-md text-muted hover:text-foreground hover:bg-surface-raised transition-colors ${extraClass}`}
      title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
    >
      {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
    </button>
  );

  // Password reset flow — takes priority over everything else
  if (resetToken && !user) {
    return (
      <div className="relative">
        {themeButton("absolute top-4 right-4 z-10")}
        <ResetPassword
          token={resetToken}
          onSuccess={(accessToken) => {
            clearResetToken();
            setResetToken(null);
            updateToken(accessToken);
          }}
        />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="relative">
        {themeButton("absolute top-4 right-4 z-10")}
        {authView === "login" ? (
          <Login onSwitchToRegister={() => setAuthView("register")} />
        ) : (
          <Register onSwitchToLogin={() => setAuthView("login")} />
        )}
      </div>
    );
  }

  function switchTab(tab: Tab) {
    setActiveTab(tab);
    setSelectedTicker(null);
    setShowProfile(false);
  }

  function renderMain() {
    if (showProfile) return <ProfilePage onBack={() => setShowProfile(false)} />;
    if (selectedTicker) return <StockDetail ticker={selectedTicker} onBack={() => setSelectedTicker(null)} />;
    if (activeTab === "watchlist") return <Watchlist onSelectTicker={setSelectedTicker} />;
    return <Portfolio onSelectTicker={setSelectedTicker} />;
  }

  return (
    <div className="flex flex-col min-h-screen">
      <header className="bg-surface border-b border-border sticky top-0 z-10">
        <div className="max-w-[1100px] mx-auto px-6 flex items-center justify-between h-14">
          <div className="flex items-center gap-2 font-bold text-lg">
            <span>📈</span>
            <span>FinDash</span>
          </div>
          <nav className="flex gap-1 items-center">
            {(["watchlist", "portfolio"] as Tab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => switchTab(tab)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium capitalize transition-colors ${
                  activeTab === tab && !showProfile
                    ? "bg-surface-raised text-foreground"
                    : "text-muted hover:text-foreground hover:bg-surface-raised"
                }`}
              >
                {tab}
              </button>
            ))}
            <button
              onClick={() => setShowProfile((v) => !v)}
              className={`ml-3 flex items-center gap-2 px-2 py-1 rounded-md transition-colors ${
                showProfile ? "bg-surface-raised" : "hover:bg-surface-raised"
              }`}
              title={user.email}
            >
              <Avatar email={user.email} size={26} src={user.avatar} />
              <span className="text-xs text-muted hidden sm:inline max-w-[200px] truncate">{user.email}</span>
            </button>
            {themeButton("ml-1")}
            <button
              onClick={logout}
              className="px-3 py-1.5 rounded-md text-sm text-muted hover:text-foreground hover:bg-surface-raised transition-colors"
            >
              Sign out
            </button>
          </nav>
        </div>
      </header>

      <main className="max-w-[1100px] mx-auto px-6 py-8 w-full">
        {renderMain()}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <SentryErrorBoundary fallback={
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted text-sm">Something went wrong. Please reload.</p>
      </div>
    }>
      <AuthProvider>
        <AppShell />
      </AuthProvider>
    </SentryErrorBoundary>
  );
}
