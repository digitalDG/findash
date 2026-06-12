import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import Paginator from "./Paginator";

const meta = {
  title: "Components/Paginator",
  component: Paginator,
  parameters: { layout: "padded" },
  args: { onPrev: fn(), onNext: fn() },
} satisfies Meta<typeof Paginator>;

export default meta;
type Story = StoryObj<typeof meta>;

export const FirstPage: Story = { args: { page: 0, totalPages: 5 } };
export const MiddlePage: Story = { args: { page: 2, totalPages: 5 } };
export const LastPage: Story = { args: { page: 4, totalPages: 5 } };
export const TwoPages: Story = { args: { page: 0, totalPages: 2 } };
