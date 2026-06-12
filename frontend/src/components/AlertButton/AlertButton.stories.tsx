import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "storybook/test";
import AlertButton from "./AlertButton";

const meta = {
  title: "Components/AlertButton",
  component: AlertButton,
  parameters: { layout: "centered" },
  args: {
    onOpen: fn(),
    onClose: fn(),
    onAdd: fn(),
    onRemove: fn(),
  },
} satisfies Meta<typeof AlertButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Idle: Story = {
  name: "Bell — no alert",
  args: { ticker: "AAPL", currentPrice: 213.49, alert: undefined, isOpen: false },
};

export const AlertActive: Story = {
  name: "Bell — alert set",
  args: { ticker: "AAPL", currentPrice: 213.49, alert: { id: "1", ticker: "AAPL", targetPrice: 220.0, direction: "above" }, isOpen: false },
};

export const DropdownEmpty: Story = {
  name: "Dropdown — set new alert",
  args: { ticker: "AAPL", currentPrice: 213.49, alert: undefined, isOpen: true },
};

export const DropdownWithAlert: Story = {
  name: "Dropdown — remove existing alert",
  args: { ticker: "AAPL", currentPrice: 213.49, alert: { id: "1", ticker: "AAPL", targetPrice: 220.0, direction: "above" }, isOpen: true },
};
