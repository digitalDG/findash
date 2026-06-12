import type { Meta, StoryObj, Decorator } from "@storybook/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fn, userEvent, within } from "storybook/test";
import { handlers } from "../../mocks/handlers";
import TickerSearch from "./TickerSearch";

const withQuery: Decorator = (Story) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <div style={{ width: 320 }}>
      <Story />
    </div>
  </QueryClientProvider>
);

const meta = {
  title: "Components/TickerSearch",
  component: TickerSearch,
  decorators: [withQuery],
  parameters: {
    layout: "centered",
    msw: { handlers },
  },
  args: { onSelect: fn(), onDeselect: fn() },
} satisfies Meta<typeof TickerSearch>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithResults: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByRole("textbox"), "AAPL");
  },
};

export const Disabled: Story = {
  args: { disabled: true },
};
