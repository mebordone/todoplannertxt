/* eslint-env jest */
const { parseQuickAddToken, filterTokenSuggestions } = require("../../tab/quickAddToken.js");

describe("quickAddToken", () => {
  describe("parseQuickAddToken", () => {
    test("null value returns null kind", () => {
      const r = parseQuickAddToken(null, 0);
      expect(r.kind).toBeNull();
    });

    test("plain title without token", () => {
      const r = parseQuickAddToken("buy milk", 8);
      expect(r.kind).toBeNull();
    });

    test("+ with empty prefix at end", () => {
      const r = parseQuickAddToken("task +", 6);
      expect(r.kind).toBe("project");
      expect(r.replaceStart).toBe(5);
      expect(r.replaceEnd).toBe(6);
      expect(r.prefix).toBe("");
    });

    test("+prefix cursor at end replaces full token", () => {
      const r = parseQuickAddToken("x +gro extra", 6);
      expect(r.kind).toBe("project");
      expect(r.replaceStart).toBe(2);
      expect(r.replaceEnd).toBe(6);
      expect(r.prefix).toBe("gro");
    });

    test("+prefix cursor in middle of token", () => {
      const r = parseQuickAddToken("x +gro extra", 4);
      expect(r.kind).toBe("project");
      expect(r.replaceStart).toBe(2);
      expect(r.replaceEnd).toBe(6);
      expect(r.prefix).toBe("g");
    });

    test("@context", () => {
      const r = parseQuickAddToken("call mom @ho", 12);
      expect(r.kind).toBe("context");
      expect(r.prefix).toBe("ho");
      expect(r.replaceStart).toBe(9);
      expect(r.replaceEnd).toBe(12);
    });

    test("multiple tokens: cursor in second + token", () => {
      const r = parseQuickAddToken("+a +beta", 8);
      expect(r.kind).toBe("project");
      expect(r.replaceStart).toBe(3);
      expect(r.prefix).toBe("beta");
      expect(r.replaceEnd).toBe(8);
    });

    test("caret at 0", () => {
      const r = parseQuickAddToken("+foo", 0);
      expect(r.kind).toBeNull();
    });
  });

  describe("filterTokenSuggestions", () => {
    test("prefix match case insensitive", () => {
      expect(filterTokenSuggestions(["Alpha", "beta", "alto"], "al", 10)).toEqual(["Alpha", "alto"]);
    });

    test("empty prefix returns sorted slice", () => {
      expect(filterTokenSuggestions(["z", "a", "m"], "", 2)).toEqual(["a", "m"]);
    });

    test("dedupes", () => {
      expect(filterTokenSuggestions(["x", "x", "y"], "", 10)).toEqual(["x", "y"]);
    });

    test("default limit", () => {
      const many = Array.from({ length: 30 }, (_, i) => `p${i}`);
      expect(filterTokenSuggestions(many, "", undefined).length).toBe(20);
    });
  });
});
