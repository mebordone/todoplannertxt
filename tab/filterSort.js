/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * Pure functions for filtering, searching, sorting and grouping tab task lists.
 * Used by the full tab page; item shape: { id, title, priority, dueDate, categories, location, isCompleted, entryDate, completedDate }.
 */

const DEFAULT_PREFS = {
  sortBy: "entryDate",
  sortDir: "asc",
  groupBy: "project",
  filterProject: "",
  filterContext: "",
  filterPriority: "",
  filterDue: "",
  filterCompleted: "open"
};

function normalizeLocation(loc) {
  if (loc == null) return [];
  if (Array.isArray(loc)) return loc.map(String).filter(Boolean);
  return [String(loc)].filter(Boolean);
}

function itemSearchText(item) {
  const parts = [item.title || "", (item.categories || []).join(" "), normalizeLocation(item.location).join(" ")];
  return parts.join(" ").toLowerCase();
}

function applySearch(items, query) {
  if (!Array.isArray(items)) return [];
  const q = (query && String(query).trim()) || "";
  if (!q) return items.slice();
  const lower = q.toLowerCase();
  return items.filter((item) => itemSearchText(item).includes(lower));
}

function getTodayLocal() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function isBacklogDue(due, today) {
  return !due || due < today;
}

function matchesFilterDue(item, filterDue) {
  if (!filterDue) return true;
  const due = item.dueDate ? String(item.dueDate).slice(0, 10) : null;
  const today = getTodayLocal();
  if (filterDue === "backlog") return isBacklogDue(due, today);
  if (filterDue === "none") return !due;
  if (!due) return false;
  if (filterDue === "today") return due === today;
  if (filterDue === "overdue") return due < today;
  if (filterDue === "week") {
    const end = new Date();
    end.setDate(end.getDate() + 7);
    const y2 = end.getFullYear();
    const m2 = String(end.getMonth() + 1).padStart(2, "0");
    const d2 = String(end.getDate()).padStart(2, "0");
    const weekEnd = `${y2}-${m2}-${d2}`;
    return due >= today && due <= weekEnd;
  }
  return true;
}

function matchesFilterProject(item, project) {
  if (!project) return true;
  return item.categories && item.categories.includes(project);
}

function matchesFilterContext(item, context) {
  if (!context) return true;
  return normalizeLocation(item.location).indexOf(context) !== -1;
}

function matchesFilterPriority(item, priority) {
  if (priority === "" || priority == null) return true;
  return item.priority === priority;
}

function matchesFilterCompleted(item, completed) {
  if (completed === "all") return true;
  if (completed === "open") return !item.isCompleted;
  if (completed === "done") return !!item.isCompleted;
  return true;
}

function applyFilters(items, filters) {
  if (!Array.isArray(items)) return [];
  const f = filters || {};
  return items.filter((item) => {
    if (!matchesFilterProject(item, f.filterProject)) return false;
    if (!matchesFilterContext(item, f.filterContext)) return false;
    if (!matchesFilterPriority(item, f.filterPriority)) return false;
    if (!matchesFilterCompleted(item, f.filterCompleted)) return false;
    if (!matchesFilterDue(item, f.filterDue)) return false;
    return true;
  });
}

function compareValues(a, b, dir) {
  const mult = dir === "desc" ? -1 : 1;
  if (a == null && b == null) return 0;
  if (a == null) return mult;
  if (b == null) return -mult;
  if (a < b) return -1 * mult;
  if (a > b) return 1 * mult;
  return 0;
}

function sortValueTitle(item) {
  return (item.title || "").toLowerCase();
}
function sortValueDate(item, key) {
  const v = item[key];
  return v ? String(v).slice(0, 10) : null;
}
function sortValuePriority(item) {
  return item.priority != null ? Number(item.priority) : 0;
}

const SORT_VALUE_FN = {
  title: (item) => sortValueTitle(item),
  dueDate: (item) => sortValueDate(item, "dueDate"),
  entryDate: (item) => sortValueDate(item, "entryDate"),
  completedDate: (item) => sortValueDate(item, "completedDate"),
  priority: sortValuePriority
};

function getSortValue(item, sortBy) {
  const fn = SORT_VALUE_FN[sortBy] || sortValuePriority;
  return fn(item);
}

function applySort(items, sortBy, sortDir) {
  if (!Array.isArray(items)) return [];
  const out = items.slice();
  const dir = sortDir === "desc" ? "desc" : "asc";
  out.sort((a, b) => {
    const va = getSortValue(a, sortBy);
    const vb = getSortValue(b, sortBy);
    return compareValues(va, vb, dir);
  });
  return out;
}

function groupKeyProject(item) {
  return (item.categories && item.categories[0]) || "";
}
function groupKeyContext(item) {
  return normalizeLocation(item.location)[0] || "";
}
function groupKeyPriority(item) {
  return item.priority != null ? String(item.priority) : "";
}
function groupKeyCompletion(item) {
  return item.isCompleted ? "done" : "open";
}

function groupKeyDueDay(item) {
  if (!item.dueDate) return "";
  return String(item.dueDate).slice(0, 10);
}

const GROUP_KEY_FN = {
  project: groupKeyProject,
  context: groupKeyContext,
  priority: groupKeyPriority,
  completion: groupKeyCompletion,
  dueDay: groupKeyDueDay
};

function groupKeyFor(item, groupBy) {
  if (!groupBy) return "";
  const fn = GROUP_KEY_FN[groupBy];
  return fn ? fn(item) : "";
}

function applyGroup(items, groupBy) {
  if (!Array.isArray(items)) return [];
  const g = groupBy || "";
  if (!g) return [{ groupKey: "", items }];
  const map = new Map();
  for (const item of items) {
    const key = groupKeyFor(item, g);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(item);
  }
  const keys = Array.from(map.keys()).sort((a, b) => String(a).localeCompare(String(b)));
  return keys.map((groupKey) => ({ groupKey, items: map.get(groupKey) }));
}

const filterSort = {
  DEFAULT_PREFS,
  applySearch,
  applyFilters,
  applySort,
  applyGroup,
  normalizeLocation,
  itemSearchText,
  matchesFilterDue,
  groupKeyFor
};

if (typeof globalThis !== "undefined") globalThis.filterSort = filterSort;
if (typeof window !== "undefined") window.filterSort = filterSort;
if (typeof module !== "undefined" && module.exports) {
  module.exports = filterSort;
}
