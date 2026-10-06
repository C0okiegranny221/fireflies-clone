import { describe, expect, it } from "vitest";

import { safeNextPath } from "./auth";

describe("safeNextPath", () => {
  it.each([
    ["/meetings/1?t=5000", "/meetings/1?t=5000"],
    ["/tasks", "/tasks"],
  ])("keeps same-site path %s", (raw, expected) => {
    expect(safeNextPath(raw)).toBe(expected);
  });

  it.each([
    null,
    "",
    "https://evil.example",
    "//evil.example",
    "/\\evil.example",
    "javascript:alert(1)",
  ])("rejects %s", (raw) => {
    expect(safeNextPath(raw)).toBe("/home");
  });
});
