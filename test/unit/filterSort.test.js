/* Tests for tab/filterSort.js */

const {
  DEFAULT_PREFS,
  applySearch,
  applyFilters,
  applySort,
  applyGroup,
  normalizeLocation,
  itemSearchText,
  matchesFilterDue,
  groupKeyFor
} = require("../../tab/filterSort.js");

describe("filterSort", () => {
  const sampleItems = [
    { id: "1", title: "Fix bug", priority: 1, dueDate: "2025-01-10", categories: ["work"], location: ["office"], isCompleted: false, entryDate: "2025-01-01", completedDate: null },
    { id: "2", title: "Buy milk", priority: 2, dueDate: null, categories: ["personal"], location: "", isCompleted: false, entryDate: null, completedDate: null },
    { id: "3", title: "Review PR", priority: 1, dueDate: "2025-12-15", categories: ["work"], location: ["home"], isCompleted: true, entryDate: "2025-01-02", completedDate: "2025-01-05" },
    { id: "4", title: "Call mom", priority: 0, dueDate: "2025-06-01", categories: [], location: ["personal"], isCompleted: false, entryDate: null, completedDate: null }
  ];

  describe("DEFAULT_PREFS", () => {
    test("has expected keys", () => {
      expect(DEFAULT_PREFS.sortBy).toBe("priority");
      expect(DEFAULT_PREFS.filterCompleted).toBe("all");
      expect(DEFAULT_PREFS.groupBy).toBe("");
    });
  });

  describe("normalizeLocation", () => {
    test("array returns as-is (strings)", () => {
      expect(normalizeLocation(["a", "b"])).toEqual(["a", "b"]);
    });
    test("string returns single-element array", () => {
      expect(normalizeLocation("x")).toEqual(["x"]);
    });
    test("null returns empty array", () => {
      expect(normalizeLocation(null)).toEqual([]);
    });
  });

  describe("applySearch", () => {
    test("empty query returns all items", () => {
      expect(applySearch(sampleItems, "")).toHaveLength(4);
      expect(applySearch(sampleItems, "   ")).toHaveLength(4);
    });
    test("filters by title (case-insensitive)", () => {
      const out = applySearch(sampleItems, "bug");
      expect(out).toHaveLength(1);
      expect(out[0].title).toBe("Fix bug");
    });
    test("filters by category", () => {
      const out = applySearch(sampleItems, "work");
      expect(out).toHaveLength(2);
    });
    test("non-array returns empty array", () => {
      expect(applySearch(null, "x")).toEqual([]);
    });
  });

  describe("applyFilters", () => {
    test("no filters returns all", () => {
      expect(applyFilters(sampleItems, {})).toHaveLength(4);
    });
    test("filterProject filters by category", () => {
      const out = applyFilters(sampleItems, { filterProject: "work" });
      expect(out).toHaveLength(2);
      expect(out.every((i) => i.categories && i.categories.includes("work"))).toBe(true);
    });
    test("filterContext filters by location", () => {
      const out = applyFilters(sampleItems, { filterContext: "office" });
      expect(out).toHaveLength(1);
      expect(out[0].id).toBe("1");
    });
    test("filterPriority filters by priority", () => {
      const out = applyFilters(sampleItems, { filterPriority: 1 });
      expect(out).toHaveLength(2);
    });
    test("filterCompleted open excludes completed", () => {
      const out = applyFilters(sampleItems, { filterCompleted: "open" });
      expect(out).toHaveLength(3);
      expect(out.every((i) => !i.isCompleted)).toBe(true);
    });
    test("filterCompleted done only completed", () => {
      const out = applyFilters(sampleItems, { filterCompleted: "done" });
      expect(out).toHaveLength(1);
      expect(out[0].isCompleted).toBe(true);
    });
    test("filterDue none only items without due", () => {
      const out = applyFilters(sampleItems, { filterDue: "none" });
      expect(out).toHaveLength(1);
      expect(out[0].dueDate).toBeNull();
    });
    test("non-array returns empty array", () => {
      expect(applyFilters(null, {})).toEqual([]);
    });
  });

  describe("applySort", () => {
    test("sort by priority asc puts lower number first", () => {
      const out = applySort(sampleItems, "priority", "asc");
      expect(out[0].priority).toBeLessThanOrEqual(out[1].priority);
    });
    test("sort by title asc", () => {
      const out = applySort(sampleItems, "title", "asc");
      expect(out.map((i) => i.title)).toEqual(["Buy milk", "Call mom", "Fix bug", "Review PR"]);
    });
    test("sort by dueDate", () => {
      const out = applySort(sampleItems, "dueDate", "asc");
      const firstWithDue = out.find((i) => i.dueDate);
      expect(firstWithDue && firstWithDue.dueDate).toBe("2025-01-10");
    });
    test("non-array returns empty array", () => {
      expect(applySort(null, "priority", "asc")).toEqual([]);
    });
  });

  describe("applyGroup", () => {
    test("groupBy empty returns single group", () => {
      const out = applyGroup(sampleItems, "");
      expect(out).toHaveLength(1);
      expect(out[0].groupKey).toBe("");
      expect(out[0].items).toHaveLength(4);
    });
    test("groupBy project creates groups by first category", () => {
      const out = applyGroup(sampleItems, "project");
      expect(out.length).toBeGreaterThanOrEqual(1);
      const workGroup = out.find((g) => g.groupKey === "work");
      expect(workGroup && workGroup.items).toHaveLength(2);
    });
    test("groupBy completion creates open and done", () => {
      const out = applyGroup(sampleItems, "completion");
      expect(out.some((g) => g.groupKey === "open")).toBe(true);
      expect(out.some((g) => g.groupKey === "done")).toBe(true);
    });
    test("non-array returns empty array", () => {
      expect(applyGroup(null, "project")).toEqual([]);
    });
  });

  describe("groupKeyFor", () => {
    test("project returns first category", () => {
      expect(groupKeyFor(sampleItems[0], "project")).toBe("work");
    });
    test("context returns first location", () => {
      expect(groupKeyFor(sampleItems[0], "context")).toBe("office");
    });
    test("completion returns done or open", () => {
      expect(groupKeyFor(sampleItems[0], "completion")).toBe("open");
      expect(groupKeyFor(sampleItems[2], "completion")).toBe("done");
    });
  });

  describe("itemSearchText", () => {
    test("includes title and categories", () => {
      const text = itemSearchText(sampleItems[0]);
      expect(text).toContain("fix bug");
      expect(text).toContain("work");
    });
  });

  describe("matchesFilterDue", () => {
    test("today: same date matches", () => {
      const today = new Date().toISOString().slice(0, 10);
      const item = { dueDate: today };
      expect(matchesFilterDue(item, "today")).toBe(true);
    });
    test("today: different date does not match", () => {
      expect(matchesFilterDue({ dueDate: "2020-01-01" }, "today")).toBe(false);
    });
    test("none: no dueDate matches", () => {
      expect(matchesFilterDue({ dueDate: null }, "none")).toBe(true);
      expect(matchesFilterDue({}, "none")).toBe(true);
    });
    test("overdue: past date matches", () => {
      expect(matchesFilterDue({ dueDate: "2020-01-01" }, "overdue")).toBe(true);
    });
    test("overdue: future date does not match", () => {
      expect(matchesFilterDue({ dueDate: "2030-01-01" }, "overdue")).toBe(false);
    });
    test("empty filterDue returns true", () => {
      expect(matchesFilterDue({ dueDate: "2025-01-01" }, "")).toBe(true);
      expect(matchesFilterDue({ dueDate: "2025-01-01" }, null)).toBe(true);
    });
  });

  describe("applySort entryDate and completedDate", () => {
    test("sort by entryDate", () => {
      const out = applySort(sampleItems, "entryDate", "asc");
      expect(out.length).toBe(4);
    });
    test("sort by completedDate", () => {
      const out = applySort(sampleItems, "completedDate", "desc");
      expect(out.length).toBe(4);
    });
  });

  describe("applyFilters filterProject with no categories", () => {
    test("item without categories excluded when filterProject set", () => {
      const items = [{ id: "1", categories: [], title: "x" }, { id: "2", categories: ["work"], title: "y" }];
      const out = applyFilters(items, { filterProject: "work" });
      expect(out).toHaveLength(1);
      expect(out[0].id).toBe("2");
    });
  });

  describe("compareValues via applySort", () => {
    test("sort desc puts higher value first for priority", () => {
      const out = applySort(sampleItems, "priority", "desc");
      expect(out[0].priority >= (out[1].priority || 0)).toBe(true);
    });
  });
});
