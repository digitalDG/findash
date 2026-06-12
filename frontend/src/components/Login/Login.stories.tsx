import type { Meta, StoryObj, Decorator } from "@storybook/react";
import { fn, userEvent, within, expect } from "storybook/test";
import Login from "./Login";
import { AuthContext, type AuthContextValue } from "../../context/AuthContext";

const mockAuth: AuthContextValue = {
  user: null,
  token: null,
  login: fn(),
  register: fn(),
  logout: fn(),
  updateToken: fn(),
  refreshUser: async () => {},
};

const withAuth: Decorator = (Story) => (
  <AuthContext.Provider value={mockAuth}>
    <Story />
  </AuthContext.Provider>
);

const meta = {
  title: "Components/Login",
  component: Login,
  decorators: [withAuth],
  parameters: { layout: "centered" },
  args: { onSwitchToRegister: fn() },
} satisfies Meta<typeof Login>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const FilledIn: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByPlaceholderText("Email"), "demo@example.com");
    await userEvent.type(canvas.getByPlaceholderText("Password"), "mypassword");
  },
};

export const ForgotPasswordView: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: /forgot password/i }));
    await expect(canvas.getByPlaceholderText("Your email address")).toBeInTheDocument();
  },
};
