import type { Meta, StoryObj, Decorator } from "@storybook/react-vite";
import { fn } from "storybook/test";
import ProfilePage from "./ProfilePage";
import { AuthContext, type AuthContextValue } from "../../context/AuthContext";

const mockAuth = (avatar: string | null = null): AuthContextValue => ({
  user: { id: 1, email: "demo@example.com", avatar, createdAt: "2024-01-15" },
  token: "mock-token",
  login: fn(),
  register: fn(),
  logout: fn(),
  updateToken: fn(),
  refreshUser: async () => {},
});

const withAuth = (auth: AuthContextValue): Decorator =>
  (Story) => (
    <AuthContext.Provider value={auth}>
      <div style={{ width: 560 }}>
        <Story />
      </div>
    </AuthContext.Provider>
  );

const meta = {
  title: "Components/ProfilePage",
  component: ProfilePage,
  parameters: { layout: "centered" },
  args: { onBack: fn() },
} satisfies Meta<typeof ProfilePage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  decorators: [withAuth(mockAuth())],
};

export const WithAvatar: Story = {
  decorators: [withAuth(mockAuth("https://api.dicebear.com/7.x/avataaars/svg?seed=demo"))],
};
