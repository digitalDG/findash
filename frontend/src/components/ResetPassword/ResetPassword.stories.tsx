import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "storybook/test";
import ResetPassword from "./ResetPassword";

const meta = {
  title: "Components/ResetPassword",
  component: ResetPassword,
  parameters: { layout: "centered" },
  args: {
    token: "demo-reset-token-abc123",
    onSuccess: fn(),
  },
} satisfies Meta<typeof ResetPassword>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
