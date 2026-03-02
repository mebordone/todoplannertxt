/* Tests funcionales para MD5 (hash de contenido) */

const { md5 } = require("../../modules/md5.js");

describe("md5 (functional)", () => {
  test("empty string", () => {
    const h = md5("");
    expect(h).toMatch(/^[a-f0-9]{32}$/);
    expect(h).toBe("d41d8cd98f00b204e9800998ecf8427e");
  });

  test("deterministic for same input", () => {
    expect(md5("hello")).toBe(md5("hello"));
  });

  test("different inputs different hashes", () => {
    expect(md5("a")).not.toBe(md5("b"));
  });

  test("content change changes hash", () => {
    const h1 = md5("todo line 1\n");
    const h2 = md5("todo line 1\ntodo line 2\n");
    expect(h1).not.toBe(h2);
  });

  test("returns 32 hex chars", () => {
    const h = md5("test content");
    expect(h.length).toBe(32);
    expect(h).toMatch(/^[a-f0-9]+$/);
  });

  test("long input and multiple block processing", () => {
    const long = "a".repeat(1000);
    const h = md5(long);
    expect(h).toMatch(/^[a-f0-9]{32}$/);
  });

  test("exactly 64 chars and 56 chars boundary", () => {
    expect(md5("a".repeat(64))).toMatch(/^[a-f0-9]{32}$/);
    expect(md5("a".repeat(56))).toMatch(/^[a-f0-9]{32}$/);
  });

  test("long string triggers extra block (i > 55)", () => {
    const long = "x".repeat(120);
    expect(md5(long)).toMatch(/^[a-f0-9]{32}$/);
    expect(md5(long)).toBe(md5(long));
  });
});
