/* Tests funcionales para fileUtil con FSA mockeado */

require("../../modules/todotxt.js");
require("../../modules/exception.js");
require("../../modules/md5.js");
const { fileUtil } = require("../../modules/fileUtil.js");

describe("fileUtil (functional with mocked FSA)", () => {
  const mockFsa = {
    readFile: jest.fn((folderId, fileName) =>
      Promise.resolve({ file: { text: () => Promise.resolve("(A) Task 1\n") } })
    ),
    writeFile: jest.fn(() => Promise.resolve())
  };

  const prefs = {
    todoFolderId: "f1",
    todoFileName: "todo.txt",
    doneFolderId: "f2",
    doneFileName: "done.txt"
  };

  beforeEach(() => {
    mockFsa.readFile.mockClear();
    mockFsa.writeFile.mockClear();
  });

  test("getTodoPath returns null when prefs missing", () => {
    expect(fileUtil.getTodoPath(null)).toBeNull();
    expect(fileUtil.getTodoPath({})).toBeNull();
  });

  test("getTodoPath returns folderId and fileName when no folderPath", () => {
    const p = fileUtil.getTodoPath(prefs);
    expect(p).toEqual({ folderId: "f1", fileName: "todo.txt" });
  });

  test("getTodoPath returns folderPath and fileName when folderPath set", () => {
    const prefsPath = { todoFolderPath: "/home/user", todoFileName: "todo.txt" };
    expect(fileUtil.getTodoPath(prefsPath)).toEqual({ folderPath: "/home/user", fileName: "todo.txt" });
  });

  test("getDonePath returns folderId and fileName", () => {
    const p = fileUtil.getDonePath(prefs);
    expect(p).toEqual({ folderId: "f2", fileName: "done.txt" });
  });

  test("getDonePath returns folderPath when doneFolderPath set", () => {
    expect(fileUtil.getDonePath({ doneFolderPath: "/tmp", doneFileName: "done.txt" }))
      .toEqual({ folderPath: "/tmp", fileName: "done.txt" });
  });

  test("readFile calls fsa.readFile and returns content with newline", async () => {
    const path = { folderId: "f1", fileName: "todo.txt" };
    const content = await fileUtil.readFile(mockFsa, path);
    expect(mockFsa.readFile).toHaveBeenCalledWith("f1", "todo.txt");
    expect(content.endsWith("\n")).toBe(true);
  });

  test("readFile uses result.content when no file.text", async () => {
    mockFsa.readFile.mockResolvedValue({ content: "raw content" });
    const path = { folderId: "f1", fileName: "todo.txt" };
    const content = await fileUtil.readFile(mockFsa, path);
    expect(content).toContain("raw content");
    expect(content.endsWith("\n")).toBe(true);
  });

  test("readFile uses result.file when string", async () => {
    mockFsa.readFile.mockResolvedValue({ file: "string content" });
    const path = { folderId: "f1", fileName: "todo.txt" };
    const content = await fileUtil.readFile(mockFsa, path);
    expect(content).toContain("string content");
  });

  test("readFile rejects invalid path", async () => {
    await expect(fileUtil.readFile(mockFsa, null)).rejects.toThrow("Invalid path");
    await expect(fileUtil.readFile(mockFsa, {})).rejects.toThrow("Invalid path");
    await expect(fileUtil.readFile(mockFsa, { folderId: "f1" })).rejects.toThrow("Invalid path");
  });

  test("readFile with folderPath calls fsa.readFile(folderPath, fileName)", async () => {
    mockFsa.readFile.mockResolvedValue({ file: { text: () => Promise.resolve("content\n") } });
    const path = { folderPath: "/home/user", fileName: "todo.txt" };
    const content = await fileUtil.readFile(mockFsa, path);
    expect(mockFsa.readFile).toHaveBeenCalledWith("/home/user", "todo.txt");
    expect(content).toContain("content");
  });

  test("readFile with folderPath empty string rejects", async () => {
    await expect(fileUtil.readFile(mockFsa, { folderPath: "", fileName: "x" })).rejects.toThrow("Invalid path");
  });

  test("readFile with folderId null and no folderPath rejects", async () => {
    await expect(fileUtil.readFile(mockFsa, { folderId: null, fileName: "x" })).rejects.toThrow("Invalid path");
  });

  test("writeFile with folderPath empty string rejects", async () => {
    await expect(fileUtil.writeFile(mockFsa, { folderPath: "", fileName: "x" }, "c")).rejects.toThrow("Invalid path");
  });

  test("writeFile with folderId null rejects", async () => {
    await expect(fileUtil.writeFile(mockFsa, { folderId: null, fileName: "x" }, "c")).rejects.toThrow("Invalid path");
  });

  test("readTodo with both paths calls readFile twice", async () => {
    mockFsa.readFile
      .mockResolvedValueOnce({ file: { text: () => Promise.resolve("todo\n") } })
      .mockResolvedValueOnce({ file: { text: () => Promise.resolve("done\n") } });
    const prefsBoth = { todoFolderId: "f1", todoFileName: "todo.txt", doneFolderId: "f2", doneFileName: "done.txt" };
    const content = await fileUtil.readTodo(mockFsa, prefsBoth);
    expect(mockFsa.readFile).toHaveBeenCalledTimes(2);
    expect(content).toContain("todo");
    expect(content).toContain("done");
  });

  test("writeFile with folderPath calls fsa.writeFile(blob, folderPath, fileName)", async () => {
    const path = { folderPath: "/tmp", fileName: "done.txt" };
    await fileUtil.writeFile(mockFsa, path, "text");
    expect(mockFsa.writeFile).toHaveBeenCalledWith(expect.any(Blob), "/tmp", "done.txt");
  });

  test("readTodo concatenates todo and done content", async () => {
    mockFsa.readFile
      .mockResolvedValueOnce({ file: { text: () => Promise.resolve("line1\n") } })
      .mockResolvedValueOnce({ file: { text: () => Promise.resolve("line2\n") } });
    const content = await fileUtil.readTodo(mockFsa, prefs);
    expect(content).toContain("line1");
    expect(content).toContain("line2");
  });

  test("writeTodo throws FILES_NOT_SPECIFIED when paths missing", async () => {
    await expect(fileUtil.writeTodo(mockFsa, {}, { render: () => "" })).rejects.toMatchObject({
      code: "FILES_NOT_SPECIFIED"
    });
  });

  test("calculateMD5 returns hash string", async () => {
    mockFsa.readFile.mockResolvedValue({ file: { text: () => Promise.resolve("x\n") } });
    const hash = await fileUtil.calculateMD5(mockFsa, prefs);
    expect(hash).toMatch(/^[a-f0-9]{32}$/);
  });

  test("readFile handles null or empty result from FSA", async () => {
    mockFsa.readFile.mockResolvedValue(null);
    const path = { folderId: "f1", fileName: "todo.txt" };
    const content = await fileUtil.readFile(mockFsa, path);
    expect(content).toBe("\n");
  });

  test("readFile handles result with no content (fallback empty string)", async () => {
    mockFsa.readFile.mockResolvedValue({ other: true });
    const path = { folderId: "f1", fileName: "todo.txt" };
    const content = await fileUtil.readFile(mockFsa, path);
    expect(content).toBe("\n");
  });

  test("getDonePath returns null when no done path", () => {
    expect(fileUtil.getDonePath(null)).toBeNull();
    expect(fileUtil.getDonePath({})).toBeNull();
    expect(fileUtil.getDonePath({ todoFolderId: "f1" })).toBeNull();
  });

  test("getTodoPath with only todoFileName uses default fileName when missing", () => {
    expect(fileUtil.getTodoPath({ todoFolderId: "f1" })).toEqual({ folderId: "f1", fileName: "todo.txt" });
    expect(fileUtil.getTodoPath({ todoFileName: "mytodo.txt" })).toEqual({ folderId: undefined, fileName: "mytodo.txt" });
  });

  test("_usesFolderPath true when path has folderPath", () => {
    expect(fileUtil._usesFolderPath({ folderPath: "/x", fileName: "f" })).toBe(true);
  });
  test("_usesFolderPath false when path has folderId", () => {
    expect(fileUtil._usesFolderPath({ folderId: "id", fileName: "f" })).toBe(false);
  });

  test("writeFile rejects invalid path", async () => {
    await expect(fileUtil.writeFile(mockFsa, { folderId: "f1" }, "x")).rejects.toThrow("Invalid path");
    await expect(fileUtil.writeFile(mockFsa, null, "x")).rejects.toThrow("Invalid path");
  });

  test("writeFile with Blob content passes through", async () => {
    const path = { folderId: "f1", fileName: "t.txt" };
    const blob = new Blob(["data"], { type: "text/plain" });
    await fileUtil.writeFile(mockFsa, path, blob);
    expect(mockFsa.writeFile).toHaveBeenCalledWith(blob, "f1", "t.txt");
  });

  test("readTodo when only todo path configured", async () => {
    mockFsa.readFile.mockResolvedValue({ file: { text: () => Promise.resolve("x\n") } });
    const prefs = { todoFolderId: "f1", todoFileName: "todo.txt" };
    const content = await fileUtil.readTodo(mockFsa, prefs);
    expect(content).toContain("x");
    expect(mockFsa.readFile).toHaveBeenCalledTimes(1);
  });
});
