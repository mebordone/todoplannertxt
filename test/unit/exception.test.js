/* Tests funcionales para exception (mensajes de error) */

const { exception } = require("../../modules/exception.js");

describe("exception (functional)", () => {
  test("FILE_NOT_FOUND returns Error with code and message", () => {
    const e = exception.FILE_NOT_FOUND("todo.txt");
    expect(e).toBeInstanceOf(Error);
    expect(e.code).toBe("FILE_NOT_FOUND");
    expect(e.message).toContain("todo.txt");
  });

  test("FILE_CANNOT_WRITE", () => {
    const e = exception.FILE_CANNOT_WRITE("done.txt");
    expect(e.code).toBe("FILE_CANNOT_WRITE");
    expect(e.message).toContain("done.txt");
  });

  test("FILES_NOT_SPECIFIED", () => {
    const e = exception.FILES_NOT_SPECIFIED();
    expect(e.code).toBe("FILES_NOT_SPECIFIED");
    expect(e.message).toBeTruthy();
  });

  test("READ_ONLY_MODE", () => {
    const e = exception.READ_ONLY_MODE();
    expect(e).toBeInstanceOf(Error);
    expect(e.code).toBe("READ_ONLY_MODE");
    expect(e.message).toBeTruthy();
  });

  test("FILE_LOCKED", () => {
    const e = exception.FILE_LOCKED("todo.txt");
    expect(e).toBeInstanceOf(Error);
    expect(e.code).toBe("FILE_LOCKED");
    expect(e.message).toContain("todo.txt");
  });

  test("FILE_NETWORK_OR_REMOTE", () => {
    const e = exception.FILE_NETWORK_OR_REMOTE();
    expect(e).toBeInstanceOf(Error);
    expect(e.code).toBe("FILE_NETWORK_OR_REMOTE");
    expect(e.message).toBeTruthy();
  });

  test("ITEM_NOT_FOUND", () => {
    const e = exception.ITEM_NOT_FOUND();
    expect(e.code).toBe("ITEM_NOT_FOUND");
  });

  test("EVENT_ENCOUNTERED", () => {
    const e = exception.EVENT_ENCOUNTERED();
    expect(e.code).toBe("EVENT_ENCOUNTERED");
  });

  test("UNKNOWN", () => {
    const e = exception.UNKNOWN();
    expect(e.code).toBe("UNKNOWN");
  });

  test("FILE_NOT_FOUND with null fileName", () => {
    const e = exception.FILE_NOT_FOUND(null);
    expect(e.code).toBe("FILE_NOT_FOUND");
  });

  test("FILE_CANNOT_WRITE with null fileName", () => {
    const e = exception.FILE_CANNOT_WRITE(null);
    expect(e.code).toBe("FILE_CANNOT_WRITE");
  });

  test("with browser.i18n mock uses getMessage", () => {
    const getMessage = jest.fn((key) => "i18n:" + key);
    globalThis.browser = { i18n: { getMessage } };
    try {
      const e = exception.FILE_NOT_FOUND("f.txt");
      expect(e.message).toContain("i18n:error_fileNotFound");
      expect(getMessage).toHaveBeenCalledWith("error_fileNotFound");
    } finally {
      delete globalThis.browser;
    }
  });

  test("all exception methods use i18n when browser.i18n present", () => {
    const getMsg = (key) => "msg:" + key;
    globalThis.browser = { i18n: { getMessage: getMsg } };
    if (typeof global !== "undefined") global.browser = globalThis.browser;
    try {
      expect(exception.FILE_NOT_FOUND("f").message).toContain("msg:");
      expect(exception.FILE_CANNOT_WRITE("f").message).toContain("msg:");
      expect(exception.FILES_NOT_SPECIFIED().message).toContain("msg:");
      expect(exception.READ_ONLY_MODE().message).toContain("msg:");
      expect(exception.FILE_LOCKED("f").message).toContain("msg:");
      expect(exception.FILE_NETWORK_OR_REMOTE().message).toContain("msg:");
      expect(exception.ITEM_NOT_FOUND().message).toContain("msg:");
      expect(exception.EVENT_ENCOUNTERED().message).toContain("msg:");
      expect(exception.UNKNOWN().message).toContain("msg:");
    } finally {
      delete globalThis.browser;
      if (typeof global !== "undefined") delete global.browser;
    }
  });
});
