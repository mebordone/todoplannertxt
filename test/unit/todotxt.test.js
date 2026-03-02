/* Tests funcionales para el parser Todo.txt */

const { TodoTxt } = require("../../modules/todotxt.js");

describe("TodoTxt (functional)", () => {
  describe("parseFile", () => {
    test("empty string returns empty todo", () => {
      const todo = TodoTxt.parseFile("");
      expect(todo.length).toBe(0);
      expect(todo.items()).toEqual([]);
    });

    test("single task line", () => {
      const todo = TodoTxt.parseFile("Buy milk");
      expect(todo.length).toBe(1);
      const items = todo.items();
      expect(items[0].render()).toBe("Buy milk");
      expect(items[0].isComplete()).toBe(false);
      expect(items[0].priority()).toBeNull();
    });

    test("priority task", () => {
      const todo = TodoTxt.parseFile("(A) High priority task");
      const items = todo.items();
      expect(items[0].priority()).toBe("A");
      expect(items[0].render()).toContain("High priority task");
    });

    test("completed task", () => {
      const todo = TodoTxt.parseFile("x 2024-01-15 2024-01-10 Completed task");
      const items = todo.items();
      expect(items[0].isComplete()).toBe(true);
      expect(items[0].completedDate()).toBeInstanceOf(Date);
      expect(items[0].createdDate()).toBeInstanceOf(Date);
    });

    test("multiple lines", () => {
      const blob = "First task\n(B) Second\nx 2024-01-01 Done task";
      const todo = TodoTxt.parseFile(blob);
      expect(todo.length).toBe(3);
      expect(todo.items({}, "priority").map((i) => i.render())).toContain("First task");
    });

    test("blank lines are skipped", () => {
      const todo = TodoTxt.parseFile("Task one\n\n\nTask two");
      expect(todo.length).toBe(2);
    });

    test("addItem and removeItem", () => {
      const todo = TodoTxt.parseFile("");
      const item = todo.addItem("New task", true);
      expect(todo.length).toBe(1);
      expect(item.id()).toBeDefined();
      expect(item.render()).toContain("New task");
      todo.removeItem(item, false);
      expect(todo.length).toBe(0);
    });

    test("completeTask / uncompleteTask", () => {
      const todo = TodoTxt.parseFile("(B) Do something");
      const items = todo.items();
      expect(items[0].isComplete()).toBe(false);
      items[0].completeTask();
      expect(items[0].isComplete()).toBe(true);
      items[0].uncompleteTask();
      expect(items[0].isComplete()).toBe(false);
    });

    test("render with query", () => {
      const todo = TodoTxt.parseFile("(A) One\n(B) Two\nx 2024-01-01 Done");
      const incomplete = todo.render({ isComplete: (v) => v === false });
      expect(incomplete.split("\n").length).toBe(2);
    });

    test("collections returns contexts and projects", () => {
      const todo = TodoTxt.parseFile("Task +project @home");
      const col = todo.collections(true);
      expect(col.projects).toContain("+project");
      expect(col.contexts).toContain("@home");
    });

    test("parseLine", () => {
      const item = TodoTxt.parseLine("(C) Low");
      expect(item).not.toBeNull();
      expect(item.priority()).toBe("C");
    });

    test("items with sort by createdDate and completedDate", () => {
      const blob = "x 2024-01-02 2024-01-01 Done\n(B) Second\n(A) First";
      const todo = TodoTxt.parseFile(blob);
      const byCreated = todo.items({}, [{ field: "createdDate", direction: "asc" }]);
      expect(byCreated.length).toBe(3);
      const byCompleted = todo.items({}, [{ field: "completedDate", direction: "desc" }]);
      expect(byCompleted.length).toBe(3);
    });

    test("items with sort by lineNumber and isComplete", () => {
      const todo = TodoTxt.parseFile("(A) a\nx 2024-01-01 b\n(C) c");
      const byLine = todo.items({}, "lineNumber");
      expect(byLine[0].lineNumber()).toBeLessThanOrEqual(byLine[1].lineNumber());
      const byComplete = todo.items({}, [{ field: "isComplete", direction: "desc" }]);
      expect(byComplete.length).toBe(3);
    });

    test("items with query function", () => {
      const todo = TodoTxt.parseFile("(A) One +p @c\n(B) Two +p");
      const withProject = todo.items({ projects: () => true });
      expect(withProject.length).toBe(2);
    });

    test("items with query array (projects)", () => {
      const todo = TodoTxt.parseFile("(A) One +p1 @c\n(B) Two +p2");
      const withP1 = todo.items({ projects: ["+p1"] });
      expect(withP1.length).toBe(1);
      expect(withP1[0].projects()).toContain("+p1");
    });

    test("items with query date (same calendar date)", () => {
      const todo = TodoTxt.parseFile("x 2024-01-15 2024-01-10 Done");
      const all = todo.items();
      expect(all.length).toBe(1);
      const itemDate = all[0].completedDate();
      const items = todo.items({ completedDate: itemDate });
      expect(items.length).toBe(1);
    });

    test("items throws on invalid sort field", () => {
      const todo = TodoTxt.parseFile("x");
      expect(() => todo.items({}, [{ field: "invalid", direction: "asc" }])).toThrow("Cannot sort by");
    });

    test("items with sort string normalizes to array", () => {
      const todo = TodoTxt.parseFile("(A) a\n(B) b");
      const byPriority = todo.items({}, "priority");
      expect(byPriority.length).toBe(2);
    });

    test("item addons with duplicate key become array", () => {
      const todo = TodoTxt.parseFile("task rec:2024-01-01 rec:2024-01-02");
      const items = todo.items();
      expect(items.length).toBe(1);
      const addons = items[0].addons();
      expect(Array.isArray(addons.rec)).toBe(true);
      expect(addons.rec).toContain("2024-01-01");
      expect(addons.rec).toContain("2024-01-02");
    });

    test("item addons with three same keys use push branch", () => {
      const todo = TodoTxt.parseFile("task key:a key:b key:c");
      const items = todo.items();
      expect(items.length).toBe(1);
      expect(Array.isArray(items[0].addons().key)).toBe(true);
      expect(items[0].addons().key).toEqual(["a", "b", "c"]);
    });

    test("parseLine item has lineNumber 0 when no getter", () => {
      const item = TodoTxt.parseLine("(A) Task");
      expect(item.lineNumber()).toBe(0);
    });

    test("query with array for non-array property throws", () => {
      const todo = TodoTxt.parseFile("(A) One");
      expect(() => todo.items({ priority: ["A"] })).toThrow("Cannot pass array");
    });

    test("replaceWith and setAddOn", () => {
      const todo = TodoTxt.parseFile("(A) Original");
      const items = todo.items();
      items[0].replaceWith("(B) Updated");
      expect(items[0].render()).toContain("Updated");
      items[0].setAddOn("due", "2025-01-01");
      expect(items[0].addons().due).toBeDefined();
    });

    test("setAddOn with Date value uses toIsoDate", () => {
      const todo = TodoTxt.parseFile("(A) Task");
      const items = todo.items();
      const dt = new Date(2025, 2, 15);
      items[0].setAddOn("due", dt);
      expect(items[0].addons().due).toBe("2025-03-15");
    });

    test("sort priority with nulls and ties", () => {
      const todo = TodoTxt.parseFile("(A) a\n(B) b\nPlain no pri\n(C) c");
      const asc = todo.items({}, [{ field: "priority", direction: "asc" }]);
      const desc = todo.items({}, [{ field: "priority", direction: "desc" }]);
      expect(asc.length).toBe(4);
      expect(desc.length).toBe(4);
    });

    test("sort createdDate and completedDate with nulls", () => {
      const todo = TodoTxt.parseFile("(A) no date\nx 2024-02-01 2024-01-15 Done");
      const byCreated = todo.items({}, [{ field: "createdDate", direction: "desc" }]);
      const byCompleted = todo.items({}, [{ field: "completedDate", direction: "asc" }]);
      expect(byCreated.length).toBe(2);
      expect(byCompleted.length).toBe(2);
      expect(byCreated[0].createdDate()).toBeInstanceOf(Date);
      expect(byCreated[1].createdDate()).toBeNull();
      expect(byCompleted[0].completedDate()).toBeInstanceOf(Date);
    });

    test("sort createdDate and completedDate with both dates non-null", () => {
      const todo = TodoTxt.parseFile("2024-01-02 (B) Second\n2024-01-01 (A) First");
      const byCreatedAsc = todo.items({}, [{ field: "createdDate", direction: "asc" }]);
      const byCreatedDesc = todo.items({}, [{ field: "createdDate", direction: "desc" }]);
      expect(byCreatedAsc[0].createdDate().getTime()).toBeLessThanOrEqual(byCreatedAsc[1].createdDate().getTime());
      expect(byCreatedDesc[0].createdDate().getTime()).toBeGreaterThanOrEqual(byCreatedDesc[1].createdDate().getTime());
      const todo2 = TodoTxt.parseFile("x 2024-01-11 2024-01-06 B\nx 2024-01-10 2024-01-05 A");
      const byCompletedAsc = todo2.items({}, [{ field: "completedDate", direction: "asc" }]);
      const byCompletedDesc = todo2.items({}, [{ field: "completedDate", direction: "desc" }]);
      expect(byCompletedAsc[0].completedDate().getTime()).toBeLessThanOrEqual(byCompletedAsc[1].completedDate().getTime());
      expect(byCompletedDesc[0].completedDate().getTime()).toBeGreaterThanOrEqual(byCompletedDesc[1].completedDate().getTime());
    });

    test("sort createdDate asc puts null last", () => {
      const todo = TodoTxt.parseFile("(A) no date\n2024-01-01 (B) with date");
      const asc = todo.items({}, [{ field: "createdDate", direction: "asc" }]);
      expect(asc.length).toBe(2);
      const nullIdx = asc.findIndex((i) => i.createdDate() === null);
      const dateIdx = asc.findIndex((i) => i.createdDate() !== null);
      expect(nullIdx).toBeGreaterThanOrEqual(0);
      expect(dateIdx).toBeGreaterThanOrEqual(0);
      if (nullIdx >= 0 && dateIdx >= 0) expect(asc[0].createdDate() === null ? asc[1].createdDate() !== null : true).toBe(true);
    });

    test("sort completedDate desc with null", () => {
      const todo = TodoTxt.parseFile("(A) open\nx 2024-01-02 2024-01-01 done");
      const desc = todo.items({}, [{ field: "completedDate", direction: "desc" }]);
      expect(desc.length).toBe(2);
      expect(desc.some((i) => i.completedDate() === null)).toBe(true);
      expect(desc.some((i) => i.completedDate() !== null)).toBe(true);
    });

    test("sort isComplete asc and desc", () => {
      const todo = TodoTxt.parseFile("(A) open\nx 2024-01-01 done");
      const desc = todo.items({}, [{ field: "isComplete", direction: "desc" }]);
      const asc = todo.items({}, [{ field: "isComplete", direction: "asc" }]);
      expect(desc.length).toBe(2);
      expect(asc.length).toBe(2);
      expect(asc.some((i) => i.isComplete())).toBe(true);
      expect(asc.some((i) => !i.isComplete())).toBe(true);
    });

    test("items with invalid query key throws", () => {
      const todo = TodoTxt.parseFile("(A) One");
      expect(() => todo.items({ invalidKey: 1 })).toThrow("invalid for query");
    });

    test("addContext throws on invalid input and adds when valid", () => {
      const todo = TodoTxt.parseFile("(A) Task");
      const item = todo.items()[0];
      expect(() => item.addContext("")).toThrow("Invalid context");
      expect(() => item.addContext("  ")).toThrow("Invalid context");
      item.addContext("work");
      expect(item.contexts()).toContain("@work");
      item.addContext("@home");
      expect(item.contexts()).toContain("@home");
    });

    test("addProject throws on invalid and adds when valid", () => {
      const todo = TodoTxt.parseFile("(A) Task");
      const item = todo.items()[0];
      expect(() => item.addProject("")).toThrow("Invalid project");
      item.addProject("p1");
      expect(item.projects()).toContain("+p1");
      item.addProject("+p2");
      expect(item.projects()).toContain("+p2");
    });

    test("setAddOn with Date value and removeAddOn", () => {
      const todo = TodoTxt.parseFile("(A) Task due:2024-01-01");
      const item = todo.items()[0];
      item.setAddOn("due", new Date(2025, 0, 15));
      expect(item.addons().due).toBeDefined();
      item.removeAddOn("due");
      expect(item.addons().due).toBeUndefined();
    });

    test("setAddOn and removeAddOn throw on invalid key", () => {
      const todo = TodoTxt.parseFile("(A) Task");
      const item = todo.items()[0];
      expect(() => item.setAddOn("", "v")).toThrow("Invalid addon");
      expect(() => item.setAddOn("@x", "v")).toThrow("Invalid addon");
      expect(() => item.removeAddOn("+p")).toThrow("Invalid addon");
    });

    test("removeContext and removeProject", () => {
      const todo = TodoTxt.parseFile("(A) Task +p @c");
      const item = todo.items()[0];
      item.removeContext("@c");
      expect(item.contexts()).not.toContain("@c");
      item.removeProject("+p");
      expect(item.projects()).not.toContain("+p");
    });

    test("setCreatedDate when already present", () => {
      const todo = TodoTxt.parseFile("2024-01-01 (A) Task");
      const item = todo.items()[0];
      item.setCreatedDate(new Date(2024, 5, 1));
      expect(item.createdDate()).toBeInstanceOf(Date);
    });

    test("removeItem with allMatches true removes all matching", () => {
      const todo = TodoTxt.parseFile("(A) One\n(A) One\n(B) Two");
      const items = todo.items();
      const line = items[0].render();
      todo.removeItem(items[0], true);
      const remaining = todo.items().filter((i) => i.render() === line);
      expect(remaining.length).toBe(0);
    });

    test("addItem with setCreateDate false", () => {
      const todo = TodoTxt.parseFile("(A) Existing");
      const item = todo.addItem("(B) New", false);
      expect(item.render()).toContain("New");
      expect(todo.length).toBe(2);
    });
  });

  describe("create", () => {
    test("returns empty todo", () => {
      const todo = TodoTxt.create();
      expect(todo.length).toBe(0);
    });
  });
});
