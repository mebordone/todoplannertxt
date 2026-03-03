/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const api = typeof browser !== "undefined" ? browser : chrome;
const fs = typeof filterSort !== "undefined" ? filterSort : null;

const TAB_PREFS_KEY = "tabViewPrefs";
const SAVE_DEBOUNCE_MS = 300;
let savePrefsTimer = null;
let fullItems = [];

function i18n(id) {
  try {
    return api.i18n.getMessage(id) || id;
  } catch (_) {
    return id;
  }
}

function showError(msg) {
  const el = document.getElementById("error");
  if (el) {
    el.textContent = msg || "";
    el.style.display = msg ? "block" : "none";
  }
}

function getElValue(id) {
  const el = document.getElementById(id);
  return (el && el.value) ? el.value : "";
}

function getFilterPriorityFromUI() {
  const priority = document.getElementById("filter-priority");
  if (!priority || priority.value === "") return "";
  const n = Number(priority.value);
  return Number.isNaN(n) ? "" : n;
}

function getPrefsFromUI() {
  return {
    sortBy: getElValue("sort-by") || "priority",
    sortDir: getElValue("sort-dir") || "asc",
    groupBy: getElValue("group-by") || "",
    filterProject: getElValue("filter-project") || "",
    filterContext: getElValue("filter-context") || "",
    filterPriority: getFilterPriorityFromUI(),
    filterDue: getElValue("filter-due") || "",
    filterCompleted: getElValue("filter-completion") || "all"
  };
}

function applyPrefsToUI(prefs) {
  const set = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.value = value != null ? String(value) : "";
  };
  set("sort-by", prefs.sortBy);
  set("sort-dir", prefs.sortDir);
  set("group-by", prefs.groupBy);
  set("filter-project", prefs.filterProject);
  set("filter-context", prefs.filterContext);
  set("filter-priority", prefs.filterPriority);
  set("filter-due", prefs.filterDue);
  set("filter-completion", prefs.filterCompleted);
}

async function loadTabPrefs() {
  try {
    const raw = await api.storage.local.get(TAB_PREFS_KEY);
    const p = raw && raw[TAB_PREFS_KEY];
    const merged = p && typeof p === "object" ? { ...fs.DEFAULT_PREFS, ...p } : (fs && fs.DEFAULT_PREFS ? { ...fs.DEFAULT_PREFS } : {});
    if (merged && merged.filterCompleted !== "open" && merged.filterCompleted !== "done") merged.filterCompleted = "all";
    return merged;
  } catch (_) {
    return fs && fs.DEFAULT_PREFS ? { ...fs.DEFAULT_PREFS } : {};
  }
}

function saveTabPrefs(prefs) {
  if (savePrefsTimer) clearTimeout(savePrefsTimer);
  savePrefsTimer = setTimeout(() => {
    savePrefsTimer = null;
    api.storage.local.set({ [TAB_PREFS_KEY]: prefs }).catch(() => {});
  }, SAVE_DEBOUNCE_MS);
}

function runPipeline(items, searchQuery, prefs) {
  if (!fs) return items;
  let out = fs.applySearch(items, searchQuery);
  out = fs.applyFilters(out, prefs);
  out = fs.applySort(out, prefs.sortBy, prefs.sortDir);
  return out;
}

function renderTask(item) {
  const div = document.createElement("div");
  div.className = "task" + (item.isCompleted ? " completed" : "");
  div.dataset.id = item.id;
  const cb = document.createElement("input");
  cb.type = "checkbox";
  cb.checked = !!item.isCompleted;
  cb.addEventListener("change", () => toggleTask(item));
  const title = document.createElement("span");
  title.className = "task-title";
  title.textContent = item.title || "";
  const meta = document.createElement("div");
  meta.className = "task-meta";
  const parts = [];
  if (item.priority) parts.push("Priority " + item.priority);
  if (item.dueDate) parts.push("Due: " + item.dueDate);
  if (item.categories && item.categories.length) parts.push(item.categories.join(", "));
  meta.textContent = parts.join(" · ");
  div.appendChild(cb);
  div.appendChild(title);
  if (parts.length) div.appendChild(meta);
  div.addEventListener("dblclick", () => editTask(item));
  return div;
}

function renderList(sortedItems, groupBy) {
  const listEl = document.getElementById("list");
  listEl.innerHTML = "";
  if (sortedItems.length === 0) {
    listEl.innerHTML = "<div class=\"empty\">No tasks match the filters. Change filters or add tasks.</div>";
    return;
  }
  if (fs && groupBy) {
    const groups = fs.applyGroup(sortedItems, groupBy);
    groups.forEach((g) => {
      const heading = document.createElement("div");
      heading.className = "group-heading";
      heading.style.cssText = "font-weight:600; margin-top:8px; margin-bottom:4px; color:#555;";
      heading.textContent = g.groupKey || i18n("tab_group_none");
      listEl.appendChild(heading);
      g.items.forEach((item) => listEl.appendChild(renderTask(item)));
    });
  } else {
    sortedItems.forEach((item) => listEl.appendChild(renderTask(item)));
  }
}

function refreshView() {
  const searchEl = document.getElementById("search");
  const searchQuery = searchEl ? searchEl.value : "";
  const prefs = getPrefsFromUI();
  const sorted = runPipeline(fullItems, searchQuery, prefs);
  renderList(sorted, prefs.groupBy);
}

function makeOpt(val, label) {
  const o = document.createElement("option");
  o.value = val;
  o.textContent = label || val || i18n("tab_filter_all");
  return o;
}

function setSelectOptions(el, choices, valueLabels, currentVal) {
  if (!el) return;
  const prev = el.value;
  el.innerHTML = "";
  choices.forEach((c, i) => {
    const label = valueLabels && valueLabels[i] != null ? valueLabels[i] : c;
    el.appendChild(makeOpt(c, label));
  });
  if (choices.includes(currentVal)) el.value = currentVal;
  else if (prev && choices.includes(prev)) el.value = prev;
  else if (choices[0] !== undefined) el.value = choices[0];
}

function fillProjectContextOptions(items) {
  if (!fs) return;
  const projects = new Set();
  const contexts = new Set();
  items.forEach((item) => {
    (item.categories || []).forEach((c) => projects.add(c));
    fs.normalizeLocation(item.location).forEach((c) => contexts.add(c));
  });
  const prefs = getPrefsFromUI();
  const projectChoices = ["", ...[...projects].filter(Boolean)];
  const contextChoices = ["", ...[...contexts].filter(Boolean)];
  setSelectOptions(document.getElementById("filter-project"), projectChoices, null, prefs.filterProject);
  setSelectOptions(document.getElementById("filter-context"), contextChoices, null, prefs.filterContext);
}

function fillPriorityDueCompletionOptions() {
  const prefs = getPrefsFromUI();
  const priorityEl = document.getElementById("filter-priority");
  if (priorityEl) {
    priorityEl.innerHTML = "";
    priorityEl.appendChild(makeOpt("", i18n("tab_filter_all")));
    for (let p = 0; p <= 9; p++) priorityEl.appendChild(makeOpt(p, String(p)));
    if (prefs.filterPriority !== "") priorityEl.value = prefs.filterPriority;
  }
  const dueLabels = [i18n("tab_filter_all"), i18n("tab_filter_overdue"), i18n("tab_filter_today"), i18n("tab_filter_week"), i18n("tab_filter_no_date")];
  setSelectOptions(document.getElementById("filter-due"), ["", "overdue", "today", "week", "none"], dueLabels, prefs.filterDue);
  const compEl = document.getElementById("filter-completion");
  if (compEl) {
    compEl.innerHTML = "";
    compEl.appendChild(makeOpt("all", i18n("tab_filter_all")));
    compEl.appendChild(makeOpt("open", i18n("tab_filter_open")));
    compEl.appendChild(makeOpt("done", i18n("tab_filter_done")));
    compEl.value = prefs.filterCompleted || "all";
  }
}

function fillSortGroupOptions() {
  const prefs = getPrefsFromUI();
  const sortKeys = ["priority", "dueDate", "entryDate", "completedDate", "title"];
  const sortLabels = sortKeys.map((k) => (k === "priority" ? i18n("tab_sort_priority") : k === "dueDate" ? i18n("tab_sort_due") : k === "entryDate" ? i18n("tab_sort_created") : k === "completedDate" ? i18n("tab_sort_completed") : i18n("tab_sort_title")));
  const sortEl = document.getElementById("sort-by");
  if (sortEl) {
    sortEl.innerHTML = "";
    sortKeys.forEach((k, i) => sortEl.appendChild(makeOpt(k, sortLabels[i])));
    sortEl.value = prefs.sortBy || "priority";
  }
  const groupEl = document.getElementById("group-by");
  if (groupEl) {
    groupEl.innerHTML = "";
    groupEl.appendChild(makeOpt("", i18n("tab_group_none")));
    groupEl.appendChild(makeOpt("project", i18n("tab_filter_project")));
    groupEl.appendChild(makeOpt("context", i18n("tab_filter_context")));
    groupEl.appendChild(makeOpt("priority", i18n("tab_filter_priority")));
    groupEl.appendChild(makeOpt("completion", i18n("tab_filter_completion")));
    groupEl.value = prefs.groupBy || "";
  }
}

function fillFilterOptions(items) {
  if (!fs) return;
  fillProjectContextOptions(items);
  fillPriorityDueCompletionOptions();
  fillSortGroupOptions();
}

function onFilterOrSortChange() {
  const prefs = getPrefsFromUI();
  saveTabPrefs(prefs);
  refreshView();
}

async function loadItems() {
  const listEl = document.getElementById("list");
  listEl.innerHTML = "<div class=\"empty\">Loading…</div>";
  showError("");
  const res = await api.runtime.sendMessage({ command: "getItems", refresh: true, pendingOnly: false });
  if (res && res.error) {
    listEl.innerHTML = "";
    showError(res.error);
    fullItems = [];
    return;
  }
  fullItems = (res && res.items) || [];
  listEl.innerHTML = "";
  if (fullItems.length === 0) {
    listEl.innerHTML = "<div class=\"empty\">No tasks. Configure todo.txt/done.txt in Options.</div>";
    if (document.getElementById("filters-bar")) document.getElementById("filters-bar").style.display = "none";
    return;
  }
  const prefs = await loadTabPrefs();
  applyPrefsToUI(prefs);
  fillFilterOptions(fullItems);
  const searchEl = document.getElementById("search");
  if (searchEl) searchEl.placeholder = i18n("tab_search_placeholder");
  const labels = ["label-filters", "label-project", "label-context", "label-priority", "label-due", "label-completion", "label-sort", "label-group"];
  const i18nIds = ["tab_filters_view", "tab_filter_project", "tab_filter_context", "tab_filter_priority", "tab_filter_due", "tab_filter_completion", "tab_sort_by", "tab_group_by"];
  labels.forEach((id, i) => {
    const el = document.getElementById(id);
    if (el && i18nIds[i]) el.textContent = i18n(i18nIds[i]);
  });
  refreshView();
}

async function toggleTask(item) {
  const newItem = { ...item, isCompleted: !item.isCompleted };
  const res = await api.runtime.sendMessage({ command: "modifyItem", oldItem: item, newItem });
  if (res && res.error) {
    showError(res.error);
    loadItems();
    return;
  }
  loadItems();
}

function editTask(item) {
  const title = prompt("Edit task:", item.title);
  if (title === null) return;
  const newItem = { ...item, title: title.trim() || item.title };
  api.runtime.sendMessage({ command: "modifyItem", oldItem: item, newItem }).then((res) => {
    if (res && res.error) showError(res.error);
    loadItems();
  });
}

function addTask() {
  const input = document.getElementById("new-task");
  if (!input) return;
  const raw = input.value;
  const title = raw && raw.trim();
  if (!title) return;
  api.runtime.sendMessage({ command: "addItem", item: { title, isCompleted: false } }).then((res) => {
    if (res && res.error) showError(res.error);
    else {
      input.value = "";
      loadItems();
    }
  });
}

document.getElementById("refresh").addEventListener("click", () => loadItems());
document.getElementById("add-task").addEventListener("click", addTask);
document.getElementById("new-task").addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    addTask();
  }
});
["search", "filter-project", "filter-context", "filter-priority", "filter-due", "filter-completion", "sort-by", "sort-dir", "group-by"].forEach((id) => {
  const el = document.getElementById(id);
  if (el) el.addEventListener("change", onFilterOrSortChange);
});
const searchEl = document.getElementById("search");
if (searchEl) searchEl.addEventListener("input", onFilterOrSortChange);

const actionApi = api.browserAction || api.action;
if (actionApi && typeof actionApi.openPopup === "function") {
  document.getElementById("quick-view").addEventListener("click", () => {
    actionApi.openPopup().catch(() => {});
  });
} else {
  const qv = document.getElementById("quick-view");
  if (qv) qv.style.display = "none";
  const hint = document.getElementById("toolbar-hint");
  if (hint) hint.textContent = "The Todo.txt icon appears in the toolbar when you are on the Mail tab.";
}

document.getElementById("open-options").addEventListener("click", (e) => {
  e.preventDefault();
  const url = api.runtime.getURL("options/options.html");
  if (api.tabs && api.tabs.create) {
    api.tabs.create({ url });
  } else {
    api.runtime.openOptionsPage?.();
  }
});

loadItems();
