/* Tests funcionales para util */

const { util } = require("../../modules/util.js");

describe("util (functional)", () => {
  describe("makeArray", () => {
    test("empty or null returns []", () => {
      expect(util.makeArray("")).toEqual([]);
      expect(util.makeArray(null)).toEqual([]);
    });
    test("splits by spaces and trims", () => {
      expect(util.makeArray("a b  c")).toEqual(["a", "b", "c"]);
    });
  });

  describe("makeStr", () => {
    test("joins with space by default", () => {
      expect(util.makeStr(["a", "b"])).toBe("a b");
    });
    test("custom separator", () => {
      expect(util.makeStr(["a", "b"], ",")).toBe("a,b");
    });
    test("non-array returns empty string", () => {
      expect(util.makeStr(null)).toBe("");
    });
  });

  describe("makeDateStr", () => {
    test("formats date as YYYY-MM-DD", () => {
      const d = new Date(2024, 0, 5);
      expect(util.makeDateStr(d)).toBe("2024-01-05");
    });
    test("zero-pads month and day", () => {
      const d = new Date(2024, 8, 9);
      expect(util.makeDateStr(d)).toBe("2024-09-09");
    });
    test("non-Date returns empty string", () => {
      expect(util.makeDateStr(null)).toBe("");
    });
  });

  describe("parseDate", () => {
    test("parses YYYY-MM-DD", () => {
      const d = util.parseDate("2024-03-15");
      expect(d.getFullYear()).toBe(2024);
      expect(d.getMonth()).toBe(2);
      expect(d.getDate()).toBe(15);
    });
  });

  describe("calPriority", () => {
    test("string A -> 1, B -> 5, C -> 9", () => {
      expect(util.calPriority("A")).toBe(1);
      expect(util.calPriority("B")).toBe(5);
      expect(util.calPriority("C")).toBe(9);
      expect(util.calPriority("X")).toBe(0);
    });
    test("number 1 -> A, 5 -> B, 9 -> C", () => {
      expect(util.calPriority(1)).toBe("A");
      expect(util.calPriority(5)).toBe("B");
      expect(util.calPriority(9)).toBe("C");
      expect(util.calPriority(0)).toBeNull();
    });
    test("invalid type throws", () => {
      expect(() => util.calPriority({})).toThrow();
    });
    test("number 2 and 3 return null", () => {
      expect(util.calPriority(2)).toBeNull();
      expect(util.calPriority(3)).toBeNull();
    });
  });

  describe("makeTitle", () => {
    test("without prefs or useThunderbird returns item.render()", () => {
      const item = { render: () => "raw line", textTokens: () => [] };
      expect(util.makeTitle(item, null)).toBe("raw line");
      expect(util.makeTitle(item, { useThunderbird: false })).toBe("raw line");
    });
    test("with showFullTitle strips priority/date/addons", () => {
      const item = { render: () => "(A) 2024-01-01 title due:2024-02-01", textTokens: () => ["title"] };
      const out = util.makeTitle(item, { useThunderbird: true, showFullTitle: true });
      expect(out).not.toMatch(/^\(A\)/);
    });
    test("with useThunderbird and !showFullTitle uses textTokens", () => {
      const item = { render: () => "full", textTokens: () => ["short"] };
      expect(util.makeTitle(item, { useThunderbird: true, showFullTitle: false })).toBe("short");
    });
  });

  describe("makeArray edge cases", () => {
    test("string with multiple spaces and trim", () => {
      expect(util.makeArray("  a   b  ")).toEqual(["a", "b"]);
    });
  });

  describe("makeDateStr edge cases", () => {
    test("single digit day and month get padded", () => {
      expect(util.makeDateStr(new Date(2024, 0, 1))).toBe("2024-01-01");
    });
  });

  describe("makeStr edge cases", () => {
    test("non-array input returns empty string", () => {
      expect(util.makeStr(undefined)).toBe("");
      expect(util.makeStr("not-array")).toBe("");
    });
    test("separator undefined uses space", () => {
      expect(util.makeStr(["a", "b"], undefined)).toBe("a b");
    });
  });

  describe("makeDateStr all branches", () => {
    test("month and day less than 10 get zero-padded", () => {
      expect(util.makeDateStr(new Date(2024, 0, 5))).toBe("2024-01-05");
      expect(util.makeDateStr(new Date(2023, 8, 9))).toBe("2023-09-09");
    });
  });

  describe("makeArray with empty trim", () => {
    test("parts with empty trim are skipped", () => {
      expect(util.makeArray("  a  b   c  ")).toEqual(["a", "b", "c"]);
    });
  });
});
