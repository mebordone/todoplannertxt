/* Tests for lib/priorityDisplay.js */

const { priorityDisplay } = require("../../lib/priorityDisplay.js");

describe("priorityDisplay", () => {
  describe("priorityToLetter", () => {
    test("1 returns A", () => {
      expect(priorityDisplay.priorityToLetter(1)).toBe("A");
    });
    test("5 returns B", () => {
      expect(priorityDisplay.priorityToLetter(5)).toBe("B");
    });
    test("9 returns C", () => {
      expect(priorityDisplay.priorityToLetter(9)).toBe("C");
    });
    test("0 returns empty string", () => {
      expect(priorityDisplay.priorityToLetter(0)).toBe("");
    });
    test("undefined null or other number returns empty string", () => {
      expect(priorityDisplay.priorityToLetter(undefined)).toBe("");
      expect(priorityDisplay.priorityToLetter(null)).toBe("");
      expect(priorityDisplay.priorityToLetter(2)).toBe("");
      expect(priorityDisplay.priorityToLetter(10)).toBe("");
    });
  });

  describe("priorityToCssClass", () => {
    test("1 returns task-priority-a", () => {
      expect(priorityDisplay.priorityToCssClass(1)).toBe("task-priority-a");
    });
    test("5 returns task-priority-b", () => {
      expect(priorityDisplay.priorityToCssClass(5)).toBe("task-priority-b");
    });
    test("9 returns task-priority-c", () => {
      expect(priorityDisplay.priorityToCssClass(9)).toBe("task-priority-c");
    });
    test("0 or other returns empty string", () => {
      expect(priorityDisplay.priorityToCssClass(0)).toBe("");
      expect(priorityDisplay.priorityToCssClass(undefined)).toBe("");
      expect(priorityDisplay.priorityToCssClass(3)).toBe("");
    });
  });

  describe("isOverdue", () => {
    test("null or undefined returns false", () => {
      expect(priorityDisplay.isOverdue(null)).toBe(false);
      expect(priorityDisplay.isOverdue(undefined)).toBe(false);
    });
    test("empty string returns false", () => {
      expect(priorityDisplay.isOverdue("")).toBe(false);
    });
    test("date before today returns true", () => {
      const past = "2020-01-01";
      expect(priorityDisplay.isOverdue(past)).toBe(true);
    });
    test("date after today returns false", () => {
      const future = "2030-12-31";
      expect(priorityDisplay.isOverdue(future)).toBe(false);
    });
    test("today returns false", () => {
      const today = new Date();
      const y = today.getFullYear();
      const m = String(today.getMonth() + 1).padStart(2, "0");
      const d = String(today.getDate()).padStart(2, "0");
      const todayStr = `${y}-${m}-${d}`;
      expect(priorityDisplay.isOverdue(todayStr)).toBe(false);
    });
    test("string with more than 10 chars uses first 10", () => {
      const past = "2020-01-01T12:00:00";
      expect(priorityDisplay.isOverdue(past)).toBe(true);
    });
  });
});
