import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import posthog from "posthog-js";
import * as Sentry from "@sentry/react";
import "./index.css";
import App from "./App";

posthog.init("phc_pAEFof3k4MtejrhMiXMa7VtqRvvavMccF4jQbNEmBLGT", {
  api_host: "https://us.i.posthog.com",
  person_profiles: "identified_only",
  capture_pageview: true,
});

Sentry.init({
  dsn: "https://511c8f84ea0ad0cb7180e2c238fa5afa@o4511089792057344.ingest.us.sentry.io/4511548614115328",
  integrations: [Sentry.browserTracingIntegration()],
  tracesSampleRate: 0.1,
  environment: import.meta.env.MODE,
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,        // treat data fresh for 60s (matches backend TTL)
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>
);
