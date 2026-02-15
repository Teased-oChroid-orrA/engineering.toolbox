// Minimal config; runner.js drives behavior.
//
// Engine mapping:
// - webkit   => WebKit engine family (macOS/iOS-like behavior)
// - chromium => Blink engine family (Windows/ChromeOS-like behavior)
//
export default {
  timeout: 60_000,
  use: {
    viewport: { width: 1280, height: 720 },
    trace: "off",
    video: "off",
  },
};
