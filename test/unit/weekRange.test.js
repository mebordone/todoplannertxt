/* Tests for lib/weekRange.js */

const { getWeekRange, isDueInWeekRange } = require("../../lib/weekRange.js");

describe("weekRange", () => {
  describe("getWeekRange", () => {
    test("monday: 2025-03-03 (Monday) returns same day as start, end Saturday", () => {
      const r = getWeekRange("monday", "2025-03-03");
      expect(r.start).toBe("2025-03-03");
      expect(r.end).toBe("2025-03-09");
    });
    test("monday: 2025-03-05 (Wednesday) returns Monday as start", () => {
      const r = getWeekRange("monday", "2025-03-05");
      expect(r.start).toBe("2025-03-03");
      expect(r.end).toBe("2025-03-09");
    });
    test("monday: 2025-03-09 (Sunday) returns Monday 3rd as start", () => {
      const r = getWeekRange("monday", "2025-03-09");
      expect(r.start).toBe("2025-03-03");
      expect(r.end).toBe("2025-03-09");
    });
    test("sunday: 2025-03-09 (Sunday) returns same day as start", () => {
      const r = getWeekRange("sunday", "2025-03-09");
      expect(r.start).toBe("2025-03-09");
      expect(r.end).toBe("2025-03-15");
    });
    test("sunday: 2025-03-05 (Wednesday) returns previous Sunday as start", () => {
      const r = getWeekRange("sunday", "2025-03-05");
      expect(r.start).toBe("2025-03-02");
      expect(r.end).toBe("2025-03-08");
    });
    test("invalid date returns start and end as todayStr", () => {
      const r = getWeekRange("monday", "invalid");
      expect(r.start).toBe("invalid");
      expect(r.end).toBe("invalid");
    });
  });

  describe("isDueInWeekRange", () => {
    test("due within start and end returns true", () => {
      expect(isDueInWeekRange("2025-03-05", "2025-03-03", "2025-03-09")).toBe(true);
      expect(isDueInWeekRange("2025-03-03", "2025-03-03", "2025-03-09")).toBe(true);
      expect(isDueInWeekRange("2025-03-09", "2025-03-03", "2025-03-09")).toBe(true);
    });
    test("due before start returns false", () => {
      expect(isDueInWeekRange("2025-03-02", "2025-03-03", "2025-03-09")).toBe(false);
    });
    test("due after end returns false", () => {
      expect(isDueInWeekRange("2025-03-10", "2025-03-03", "2025-03-09")).toBe(false);
    });
    test("null or empty dueStr returns false", () => {
      expect(isDueInWeekRange(null, "2025-03-03", "2025-03-09")).toBe(false);
      expect(isDueInWeekRange("", "2025-03-03", "2025-03-09")).toBe(false);
    });
    test("dueStr with time slice uses first 10 chars", () => {
      expect(isDueInWeekRange("2025-03-05T00:00:00", "2025-03-03", "2025-03-09")).toBe(true);
    });
  });
});
