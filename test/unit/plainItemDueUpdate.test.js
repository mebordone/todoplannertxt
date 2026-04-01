/* This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. */

const { buildPlainItemWithDueDate } = require("../../lib/plainItemDueUpdate");

describe("buildPlainItemWithDueDate", () => {
  it("returns null dueDate when value is empty or whitespace", () => {
    const item = { id: 1, title: "x", dueDate: "2026-01-01", isCompleted: false };
    expect(buildPlainItemWithDueDate(item, "").dueDate).toBeNull();
    expect(buildPlainItemWithDueDate(item, "   ").dueDate).toBeNull();
    expect(buildPlainItemWithDueDate(item, null).dueDate).toBeNull();
    expect(buildPlainItemWithDueDate(item, undefined).dueDate).toBeNull();
  });

  it("normalizes to YYYY-MM-DD", () => {
    const item = { id: 2, title: "y" };
    const out = buildPlainItemWithDueDate(item, "2026-03-31");
    expect(out.dueDate).toBe("2026-03-31");
    expect(out.title).toBe("y");
    expect(out.id).toBe(2);
  });

  it("does not mutate the original item", () => {
    const item = { id: 3, dueDate: "2025-06-01" };
    buildPlainItemWithDueDate(item, "2026-01-02");
    expect(item.dueDate).toBe("2025-06-01");
  });
});
