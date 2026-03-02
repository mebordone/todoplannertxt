/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const todoclient = (function() {
  const TodoTxt = typeof self !== "undefined" ? self.TodoTxt : globalThis.TodoTxt;
  const fileUtil = typeof self !== "undefined" ? self.fileUtil : globalThis.fileUtil;
  const util = typeof self !== "undefined" ? self.util : globalThis.util;
  const exception = typeof self !== "undefined" ? self.exception : globalThis.exception;

  let cachedTodo = TodoTxt.parseFile("");

  function dateToStr(d) {
    return d.toISOString ? d.toISOString().slice(0, 10) : util.makeDateStr(d);
  }

  function fillDueFromAddons(item, todoItem) {
    const addons = todoItem.addons();
    if (!addons.due) return;
    const due = Array.isArray(addons.due) ? addons.due[0] : addons.due;
    try {
      const d = util.parseDate(due);
      d.setHours(0, 0, 0, 0);
      item.dueDate = dateToStr(d);
    } catch (e) {}
  }

  function fillThunderbirdFields(item, todoItem, prefs) {
    if (!prefs || !prefs.useThunderbird || prefs.showFullTitle) return;
    item.categories = todoItem.projects().map((p) => (p.charAt(0) === "+" ? p.substr(1) : p));
    item.location = util.makeStr(todoItem.contexts());
  }

  function fillDates(item, todoItem, prefs) {
    if (prefs && prefs.useCreation && todoItem.createdDate()) item.entryDate = dateToStr(todoItem.createdDate());
    if (todoItem.isComplete() && todoItem.completedDate()) item.completedDate = dateToStr(todoItem.completedDate());
  }

  function todoItemToPlain(todoItem, prefs) {
    const item = {
      id: todoItem.id(),
      title: util.makeTitle(todoItem, prefs),
      priority: todoItem.priority() ? util.calPriority(todoItem.priority()) : 0,
      dueDate: null,
      categories: [],
      location: "",
      isCompleted: todoItem.isComplete(),
      entryDate: null,
      completedDate: null
    };
    fillThunderbirdFields(item, todoItem, prefs);
    fillDueFromAddons(item, todoItem);
    fillDates(item, todoItem, prefs);
    return item;
  }

  function formatPriority(plain, prefs) {
    if (!prefs || !prefs.useThunderbird || !plain.priority || plain.priority === 0) return plain.title || "";
    const p = util.calPriority(plain.priority);
    return p ? "(" + p + ") " + (plain.title || "") : (plain.title || "");
  }

  function appendCategoriesAndLocation(line, plain, prefs) {
    if (!prefs || !prefs.useThunderbird || prefs.showFullTitle) return line;
    if (plain.categories && plain.categories.length) {
      plain.categories.forEach((c) => { line += " +" + (c.charAt(0) === "+" ? c.substr(1) : c); });
    }
    if (plain.location) {
      util.makeArray(plain.location).forEach((c) => { line += " " + (c.charAt(0) === "@" ? c : "@" + c); });
    }
    return line;
  }

  function plainToTodoLine(plain, prefs) {
    let line = formatPriority(plain, prefs);
    line = appendCategoriesAndLocation(line, plain, prefs);
    if (plain.dueDate) {
      const d = typeof plain.dueDate === "string" ? util.parseDate(plain.dueDate) : plain.dueDate;
      line += " due:" + util.makeDateStr(d instanceof Date ? d : new Date(plain.dueDate));
    }
    return line;
  }

  function setDueOnItem(todoItem, newItem) {
    if (newItem.dueDate) {
      const d = typeof newItem.dueDate === "string" ? util.parseDate(newItem.dueDate) : new Date(newItem.dueDate);
      todoItem.setAddOn("due", util.makeDateStr(d));
    } else {
      todoItem.removeAddOn("due");
    }
  }

  function setEntryDateOnItem(todoItem, newItem, prefs) {
    if (!prefs || !prefs.useCreation || !newItem.entryDate) return;
    const d = typeof newItem.entryDate === "string" ? util.parseDate(newItem.entryDate) : new Date(newItem.entryDate);
    todoItem.setCreatedDate(d);
  }

  function setCompleteOnItem(todoItem, newItem) {
    if (newItem.isCompleted) todoItem.completeTask();
    else todoItem.uncompleteTask();
  }

  function setCategoriesAndLocationOnItem(todoItem, newItem, prefs) {
    if (!prefs || prefs.showFullTitle) return;
    if (newItem.categories) newItem.categories.forEach((p) => todoItem.addProject(p.charAt(0) === "+" ? p : "+" + p));
    if (newItem.location) util.makeArray(newItem.location).forEach((c) => todoItem.addContext(c.charAt(0) === "@" ? c : "@" + c));
  }

  function applyModification(todoItem, newItem, prefs) {
    todoItem.replaceWith(plainToTodoLine(newItem, prefs));
    setDueOnItem(todoItem, newItem);
    setEntryDateOnItem(todoItem, newItem, prefs);
    setCompleteOnItem(todoItem, newItem);
    setCategoriesAndLocationOnItem(todoItem, newItem, prefs);
  }

  return {
    async getTodo(fsaApi, prefs, refresh) {
      if (refresh) {
        const content = await fileUtil.readTodo(fsaApi, prefs);
        cachedTodo = TodoTxt.parseFile(content);
      }
      return cachedTodo;
    },

    setCachedTodo(todo) {
      cachedTodo = todo;
    },

    async getItems(fsaApi, prefs, refresh) {
      const todo = await this.getTodo(fsaApi, prefs, refresh);
      const items = todo.items({}, "priority");
      return items.map((todoItem) => todoItemToPlain(todoItem, prefs));
    },

    async addItem(fsaApi, prefs, plainItem) {
      const todo = await this.getTodo(fsaApi, prefs, false);
      const line = plainToTodoLine(plainItem, prefs);
      const todoItem = todo.addItem(line, prefs && prefs.useCreation);
      plainItem.id = todoItem.id();
      plainItem.title = util.makeTitle(todoItem, prefs);
      await fileUtil.writeTodo(fsaApi, prefs, todo);
      cachedTodo = todo;
      return todoItemToPlain(todoItem, prefs);
    },

    async modifyItem(fsaApi, prefs, oldItem, newItem) {
      const todo = await this.getTodo(fsaApi, prefs, false);
      const todoItems = todo.items({}, "priority");
      for (let i = 0; i < todoItems.length; i++) {
        const todoItem = todoItems[i];
        if (todoItem.id() === oldItem.id) {
          applyModification(todoItem, newItem, prefs);
          await fileUtil.writeTodo(fsaApi, prefs, todo);
          cachedTodo = todo;
          return todoItemToPlain(todoItem, prefs);
        }
      }
      throw exception.ITEM_NOT_FOUND();
    },

    async deleteItem(fsaApi, prefs, item) {
      const todo = await this.getTodo(fsaApi, prefs, false);
      const todoItems = todo.items({}, "priority");
      for (let i = 0; i < todoItems.length; i++) {
        if (todoItems[i].id() === item.id) {
          todo.removeItem(todoItems[i], false);
          await fileUtil.writeTodo(fsaApi, prefs, todo);
          cachedTodo = todo;
          return;
        }
      }
      throw exception.ITEM_NOT_FOUND();
    }
  };
})();

const g = typeof globalThis !== "undefined" ? globalThis : typeof self !== "undefined" ? self : {};
g.todoclient = todoclient;
if (typeof module !== "undefined" && module.exports) module.exports = { todoclient };
