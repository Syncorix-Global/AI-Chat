import { describe, it, expect } from "vitest";
import { add } from "../src";

describe("add", () => {
  it("works", () => {
    expect(add(2, 3)).toBe(5);
  });
});