/// <reference types="vite/client" />
import type { Preview } from "@storybook/react";
import { initialize, mswLoader } from "msw-storybook-addon";
import "../src/index.css";

initialize({ onUnhandledRequest: "bypass" });

const preview: Preview = {
  tags: ["autodocs"],
  loaders: [mswLoader],
  parameters: {
    backgrounds: {
      default: "dark",
      values: [
        { name: "dark", value: "#0f1117" },
        { name: "light", value: "#f4f6fb" },
      ],
    },
    layout: "centered",
    options: {
      storySort: {
        order: ["FinDash", "Components"],
      },
    },
  },
};

export default preview;
