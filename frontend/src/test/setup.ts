/// <reference types="@testing-library/jest-dom" />
import { expect, afterEach } from "vitest";
import { cleanup } from "@testing-library/react";
import * as matchers from "@testing-library/jest-dom/matchers";

expect.extend(matchers);

afterEach(() => {
  cleanup();
});

window.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;

window.Notification = class {
  static permission: NotificationPermission = "default";
  static requestPermission = async () => "default" as NotificationPermission;
  constructor() {}
} as unknown as typeof Notification;
