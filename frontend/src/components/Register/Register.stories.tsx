import type { Meta, StoryObj, Decorator } from "@storybook/react";
import { fn, userEvent, within } from "storybook/test";
import Register from "./Register";
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
  title: "Components/Register",
  component: Register,
  decorators: [withAuth],
  parameters: { layout: "centered" },
  args: { onSwitchToLogin: fn() },
} satisfies Meta<typeof Register>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const FilledIn: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByPlaceholderText("Email"), "newuser@example.com");
    await userEvent.type(canvas.getByPlaceholderText("Password (8+ characters)"), "securepass123");
    await userEvent.type(canvas.getByPlaceholderText("Confirm password"), "securepass123");
  },
};
