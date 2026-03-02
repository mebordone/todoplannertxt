/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const SORT_ASC = "asc";
const SORT_DESC = "desc";
const reTrim = /^\s+|\s+$/g;
const reSplitSpaces = /\s+/;
const reFourDigits = /^\d{4}$/;
const reTwoDigits = /^\d{2}$/;
const rePriority = /^\([A-Z]\)$/;
const reBlankLine = /^\s*$/;
const reAddOn = /[^\:]+\:[^\:\/\/]/;

function isArray(arg) {
  /* istanbul ignore next: fallback for environments without Array.isArray */
  return Array.isArray ? Array.isArray(arg) : Object.prototype.toString.call(arg) === "[object Array]";
}

function isDate(value) {
  return value instanceof Date && !isNaN(value.getTime());
}

function isSameCalendarDate(dt1, dt2) {
  return dt1.getFullYear() === dt2.getFullYear() &&
    dt1.getMonth() === dt2.getMonth() &&
    dt1.getDate() === dt2.getDate();
}

function stripTime(dt) {
  return new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
}

function keys(obj, typeName) {
  const arr = [];
  for (const k in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, k)) {
      if (!typeName || typeof obj[k] === typeName) arr.push(k);
    }
  }
  return arr;
}

function toIsoDate(dt) {
  if (!isDate(dt)) dt = new Date();
  const zeropad = (num, len) => {
    let output = num.toString();
    while (output.length < len) output = "0" + output;
    return output;
  };
  return dt.getFullYear() + "-" + zeropad(dt.getMonth() + 1, 2) + "-" + zeropad(dt.getDate(), 2);
}

function tokenToDate(token) {
  const bits = token.split("-");
  if (bits.length !== 3) return null;
  const [year, month, day] = bits;
  if (!reFourDigits.test(year) || !reTwoDigits.test(month) || !reTwoDigits.test(day)) return null;
  const dtStr = bits.join("/");
  const dt = new Date(dtStr);
  if (dt.toString() === "Invalid Date") return null;
  const y = parseInt(year, 10), m = parseInt(month, 10), d = parseInt(day, 10);
  if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) return null;
  return dt;
}

function parseLineInternal(line, lineNumberGetter) {
  let tokens;
  const readLine = (text) => {
    line = text.replace(reTrim, "");
    tokens = [];
    if (line !== "") tokens = line.split(reSplitSpaces);
  };

  if (!line || reBlankLine.test(line)) return null;
  readLine(line);

  const id = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });

  const output = {};
  output.render = () => tokens.join(" ");
  output.replaceWith = (text) => {
    if (!text || reBlankLine.test(text)) throw new Error("Cannot replace a line with nothing.");
    readLine(text);
  };
  output.id = () => id;
  output.isComplete = () => tokens.length > 0 && tokens[0] === "x";
  output.completedDate = () => {
    if (!output.isComplete()) return null;
    if (tokens.length < 2) return null;
    return tokenToDate(tokens[1]);
  };
  output.priority = () => {
    let pos = 0;
    if (output.isComplete()) pos++;
    if (output.completedDate()) pos++;
    if (tokens.length <= pos) return null;
    const token = tokens[pos];
    if (!rePriority.test(token)) return null;
    return token[1];
  };
  output.createdDate = () => {
    let pos = 0;
    if (output.isComplete()) pos++;
    if (output.completedDate()) pos++;
    if (output.priority()) pos++;
    if (tokens.length <= pos) return null;
    return tokenToDate(tokens[pos]);
  };
  output.contexts = () => {
    const seen = {};
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      if (token.length >= 2 && token[0] === "@") seen[token] = true;
    }
    return keys(seen, "boolean");
  };
  output.projects = () => {
    const seen = {};
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      if (token.length >= 2 && token[0] === "+") seen[token] = true;
    }
    return keys(seen, "boolean");
  };
  output.addons = () => {
    const addons = {};
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      if (!reAddOn.test(token)) continue;
      const bits = token.split(":");
      const key = bits[0];
      const val = bits.slice(1).join(":");
      if (!addons[key]) addons[key] = val;
      else if (!isArray(addons[key])) addons[key] = [addons[key], val];
      else addons[key].push(val);
    }
    return addons;
  };
  output.textTokens = () => {
    const arr = [];
    let startPos = 0;
    if (output.isComplete()) startPos++;
    if (output.completedDate()) startPos++;
    if (output.priority()) startPos++;
    if (output.createdDate()) startPos++;
    for (let i = startPos; i < tokens.length; i++) {
      const token = tokens[i];
      if ((token[0] === "@" || token[0] === "+" || reAddOn.test(token))) continue;
      arr.push(token);
    }
    return arr;
  };
  output.lineNumber = () => (typeof lineNumberGetter === "function" ? lineNumberGetter(output) : 0);

  output.completeTask = () => {
    if (output.isComplete()) return;
    tokens.splice(0, 0, "x", toIsoDate(new Date()));
  };

  output.uncompleteTask = () => {
    if (!output.isComplete()) return;
    let numToDelete = 1;
    if (isDate(output.completedDate())) numToDelete++;
    tokens.splice(0, numToDelete);
  };

  output.setCreatedDate = (dt) => {
    if (!isDate(dt)) dt = new Date();
    dt = stripTime(dt);
    let targetIndex = 0;
    if (output.priority()) targetIndex++;
    if (output.completedDate()) targetIndex++;
    if (output.isComplete()) targetIndex++;
    const shouldInsert = output.createdDate() === null;
    if (!shouldInsert) tokens.splice(targetIndex, 1);
    tokens.splice(targetIndex, 0, toIsoDate(dt));
  };

  output.addContext = (ctxt) => {
    if (typeof ctxt !== "string" || /^\s*$/.test(ctxt)) throw new Error("Invalid context: " + ctxt);
    if (ctxt[0] !== "@") ctxt = "@" + ctxt;
    const ctxts = output.contexts();
    if (ctxts.indexOf(ctxt) >= 0) return;
    tokens.push(ctxt);
  };

  output.addProject = (prj) => {
    if (typeof prj !== "string" || /^\s*$/.test(prj)) throw new Error("Invalid project: " + prj);
    if (prj[0] !== "+") prj = "+" + prj;
    const projects = output.projects();
    if (projects.indexOf(prj) >= 0) return;
    tokens.push(prj);
  };

  const getMatchingIndices = (arr, test) => {
    const fn = typeof test === "function" ? test : (t) => t === test;
    const matches = [];
    for (let i = 0; i < arr.length; i++) if (fn(arr[i])) matches.push(i);
    return matches;
  };

  const removeTokens = (test) => {
    const indices = getMatchingIndices(tokens, test).reverse();
    for (let i = 0; i < indices.length; i++) tokens.splice(indices[i], 1);
  };

  output.removeContext = (ctxt) => {
    if (typeof ctxt !== "string" || /^\s*$/.test(ctxt)) throw new Error("Invalid context: " + ctxt);
    if (ctxt[0] !== "@") ctxt = "@" + ctxt;
    removeTokens(ctxt);
  };

  output.removeProject = (prj) => {
    if (typeof prj !== "string" || /^\s*$/.test(prj)) throw new Error("Invalid project: " + prj);
    if (prj[0] !== "+") prj = "+" + prj;
    removeTokens(prj);
  };

  output.setAddOn = (key, value) => {
    if (typeof key !== "string" || /^\s*$/.test(key) || ["@", "+"].indexOf(key[0]) > -1)
      throw new Error("Invalid addon name: " + key);
    if (isDate(value)) value = toIsoDate(value);
    else value = String(value);
    const indicesToRemove = getMatchingIndices(tokens, (t) => t.substr(0, key.length + 1) === key + ":");
    indicesToRemove.reverse().forEach((i) => tokens.splice(i, 1));
    const targetIndex = indicesToRemove[0];
    const addon = key + ":" + value;
    if (targetIndex !== undefined) tokens.splice(targetIndex, 0, addon);
    else tokens.push(addon);
  };

  output.removeAddOn = (key) => {
    if (typeof key !== "string" || /^\s*$/.test(key) || ["@", "+"].indexOf(key[0]) > -1)
      throw new Error("Invalid addon name: " + key);
    removeTokens((t) => t.substr(0, key.length + 1) === key + ":");
  };

  return output;
}

const sortComparators = {
  isComplete(a, b, desc) {
    const aVal = a.isComplete(), bVal = b.isComplete();
    if (aVal === bVal) return 0;
    return desc ? (aVal ? 1 : -1) : (aVal ? -1 : 1);
  },
  createdDate(a, b, desc) {
    const aVal = a.createdDate(), bVal = b.createdDate();
    /* istanbul ignore if: null handling in sort, covered by sort integration tests */
    if (aVal === null) return 1;
    /* istanbul ignore if: null handling in sort */
    if (bVal === null) return -1;
    const t = aVal.getTime() - bVal.getTime();
    return desc ? -t : t;
  },
  completedDate(a, b, desc) {
    const aVal = a.completedDate(), bVal = b.completedDate();
    /* istanbul ignore if: null handling in sort */
    if (aVal === null) return 1;
    /* istanbul ignore if: null handling in sort */
    if (bVal === null) return -1;
    const t = aVal.getTime() - bVal.getTime();
    return desc ? -t : t;
  },
  priority(a, b, desc) {
    const aVal = a.priority(), bVal = b.priority();
    if (aVal === null) return desc ? -1 : 1;
    if (bVal === null) return desc ? 1 : -1;
    const t = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
    return desc ? -t : t;
  },
  lineNumber(a, b, desc) {
    const la = a.lineNumber(), lb = b.lineNumber();
    if (la === lb) return 0;
    return desc ? (la < lb ? 1 : -1) : (la < lb ? -1 : 1);
  }
};

function compareSortField(a, b, s) {
  const cmp = sortComparators[s.field];
  if (!cmp) return 0;
  return cmp(a, b, s.direction === SORT_DESC);
}

function matchOneQueryProp(queryProp, itemProp) {
  if (typeof queryProp === "function") return queryProp(itemProp);
  if (isArray(queryProp)) {
    if (!isArray(itemProp)) throw new Error("Cannot pass array for non-array property");
    return queryProp.every((v) => itemProp.indexOf(v) >= 0);
  }
  if (isDate(queryProp) && isDate(itemProp)) return isSameCalendarDate(queryProp, itemProp);
  return queryProp === itemProp;
}

function isItemInQuery(item, query) {
  for (const k in query) {
    if (!Object.prototype.hasOwnProperty.call(query, k)) continue;
    if (typeof item[k] !== "function") throw new Error("This property is invalid for query: " + k);
    if (!matchOneQueryProp(query[k], item[k]())) return false;
  }
  return true;
}

function parseFile(blob) {
  const lines = (blob || "").split("\n");
  const items = [];
  const getLineNumber = (task) => {
    for (let j = 0; j < items.length; j++) if (items[j].id() === task.id()) return j + 1;
    /* istanbul ignore next: defensive, task always in items in parseFile flow */
    return 0;
  };
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (reBlankLine.test(line)) continue;
    items.push(parseLineInternal(line, getLineNumber));
  }

  const output = {};
  output.render = (query, sortFields) => {
    const itemsToRender = output.items(query, sortFields);
    return itemsToRender.map((it) => it.render()).join("\n");
  };
  output.items = (query, sortFields) => {
    const q = query || {};
    let result = items.filter((it) => isItemInQuery(it, q));
    if (typeof sortFields === "string") sortFields = [{ field: sortFields, direction: SORT_ASC }];
    if (!isArray(sortFields) || sortFields.length === 0) return result;
    const normalized = sortFields.map((s) => {
      const sort = typeof s === "string" ? { field: s, direction: SORT_ASC } : s;
      if (!sort.field) throw new Error("Invalid sort " + sort);
      const valid = ["priority", "createdDate", "completedDate", "isComplete", "lineNumber"];
      if (valid.indexOf(sort.field) === -1) throw new Error("Cannot sort by this field: " + sort.field);
      return { field: sort.field, direction: sort.direction !== SORT_DESC ? SORT_ASC : SORT_DESC };
    });
    result.sort((a, b) => {
      for (let i = 0; i < normalized.length; i++) {
        const r = compareSortField(a, b, normalized[i]);
        if (r !== 0) return r;
      }
      return a.lineNumber() < b.lineNumber() ? -1 : 1;
    });
    return result;
  };
  output.length = items.length;
  output.removeItem = (itemToRemove, allMatches) => {
    const str = typeof itemToRemove.render === "function" ? itemToRemove.render() : itemToRemove;
    for (let i = items.length - 1; i >= 0; i--) {
      if (items[i].render() === str) {
        items.splice(i, 1);
        if (!allMatches) break;
      }
    }
    output.length = items.length;
  };
  output.addItem = (item, setCreateDate) => {
    const line = typeof item.render === "function" ? item.render() : item;
    const newItem = parseLineInternal(line, getLineNumber);
    if (!newItem.createdDate() && setCreateDate) newItem.setCreatedDate(new Date());
    items.push(newItem);
    output.length = items.length;
    return newItem;
  };
  output.collections = (includeCompleted) => {
    const contextsObj = {}, projectsObj = {};
    for (let i = 0; i < items.length; i++) {
      if (!includeCompleted && items[i].isComplete()) continue;
      items[i].contexts().forEach((c) => (contextsObj[c] = true));
      items[i].projects().forEach((p) => (projectsObj[p] = true));
    }
    return {
      contexts: Object.keys(contextsObj).sort(),
      projects: Object.keys(projectsObj).sort()
    };
  };
  return output;
}

function create() {
  return parseFile("");
}

const TodoTxt = {
  SORT_ASC,
  SORT_DESC,
  parseFile,
  create,
  parseLine: (line) => parseLineInternal(line, () => 0)
};

if (typeof globalThis !== "undefined") globalThis.TodoTxt = TodoTxt; else if (typeof self !== "undefined") self.TodoTxt = TodoTxt;
if (typeof module !== "undefined" && module.exports) module.exports = { TodoTxt };
