import type { Meta, StoryObj, Decorator } from "@storybook/react-vite";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fn } from "storybook/test";
import { handlers } from "../../mocks/handlers";
import Portfolio from "./Portfolio";

const withQuery: Decorator = (Story) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } })}>
    <div style={{ width: 860 }}>
      <Story />
    </div>
  </QueryClientProvider>
);

const meta = {
  title: "Components/Portfolio",
  component: Portfolio,
  decorators: [withQuery],
  parameters: {
    layout: "padded",
    msw: { handlers },
  },
  args: { onSelectTicker: fn() },
} satisfies Meta<typeof Portfolio>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
