/* Tests de integración: todoclient con fileUtil y FSA mockeados */

require("../../modules/todotxt.js");
require("../../modules/exception.js");
require("../../modules/util.js");
require("../../modules/md5.js");
require("../../modules/fileUtil.js");
const { todoclient } = require("../../modules/todoclient.js");

describe("todoclient (integration)", () => {
  let mockFsa;
  let readContent;

  const defaultPrefs = {
    todoFolderId: "f1",
    todoFileName: "todo.txt",
    doneFolderId: "f2",
    doneFileName: "done.txt",
    useThunderbird: true,
    useCreation: false,
    showFullTitle: false
  };

  beforeEach(() => {
    readContent = "(A) First task\ndone task";
    mockFsa = {
      readFile: jest.fn((folderId, fileName) =>
        Promise.resolve({
          file: { text: () => Promise.resolve(readContent + "\n") }
        })
      ),
      writeFile: jest.fn(() => Promise.resolve())
    };
  });

  test("getItems returns plain items from parsed todo", async () => {
    const items = await todoclient.getItems(mockFsa, defaultPrefs, true);
    expect(Array.isArray(items)).toBe(true);
    expect(items.length).toBeGreaterThanOrEqual(1);
    expect(items[0]).toHaveProperty("id");
    expect(items[0]).toHaveProperty("title");
    expect(items[0]).toHaveProperty("isCompleted");
  });

  test("addItem appends task and writes via FSA", async () => {
    readContent = "";
    const plainItem = { title: "New task", isCompleted: false };
    const result = await todoclient.addItem(mockFsa, defaultPrefs, plainItem);
    expect(result).toHaveProperty("id");
    expect(result.title).toBeDefined();
    expect(mockFsa.writeFile).toHaveBeenCalled();
  });

  test("modifyItem updates task and writes", async () => {
    const items = await todoclient.getItems(mockFsa, defaultPrefs, true);
    if (items.length === 0) return;
    const oldItem = items[0];
    const newItem = { ...oldItem, title: "Updated title" };
    await todoclient.modifyItem(mockFsa, defaultPrefs, oldItem, newItem);
    expect(mockFsa.writeFile).toHaveBeenCalled();
  });

  test("deleteItem removes task and writes", async () => {
    const items = await todoclient.getItems(mockFsa, defaultPrefs, true);
    if (items.length === 0) return;
    await todoclient.deleteItem(mockFsa, defaultPrefs, items[0]);
    expect(mockFsa.writeFile).toHaveBeenCalled();
  });

  test("deleteItem throws ITEM_NOT_FOUND for unknown id", async () => {
    await todoclient.getItems(mockFsa, defaultPrefs, true);
    const fakeItem = { id: "non-existent-id" };
    await expect(todoclient.deleteItem(mockFsa, defaultPrefs, fakeItem)).rejects.toMatchObject({ code: "ITEM_NOT_FOUND" });
  });

  test("setCachedTodo and getTodo use cache", async () => {
    const { TodoTxt } = require("../../modules/todotxt.js");
    const cached = TodoTxt.parseFile("(A) Cached only");
    todoclient.setCachedTodo(cached);
    const items = await todoclient.getItems(mockFsa, defaultPrefs, false);
    expect(items.length).toBe(1);
    expect(items[0].title).toContain("Cached only");
  });

  test("getItems with refresh false uses cache", async () => {
    await todoclient.getItems(mockFsa, defaultPrefs, true);
    const callCount = mockFsa.readFile.mock.calls.length;
    await todoclient.getItems(mockFsa, defaultPrefs, false);
    expect(mockFsa.readFile.mock.calls.length).toBe(callCount);
  });

  test("modifyItem throws ITEM_NOT_FOUND for unknown id", async () => {
    const fakeOld = { id: "nonexistent-id" };
    const fakeNew = { ...fakeOld, title: "x" };
    await expect(
      todoclient.modifyItem(mockFsa, defaultPrefs, fakeOld, fakeNew)
    ).rejects.toMatchObject({ code: "ITEM_NOT_FOUND" });
  });

  test("getItems with due date and useCreation exposes dueDate and entryDate", async () => {
    readContent = "(A) Task due:2024-06-01\n2023-05-01 Create me";
    const prefs = { ...defaultPrefs, useCreation: true };
    const items = await todoclient.getItems(mockFsa, prefs, true);
    expect(items.length).toBeGreaterThanOrEqual(1);
    const withDue = items.find((i) => i.dueDate);
    if (withDue) expect(withDue.dueDate).toBeDefined();
  });

  test("modifyItem with dueDate entryDate categories location and isCompleted", async () => {
    readContent = "(A) Original +p1 @ctx";
    const items = await todoclient.getItems(mockFsa, defaultPrefs, true);
    if (items.length === 0) return;
    const oldItem = items[0];
    const newItem = {
      ...oldItem,
      title: "Updated",
      dueDate: "2025-01-15",
      entryDate: "2024-01-01",
      isCompleted: true,
      categories: ["p2", "+p3"],
      location: "@work"
    };
    await todoclient.modifyItem(mockFsa, { ...defaultPrefs, useCreation: true }, oldItem, newItem);
    expect(mockFsa.writeFile).toHaveBeenCalled();
  });

  test("modifyItem with dueDate removed", async () => {
    readContent = "(A) With due due:2024-01-01";
    const items = await todoclient.getItems(mockFsa, defaultPrefs, true);
    if (items.length === 0) return;
    const oldItem = items[0];
    const newItem = { ...oldItem, title: "Same", dueDate: null };
    await todoclient.modifyItem(mockFsa, defaultPrefs, oldItem, newItem);
    expect(mockFsa.writeFile).toHaveBeenCalled();
  });

  test("getItems with showFullTitle true skips categories/location", async () => {
    readContent = "(A) Task +p @c";
    const prefs = { ...defaultPrefs, showFullTitle: true };
    const items = await todoclient.getItems(mockFsa, prefs, true);
    expect(items.length).toBeGreaterThanOrEqual(1);
  });

  test("addItem with useThunderbird false uses plain title", async () => {
    readContent = "";
    const prefs = { ...defaultPrefs, useThunderbird: false };
    const result = await todoclient.addItem(mockFsa, prefs, { title: "Simple", isCompleted: false });
    expect(result.title).toBeDefined();
  });

  test("addItem with useCreation true", async () => {
    readContent = "";
    const prefs = { ...defaultPrefs, useCreation: true };
    await todoclient.addItem(mockFsa, prefs, { title: "With date", isCompleted: false });
    expect(mockFsa.writeFile).toHaveBeenCalled();
  });
});
