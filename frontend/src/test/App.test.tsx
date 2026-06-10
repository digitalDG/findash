import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "../App";

function renderApp() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <App />
    </QueryClientProvider>
  );
}

vi.mock("../context/AuthContext", () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useAuth: () => ({
    user: { id: 1, email: "test@example.com", avatar: null, createdAt: null },
    token: "fake-token",
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    updateToken: vi.fn(),
    refreshUser: vi.fn(),
  }),
  Avatar: ({ email }: { email: string }) => <span>{email[0]}</span>,
}));

vi.mock("../components/Watchlist", () => ({
  default: ({ onSelectTicker }: { onSelectTicker: (t: string) => void }) => (
    <div data-testid="watchlist" onClick={() => onSelectTicker("AAPL")}>
      Watchlist
    </div>
  ),
}));

vi.mock("../components/Portfolio", () => ({
  default: () => <div data-testid="portfolio">Portfolio</div>,
}));

vi.mock("../components/StockDetail", () => ({
  default: ({ ticker, onBack }: { ticker: string; onBack: () => void }) => (
    <div data-testid="stock-detail">
      <span>{ticker}</span>
      <button onClick={onBack}>Back</button>
    </div>
  ),
}));

describe("App", () => {
  it("renders watchlist tab by default", () => {
    renderApp();
    expect(screen.getByTestId("watchlist")).toBeInTheDocument();
  });

  it("switches to portfolio tab", async () => {
    const user = userEvent.setup();
    renderApp();
    await user.click(screen.getByRole("button", { name: /portfolio/i }));
    expect(screen.getByTestId("portfolio")).toBeInTheDocument();
  });

  it("shows stock detail when a ticker is selected", async () => {
    const user = userEvent.setup();
    renderApp();
    await user.click(screen.getByTestId("watchlist"));
    expect(screen.getByTestId("stock-detail")).toBeInTheDocument();
    expect(screen.getByText("AAPL")).toBeInTheDocument();
  });

  it("returns to watchlist from stock detail via Back button", async () => {
    const user = userEvent.setup();
    renderApp();
    await user.click(screen.getByTestId("watchlist"));
    await user.click(screen.getByRole("button", { name: /back/i }));
    expect(screen.getByTestId("watchlist")).toBeInTheDocument();
  });

  it("clears selected ticker when switching tabs", async () => {
    const user = userEvent.setup();
    renderApp();
    await user.click(screen.getByTestId("watchlist")); // navigate to AAPL detail
    await user.click(screen.getByRole("button", { name: /portfolio/i }));
    expect(screen.getByTestId("portfolio")).toBeInTheDocument();
  });
});
