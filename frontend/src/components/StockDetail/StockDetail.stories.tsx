import type { Meta, StoryObj, Decorator } from "@storybook/react-vite";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fn } from "storybook/test";
import { handlers } from "../../mocks/handlers";
import StockDetail from "./StockDetail";

const withQuery: Decorator = (Story) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } })}>
    <div style={{ width: 760 }}>
      <Story />
    </div>
  </QueryClientProvider>
);

const meta = {
  title: "Components/StockDetail",
  component: StockDetail,
  decorators: [withQuery],
  parameters: {
    layout: "centered",
    msw: { handlers },
  },
  args: { onBack: fn() },
} satisfies Meta<typeof StockDetail>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Apple: Story = { args: { ticker: "AAPL" } };
export const Nvidia: Story = { args: { ticker: "NVDA" } };
export const InvalidTicker: Story = { name: "Invalid ticker", args: { ticker: "ZZZZZ" } };
