/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const api = typeof browser !== "undefined" ? browser : chrome;
const fs = typeof filterSort !== "undefined" ? filterSort : null;

const TAB_PREFS_KEY = "tabViewPrefs";
const SAVE_DEBOUNCE_MS = 300;
let savePrefsTimer = null;
let fullItems = [];
let collapsedGroupKeys = new Set();
let readOnlyMode = false;
let editModalItem = null;
let currentViewMode = "all";
let weeklyBacklogIds = [];

function i18n(id, subs) {
  try {
    if (typeof i18nHelper !== "undefined" && i18nHelper.getMessage) return i18nHelper.getMessage(id, subs) || id;
    return api.i18n.getMessage(id, subs) || id;
  } catch (_) {
    return id;
  }
}

function showError(msg, showOptionsLink) {
  const el = document.getElementById("error");
  if (!el) return;
  el.innerHTML = "";
  if (msg) {
    el.appendChild(document.createTextNode(msg));
    if (showOptionsLink) {
      const link = document.createElement("a");
      link.href = "#";
      link.textContent = i18n("tab_open_options");
      link.style.marginLeft = "8px";
      link.addEventListener("click", (e) => {
        e.preventDefault();
        const url = api.runtime.getURL("options/options.html");
        if (api.tabs && api.tabs.create) api.tabs.create({ url });
        else api.runtime.openOptionsPage?.();
      });
      el.appendChild(link);
    }
  }
  el.style.display = msg ? "block" : "none";
}

function makeWelcomeSetupHandler(errEl, buttons, command) {
  return async () => {
    errEl.style.display = "none";
    errEl.textContent = "";
    buttons.forEach((b) => { b.disabled = true; });
    const res = await api.runtime.sendMessage({ command });
    buttons.forEach((b) => { b.disabled = false; });
    if (res && res.ok) {
      loadItems();
      return;
    }
    errEl.textContent = (res && res.error) ? res.error : i18n("welcome_select_error");
    errEl.style.display = "block";
  };
}

function renderWelcomeNoPaths(listEl) {
  const wrap = document.createElement("div");
  wrap.className = "empty welcome-setup";
  const title = document.createElement("h3");
  title.textContent = i18n("welcome_title");
  title.style.marginTop = "0";
  wrap.appendChild(title);
  const text = document.createElement("p");
  text.textContent = i18n("welcome_text");
  wrap.appendChild(text);
  const btnFolder = document.createElement("button");
  btnFolder.type = "button";
  btnFolder.textContent = i18n("welcome_btn_select_folder");
  btnFolder.style.cssText = "margin:0.5rem 0.5rem 0.5rem 0; padding:0.5rem 1rem; cursor:pointer;";
  const btnTodo = document.createElement("button");
  btnTodo.type = "button";
  btnTodo.textContent = i18n("welcome_btn_select_todo");
  btnTodo.className = "primary";
  btnTodo.style.cssText = "margin:0.5rem 0.5rem 0.5rem 0; padding:0.5rem 1rem; cursor:pointer;";
  const errEl = document.createElement("p");
  errEl.className = "hint";
  errEl.style.color = "#c00";
  errEl.style.display = "none";
  wrap.appendChild(btnFolder);
  wrap.appendChild(btnTodo);
  wrap.appendChild(errEl);
  const optionsLink = document.createElement("a");
  optionsLink.href = "#";
  optionsLink.textContent = i18n("tab_open_options");
  optionsLink.style.marginLeft = "8px";
  optionsLink.addEventListener("click", (e) => {
    e.preventDefault();
    const url = api.runtime.getURL("options/options.html");
    if (api.tabs && api.tabs.create) api.tabs.create({ url });
    else api.runtime.openOptionsPage?.();
  });
  wrap.appendChild(document.createTextNode(" "));
  wrap.appendChild(optionsLink);
  const buttons = [btnFolder, btnTodo];
  btnFolder.addEventListener("click", makeWelcomeSetupHandler(errEl, buttons, "pickFolderAndSetup"));
  btnTodo.addEventListener("click", makeWelcomeSetupHandler(errEl, buttons, "pickTodoFileAndSetup"));
  listEl.innerHTML = "";
  listEl.appendChild(wrap);
  const filtersSection = document.getElementById("filters-section");
  if (filtersSection) filtersSection.style.display = "none";
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
  const section = document.getElementById("filters-section");
  const filtersBarCollapsed = section ? section.classList.contains("collapsed") : false;
  return {
    sortBy: getElValue("sort-by") || "entryDate",
    sortDir: getElValue("sort-dir") || "asc",
    groupBy: getElValue("group-by") || "project",
    filterProject: getElValue("filter-project") || "",
    filterContext: getElValue("filter-context") || "",
    filterPriority: getFilterPriorityFromUI(),
    filterDue: getElValue("filter-due") || "",
    filterCompleted: getElValue("filter-completion") || "open",
    filtersBarCollapsed,
    defaultViewPreset: getElValue("default-view-preset") || "all",
    viewMode: currentViewMode,
    weeklyBacklogIds: weeklyBacklogIds.slice(),
    collapsedGroupKeys: Array.from(collapsedGroupKeys)
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
  const defViewEl = document.getElementById("default-view-preset");
  if (defViewEl) defViewEl.value = prefs.defaultViewPreset || "all";
  const section = document.getElementById("filters-section");
  if (section) {
    if (prefs.filtersBarCollapsed) section.classList.add("collapsed");
    else section.classList.remove("collapsed");
  }
  currentViewMode = prefs.viewMode === "today" || prefs.viewMode === "backlog" || prefs.viewMode === "weekly" ? prefs.viewMode : "all";
  weeklyBacklogIds = Array.isArray(prefs.weeklyBacklogIds) ? prefs.weeklyBacklogIds.slice() : [];
  collapsedGroupKeys = new Set(Array.isArray(prefs.collapsedGroupKeys) ? prefs.collapsedGroupKeys : []);
}

function getDefaultTabPrefs() {
  const base = fs && fs.DEFAULT_PREFS ? { ...fs.DEFAULT_PREFS } : {};
  if (!Object.prototype.hasOwnProperty.call(base, "defaultViewPreset")) base.defaultViewPreset = "all";
  if (!Object.prototype.hasOwnProperty.call(base, "viewMode")) base.viewMode = "all";
  if (!Object.prototype.hasOwnProperty.call(base, "weeklyBacklogIds")) base.weeklyBacklogIds = [];
  if (!Object.prototype.hasOwnProperty.call(base, "collapsedGroupKeys")) base.collapsedGroupKeys = [];
  return base;
}

function mergeStoredWithDefault(stored) {
  if (stored && typeof stored === "object") return { ...getDefaultTabPrefs(), ...stored };
  return getDefaultTabPrefs();
}

function normalizeFilterCompleted(prefs) {
  if (prefs && prefs.filterCompleted !== "open" && prefs.filterCompleted !== "done") prefs.filterCompleted = "all";
}

async function loadTabPrefs() {
  try {
    const raw = await api.storage.local.get(TAB_PREFS_KEY);
    const stored = raw && raw[TAB_PREFS_KEY];
    const merged = mergeStoredWithDefault(stored);
    normalizeFilterCompleted(merged);
    if (Array.isArray(merged.weeklyBacklogIds)) {
      merged.weeklyBacklogIds = cleanupWeeklyBacklogIds(merged.weeklyBacklogIds, fullItems);
    }
    return merged;
  } catch (_) {
    return getDefaultTabPrefs();
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

function resetFiltersAndRefresh() {
  const defaultPrefs = getDefaultTabPrefs();
  defaultPrefs.weeklyBacklogIds = weeklyBacklogIds.slice();
  const searchEl = document.getElementById("search");
  if (searchEl) searchEl.value = "";
  applyPrefsToUI(defaultPrefs);
  saveTabPrefs(defaultPrefs);
  refreshView();
}

function applyAllView() {
  const dueEl = document.getElementById("filter-due");
  if (dueEl) dueEl.value = "";
  const compEl = document.getElementById("filter-completion");
  if (compEl) compEl.value = "open";
  const sortByEl = document.getElementById("sort-by");
  if (sortByEl) sortByEl.value = "dueDate";
  const sortDirEl = document.getElementById("sort-dir");
  if (sortDirEl) sortDirEl.value = "asc";
  const searchEl = document.getElementById("search");
  if (searchEl) searchEl.value = "";
  currentViewMode = "all";
  const prefs = getPrefsFromUI();
  saveTabPrefs(prefs);
  refreshView();
}

function applyTodayView() {
  const dueEl = document.getElementById("filter-due");
  if (dueEl) dueEl.value = "today";
  const compEl = document.getElementById("filter-completion");
  if (compEl) compEl.value = "open";
  const sortByEl = document.getElementById("sort-by");
  if (sortByEl) sortByEl.value = "dueDate";
  const sortDirEl = document.getElementById("sort-dir");
  if (sortDirEl) sortDirEl.value = "asc";
  const searchEl = document.getElementById("search");
  if (searchEl) searchEl.value = "";
  currentViewMode = "today";
  const prefs = getPrefsFromUI();
  saveTabPrefs(prefs);
  refreshView();
}

function applyBacklogView() {
  const dueEl = document.getElementById("filter-due");
  if (dueEl) dueEl.value = "backlog";
  const compEl = document.getElementById("filter-completion");
  if (compEl) compEl.value = "open";
  const sortByEl = document.getElementById("sort-by");
  if (sortByEl) sortByEl.value = "entryDate";
  const sortDirEl = document.getElementById("sort-dir");
  if (sortDirEl) sortDirEl.value = "asc";
  const searchEl = document.getElementById("search");
  if (searchEl) searchEl.value = "";
  currentViewMode = "backlog";
  const prefs = getPrefsFromUI();
  saveTabPrefs(prefs);
  refreshView();
}

function applyWeeklyView() {
  currentViewMode = "weekly";
  const prefs = getPrefsFromUI();
  saveTabPrefs(prefs);
  refreshView();
}

function cleanupWeeklyBacklogIds(ids, items) {
  if (!Array.isArray(ids) || !items.length) return [];
  const idSet = new Set(items.map((i) => String(i.id)));
  return ids.filter((id) => idSet.has(String(id)));
}

function getTodayString() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getSummaryBaseItems() {
  if (!fs) return fullItems;
  const prefs = getPrefsFromUI();
  const baseFilters = {
    ...prefs,
    filterDue: "",
    filterCompleted: "open"
  };
  return fs.applyFilters(fullItems, baseFilters);
}

function getViewCounts() {
  const base = getSummaryBaseItems();
  const todayStr = base && base.length > 0 ? getTodayString() : "";
  let countToday = 0;
  let countOverdue = 0;
  let countBacklog = 0;
  if (base && base.length > 0) {
    base.forEach((item) => {
      if (!item.dueDate) {
        countBacklog++;
        return;
      }
      const dueStr = String(item.dueDate).slice(0, 10);
      if (dueStr === todayStr) countToday++;
      else if (dueStr < todayStr) countOverdue++;
    });
  }
  const countWeekly = Array.isArray(weeklyBacklogIds) ? weeklyBacklogIds.length : 0;
  return { countToday, countOverdue, countBacklog, countWeekly };
}

function updateTodaySummary() {
  const viewAllEl = document.getElementById("view-all");
  const viewBacklogEl = document.getElementById("view-backlog");
  const viewWeeklyEl = document.getElementById("view-weekly");
  const viewTodayEl = document.getElementById("view-today");
  if (!viewAllEl || !viewBacklogEl) return;
  const { countToday, countOverdue, countBacklog, countWeekly } = getViewCounts();
  const allLabel = i18n("tab_view_all");
  const backlogLabel = i18n("tab_view_backlog");
  const weeklyLabel = i18n("tab_view_weekly");
  const todayLabel = i18n("tab_view_today");
  const backlogCount = countBacklog + countOverdue;
  if (viewAllEl) viewAllEl.textContent = allLabel;
  if (viewBacklogEl) viewBacklogEl.textContent = backlogCount > 0 ? `${backlogLabel} (${backlogCount})` : backlogLabel;
  if (viewWeeklyEl) viewWeeklyEl.textContent = countWeekly > 0 ? `${weeklyLabel} (${countWeekly})` : weeklyLabel;
  if (viewTodayEl) viewTodayEl.textContent = countToday > 0 ? `${todayLabel} (${countToday})` : todayLabel;
}

function getTaskRowClass(item) {
  const pd = typeof priorityDisplay !== "undefined" ? priorityDisplay : null;
  let rowClass = "task" + (item.isCompleted ? " completed" : "");
  if (pd && pd.isOverdue(item.dueDate)) rowClass += " task--overdue";
  else if (pd && item.priority === 1) rowClass += " task--priority-high";
  return rowClass;
}

function createPriorityBadge(item) {
  const pd = typeof priorityDisplay !== "undefined" ? priorityDisplay : null;
  if (!pd || !item.priority) return null;
  const letter = pd.priorityToLetter(item.priority);
  const cssClass = pd.priorityToCssClass(item.priority);
  if (!letter || !cssClass) return null;
  const badge = document.createElement("span");
  badge.className = "task-priority-badge " + cssClass;
  badge.textContent = letter;
  badge.setAttribute("aria-hidden", "true");
  return badge;
}

function getTaskMetaParts(item) {
  const pd = typeof priorityDisplay !== "undefined" ? priorityDisplay : null;
  const parts = [];
  if (item.priority) {
    const letter = pd ? pd.priorityToLetter(item.priority) : "";
    parts.push(i18n("tab_meta_priority") + " " + (letter || item.priority));
  }
  if (item.dueDate) parts.push(i18n("tab_meta_due") + " " + item.dueDate);
  if (item.categories && item.categories.length) parts.push(item.categories.join(", "));
  return parts;
}

function createTaskMeta(item) {
  const parts = getTaskMetaParts(item);
  if (parts.length === 0) return null;
  const meta = document.createElement("div");
  meta.className = "task-meta";
  if (item.dueDate) {
    const dueIcon = document.createElement("span");
    dueIcon.className = "task-due-icon";
    dueIcon.setAttribute("aria-hidden", "true");
    dueIcon.textContent = "\uD83D\uDCC5 ";
    meta.appendChild(dueIcon);
  }
  meta.appendChild(document.createTextNode(parts.join(" · ")));
  return meta;
}

function renderTask(item) {
  const div = document.createElement("div");
  div.className = getTaskRowClass(item);
  div.setAttribute("role", "listitem");
  div.dataset.id = item.id;
  const cb = document.createElement("input");
  cb.type = "checkbox";
  cb.checked = !!item.isCompleted;
  cb.addEventListener("change", () => toggleTask(item));
  div.appendChild(cb);
  const badge = createPriorityBadge(item);
  if (badge) div.appendChild(badge);
  const title = document.createElement("span");
  title.className = "task-title";
  title.textContent = item.title || "";
  div.appendChild(title);
  const meta = createTaskMeta(item);
  if (meta) div.appendChild(meta);
  const weekBtn = document.createElement("button");
  weekBtn.type = "button";
  weekBtn.className = "task-week-btn";
  weekBtn.style.cssText = "flex-shrink:0; font-size:11px; padding:2px 6px; margin-right:4px;";
  const idStr = String(item.id);
  const inWeek = weeklyBacklogIds.indexOf(idStr) !== -1;
  weekBtn.textContent = inWeek ? i18n("tab_task_in_week") : i18n("tab_task_add_to_week");
  weekBtn.setAttribute("aria-label", inWeek ? i18n("tab_task_remove_from_week") : i18n("tab_task_add_to_week"));
  weekBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    const idx = weeklyBacklogIds.indexOf(idStr);
    if (idx !== -1) weeklyBacklogIds.splice(idx, 1);
    else weeklyBacklogIds.push(idStr);
    saveTabPrefs(getPrefsFromUI());
    refreshView();
  });
  div.appendChild(weekBtn);
  if (!readOnlyMode) {
    const delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.textContent = i18n("tab_delete_task");
    delBtn.className = "task-delete";
    delBtn.style.cssText = "flex-shrink:0; font-size:11px; padding:2px 6px;";
    delBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      deleteTask(item);
    });
    div.appendChild(delBtn);
  }
  div.addEventListener("dblclick", () => editTask(item));
  return div;
}

function formatGroupHeaderLabel(groupBy, groupKey) {
  if (!groupKey) return i18n("tab_group_none");
  if (groupBy === "dueDay" && /^\d{4}-\d{2}-\d{2}$/.test(groupKey)) {
    const d = new Date(groupKey + "T12:00:00");
    if (!isNaN(d.getTime())) {
      const weekday = d.toLocaleDateString(undefined, { weekday: "long" });
      return weekday + " " + groupKey;
    }
  }
  return groupKey;
}

function renderList(sortedItems, groupBy, viewMode) {
  const listEl = document.getElementById("list");
  listEl.innerHTML = "";
  if (sortedItems.length === 0) {
    const emptyWrap = document.createElement("div");
    emptyWrap.className = "empty";
    const message = viewMode === "weekly" ? i18n("tab_empty_weekly") : i18n("tab_empty_no_match");
    emptyWrap.appendChild(document.createTextNode(message));
    const resetBtn = document.createElement("button");
    resetBtn.type = "button";
    resetBtn.textContent = i18n("tab_reset_filters");
    resetBtn.style.marginTop = "8px";
    resetBtn.addEventListener("click", resetFiltersAndRefresh);
    emptyWrap.appendChild(document.createElement("br"));
    emptyWrap.appendChild(resetBtn);
    listEl.appendChild(emptyWrap);
    return;
  }
  if (fs && groupBy) {
    const groups = fs.applyGroup(sortedItems, groupBy);
    groups.forEach((g) => {
      const groupKey = g.groupKey != null ? String(g.groupKey) : "";
      const isCollapsed = collapsedGroupKeys.has(groupKey);
      const container = document.createElement("div");
      container.className = "group-container" + (isCollapsed ? " collapsed" : "");
      const header = document.createElement("button");
      header.type = "button";
      header.className = "group-heading";
      const headerLabel = formatGroupHeaderLabel(groupBy, groupKey);
      header.setAttribute("aria-expanded", String(!isCollapsed));
      header.setAttribute("aria-label", (isCollapsed ? i18n("tab_group_expand") : i18n("tab_group_collapse")) + ": " + headerLabel);
      const arrow = document.createElement("span");
      arrow.className = "group-arrow";
      arrow.setAttribute("aria-hidden", "true");
      arrow.textContent = isCollapsed ? "\u25B6" : "\u25BC";
      const label = document.createElement("span");
      label.className = "group-label";
      label.textContent = headerLabel;
      header.appendChild(arrow);
      header.appendChild(label);
      const itemsWrap = document.createElement("div");
      itemsWrap.className = "group-items";
      g.items.forEach((item) => itemsWrap.appendChild(renderTask(item)));
      header.addEventListener("click", () => {
        if (collapsedGroupKeys.has(groupKey)) collapsedGroupKeys.delete(groupKey);
        else collapsedGroupKeys.add(groupKey);
        const prefs = getPrefsFromUI();
        saveTabPrefs(prefs);
        refreshView();
      });
      container.appendChild(header);
      container.appendChild(itemsWrap);
      listEl.appendChild(container);
    });
  } else {
    sortedItems.forEach((item) => listEl.appendChild(renderTask(item)));
  }
}

function refreshView() {
  const searchEl = document.getElementById("search");
  const searchQuery = searchEl ? searchEl.value : "";
  const prefs = getPrefsFromUI();
  const effectivePrefs = prefs.viewMode === "weekly" ? { ...prefs, filterDue: "" } : prefs;
  let sorted = runPipeline(fullItems, searchQuery, effectivePrefs);
  if (prefs.viewMode === "weekly") {
    if (weeklyBacklogIds.length > 0) {
      const idSet = new Set(weeklyBacklogIds.map((id) => String(id)));
      sorted = sorted.filter((item) => idSet.has(String(item.id)));
      if (fs) sorted = fs.applySort(sorted, "dueDate", "asc");
    } else {
      sorted = [];
    }
  }
  const countEl = document.getElementById("task-count");
  if (countEl) {
    if (fullItems.length > 0) {
      const msg = i18n("tab_showing_count");
      countEl.textContent = msg.replace(/%d/, String(sorted.length)).replace(/%d/, String(fullItems.length));
      countEl.style.display = "block";
    } else {
      countEl.style.display = "none";
    }
  }
  renderList(sorted, prefs.groupBy, prefs.viewMode);
  updateTodaySummary();
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
  const dueLabels = [i18n("tab_filter_all"), i18n("tab_filter_backlog"), i18n("tab_filter_overdue"), i18n("tab_filter_today"), i18n("tab_filter_week"), i18n("tab_filter_no_date")];
  setSelectOptions(document.getElementById("filter-due"), ["", "backlog", "overdue", "today", "week", "none"], dueLabels, prefs.filterDue);
  const compEl = document.getElementById("filter-completion");
  if (compEl) {
    compEl.innerHTML = "";
    compEl.appendChild(makeOpt("all", i18n("tab_filter_all")));
    compEl.appendChild(makeOpt("open", i18n("tab_filter_open")));
    compEl.appendChild(makeOpt("done", i18n("tab_filter_done")));
    compEl.value = prefs.filterCompleted || "open";
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
    sortEl.value = prefs.sortBy || "entryDate";
  }
  const groupEl = document.getElementById("group-by");
  if (groupEl) {
    groupEl.innerHTML = "";
    groupEl.appendChild(makeOpt("", i18n("tab_group_none")));
    groupEl.appendChild(makeOpt("project", i18n("tab_filter_project")));
    groupEl.appendChild(makeOpt("context", i18n("tab_filter_context")));
    groupEl.appendChild(makeOpt("priority", i18n("tab_filter_priority")));
    groupEl.appendChild(makeOpt("completion", i18n("tab_filter_completion")));
    groupEl.appendChild(makeOpt("dueDay", i18n("tab_group_by_day")));
    groupEl.value = prefs.groupBy || "project";
  }
  const sortDirEl = document.getElementById("sort-dir");
  if (sortDirEl && sortDirEl.options.length >= 2) {
    sortDirEl.options[0].textContent = i18n("tab_sort_asc");
    sortDirEl.options[1].textContent = i18n("tab_sort_desc");
  }
}

function fillFilterOptions(items) {
  if (!fs) return;
  fillProjectContextOptions(items);
  fillPriorityDueCompletionOptions();
  fillSortGroupOptions();
}

function onFilterOrSortChange() {
  currentViewMode = "all";
  const prefs = getPrefsFromUI();
  saveTabPrefs(prefs);
  refreshView();
}

function onGroupOrSortOnlyChange() {
  const prefs = getPrefsFromUI();
  saveTabPrefs(prefs);
  refreshView();
}

function setLoading(loading) {
  const refreshBtn = document.getElementById("refresh");
  const addBtn = document.getElementById("add-task");
  if (refreshBtn) refreshBtn.disabled = !!loading;
  if (addBtn) addBtn.disabled = !!loading;
}

function renderEmptyNoConfig(listEl) {
  const emptyWrap = document.createElement("div");
  emptyWrap.className = "empty";
  emptyWrap.appendChild(document.createTextNode(i18n("tab_empty_no_config") + " "));
  const optionsLink = document.createElement("a");
  optionsLink.href = "#";
  optionsLink.textContent = i18n("tab_open_options");
  optionsLink.addEventListener("click", (e) => {
    e.preventDefault();
    const url = api.runtime.getURL("options/options.html");
    if (api.tabs && api.tabs.create) api.tabs.create({ url });
    else api.runtime.openOptionsPage?.();
  });
  emptyWrap.appendChild(optionsLink);
  listEl.innerHTML = "";
  listEl.appendChild(emptyWrap);
  const filtersSection = document.getElementById("filters-section");
  if (filtersSection) filtersSection.style.display = "none";
}

async function applyTabSetupAfterLoad() {
  const filtersSection = document.getElementById("filters-section");
  if (filtersSection) filtersSection.style.display = "";
  const prefs = await loadTabPrefs();
  applyPrefsToUI(prefs);
  fillFilterOptions(fullItems);
  const searchEl = document.getElementById("search");
  if (searchEl) searchEl.placeholder = i18n("tab_search_placeholder");
  const labels = ["label-filters", "label-project", "label-context", "label-priority", "label-due", "label-completion", "label-sort", "label-group", "label-default-view"];
  const i18nIds = ["tab_filters_view", "tab_filter_project", "tab_filter_context", "tab_filter_priority", "tab_filter_due", "tab_filter_completion", "tab_sort_by", "tab_group_by", "tab_default_view"];
  labels.forEach((id, i) => {
    const el = document.getElementById(id);
    if (el && i18nIds[i]) el.textContent = i18n(i18nIds[i]);
  });
  const resetFiltersBtn = document.getElementById("reset-filters-btn");
  if (resetFiltersBtn) resetFiltersBtn.textContent = i18n("tab_reset_filters");
  const defViewEl = document.getElementById("default-view-preset");
  if (defViewEl) {
    defViewEl.innerHTML = "";
    const options = [
      { value: "all", label: i18n("tab_default_view_all") },
      { value: "today", label: i18n("tab_default_view_today") },
      { value: "backlog", label: i18n("tab_default_view_backlog") },
      { value: "weekly", label: i18n("tab_default_view_weekly") }
    ];
    options.forEach((opt) => {
      const o = document.createElement("option");
      o.value = opt.value;
      o.textContent = opt.label;
      defViewEl.appendChild(o);
    });
    defViewEl.value = prefs.defaultViewPreset || "all";
    defViewEl.addEventListener("change", () => {
      const currentPrefs = getPrefsFromUI();
      currentPrefs.defaultViewPreset = defViewEl.value || "all";
      saveTabPrefs(currentPrefs);
    });
  }
  if (prefs.defaultViewPreset === "today") applyTodayView();
  else if (prefs.defaultViewPreset === "backlog") applyBacklogView();
  else if (prefs.defaultViewPreset === "weekly") applyWeeklyView();
  else refreshView();
}

async function loadItems() {
  const listEl = document.getElementById("list");
  listEl.innerHTML = "<div class=\"empty\">" + i18n("tab_loading") + "</div>";
  showError("");
  setLoading(true);
  try {
    const res = await api.runtime.sendMessage({ command: "getItems", refresh: true, pendingOnly: false });
    if (res && res.error) {
      renderWelcomeNoPaths(listEl);
      showError("");
      fullItems = [];
      return;
    }
    fullItems = (res && res.items) || [];
    const prefsRes = await api.runtime.sendMessage({ command: "getPrefs" });
    readOnlyMode = (prefsRes && prefsRes.readOnly) === true;
    listEl.innerHTML = "";
    if (fullItems.length === 0) {
      renderEmptyNoConfig(listEl);
      return;
    }
    await applyTabSetupAfterLoad();
  } finally {
    setLoading(false);
  }
}

async function deleteTask(item) {
  if (!confirm(i18n("tab_delete_confirm"))) return;
  const res = await api.runtime.sendMessage({ command: "deleteItem", item });
  if (res && res.error) {
    showError(res.error);
  }
  loadItems();
}

async function toggleTask(item) {
  const newItem = { ...item, isCompleted: !item.isCompleted };
  const res = await api.runtime.sendMessage({ command: "modifyItem", oldItem: item, newItem });
  if (res && res.error) {
    showError(res.error);
    loadItems();
    return;
  }
  const updatedItem = res && res.id != null ? res : newItem;
  const idx = fullItems.findIndex((i) => String(i.id) === String(item.id));
  if (idx >= 0) fullItems[idx] = updatedItem;
  const listEl = document.getElementById("list");
  const scrollTop = listEl ? listEl.scrollTop : 0;
  refreshView();
  if (listEl) listEl.scrollTop = scrollTop;
}

function startInlineEdit(taskRow, item) {
  const titleSpan = taskRow.querySelector(".task-title");
  if (!titleSpan) return;
  const originalTitle = item.title || "";
  const input = document.createElement("input");
  input.type = "text";
  input.value = originalTitle;
  input.className = "task-title-edit";
  input.style.cssText = "flex:1; min-width:0; padding:2px 4px; font-size:inherit;";
  titleSpan.replaceWith(input);
  input.focus();
  input.select();

  function submitInlineEdit() {
    const newTitle = (input.value || "").trim() || originalTitle;
    input.replaceWith(titleSpan);
    titleSpan.textContent = newTitle;
    if (newTitle === originalTitle) return;
    const newItem = { ...item, title: newTitle };
    api.runtime.sendMessage({ command: "modifyItem", oldItem: item, newItem }).then((res) => {
      if (res && res.error) showError(res.error);
      loadItems();
    });
  }

  function cancelInlineEdit() {
    input.replaceWith(titleSpan);
    titleSpan.textContent = originalTitle;
  }

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      submitInlineEdit();
    } else if (e.key === "Escape") {
      e.preventDefault();
      cancelInlineEdit();
    }
  });
  input.addEventListener("blur", () => submitInlineEdit());
}

function parseCommaList(val) {
  if (!val || typeof val !== "string") return [];
  return val.split(",").map((s) => s.trim().replace(/^[+@]/, "")).filter(Boolean);
}

function setEditModalLabels() {
  document.getElementById("edit-task-title").textContent = i18n("tab_edit_task");
  document.getElementById("edit-label-title").textContent = i18n("tab_edit_label_title");
  document.getElementById("edit-label-priority").textContent = i18n("tab_edit_label_priority");
  document.getElementById("edit-label-due").textContent = i18n("tab_edit_label_due");
  document.getElementById("edit-label-projects").textContent = i18n("tab_edit_label_projects");
  document.getElementById("edit-label-contexts").textContent = i18n("tab_edit_label_contexts");
  document.getElementById("edit-cancel").textContent = i18n("popup_edit_cancel");
  document.getElementById("edit-save").textContent = i18n("popup_edit_save");
}

function fillPrioritySelect(prioritySelect, currentPriority) {
  if (!prioritySelect) return;
  prioritySelect.innerHTML = "";
  const options = [
    { v: 0, l: i18n("tab_edit_priority_none") },
    { v: 1, l: "A" },
    { v: 5, l: "B" },
    { v: 9, l: "C" }
  ];
  options.forEach((o) => {
    const opt = document.createElement("option");
    opt.value = String(o.v);
    opt.textContent = o.l;
    prioritySelect.appendChild(opt);
  });
  prioritySelect.value = String(currentPriority != null ? currentPriority : 0);
}

function fillEditFormFromItem(item) {
  const titleInput = document.getElementById("edit-field-title");
  const prioritySelect = document.getElementById("edit-field-priority");
  const dueInput = document.getElementById("edit-field-due");
  const projectsInput = document.getElementById("edit-field-projects");
  const contextsInput = document.getElementById("edit-field-contexts");
  if (titleInput) titleInput.value = item.title || "";
  fillPrioritySelect(prioritySelect, item.priority);
  if (dueInput) dueInput.value = item.dueDate ? String(item.dueDate).slice(0, 10) : "";
  if (projectsInput) projectsInput.value = (item.categories || []).join(", ");
  const loc = item.location;
  if (contextsInput) contextsInput.value = Array.isArray(loc) ? loc.join(", ") : (loc ? String(loc) : "");
}

function openEditModal(item) {
  if (readOnlyMode || !item) return;
  editModalItem = item;
  const overlay = document.getElementById("edit-task-overlay");
  if (!overlay || !document.getElementById("edit-field-title")) return;
  setEditModalLabels();
  fillEditFormFromItem(item);
  overlay.style.display = "flex";
  document.getElementById("edit-field-title").focus();
}

function closeEditModal() {
  editModalItem = null;
  const overlay = document.getElementById("edit-task-overlay");
  if (overlay) overlay.style.display = "none";
}

function setAddModalLabels() {
  document.getElementById("add-task-title").textContent = i18n("tab_add_task_title");
  document.getElementById("add-label-title").textContent = i18n("tab_edit_label_title");
  document.getElementById("add-label-priority").textContent = i18n("tab_edit_label_priority");
  document.getElementById("add-label-due").textContent = i18n("tab_edit_label_due");
  document.getElementById("add-label-projects").textContent = i18n("tab_edit_label_projects");
  document.getElementById("add-label-contexts").textContent = i18n("tab_edit_label_contexts");
  document.getElementById("add-cancel").textContent = i18n("popup_edit_cancel");
  document.getElementById("add-save").textContent = i18n("tab_add_save");
  const tipEl = document.getElementById("add-form-tip");
  if (tipEl) tipEl.textContent = i18n("tab_add_form_tip");
}

function fillAddFormEmpty() {
  const titleInput = document.getElementById("add-field-title");
  const prioritySelect = document.getElementById("add-field-priority");
  const dueInput = document.getElementById("add-field-due");
  const projectsInput = document.getElementById("add-field-projects");
  const contextsInput = document.getElementById("add-field-contexts");
  if (titleInput) titleInput.value = "";
  fillPrioritySelect(prioritySelect, 0);
  if (dueInput) dueInput.value = "";
  if (projectsInput) projectsInput.value = "";
  if (contextsInput) contextsInput.value = "";
}

function openAddModal() {
  if (readOnlyMode) return;
  const overlay = document.getElementById("add-task-overlay");
  if (!overlay || !document.getElementById("add-field-title")) return;
  setAddModalLabels();
  fillAddFormEmpty();
  overlay.style.display = "flex";
  document.getElementById("add-field-title").focus();
}

function closeAddModal() {
  const overlay = document.getElementById("add-task-overlay");
  if (overlay) overlay.style.display = "none";
}

function getAddFormValues() {
  const titleInput = document.getElementById("add-field-title");
  const prioritySelect = document.getElementById("add-field-priority");
  const dueInput = document.getElementById("add-field-due");
  const projectsInput = document.getElementById("add-field-projects");
  const contextsInput = document.getElementById("add-field-contexts");
  const title = (titleInput && titleInput.value || "").trim();
  const priority = prioritySelect ? parseInt(prioritySelect.value, 10) : 0;
  const dueVal = dueInput && dueInput.value ? dueInput.value : null;
  const categories = parseCommaList(projectsInput ? projectsInput.value : "");
  const location = parseCommaList(contextsInput ? contextsInput.value : "");
  return { title, priority, dueVal, categories, location };
}

function buildPlainItemFromAddForm(formValues) {
  return {
    title: formValues.title,
    priority: isNaN(formValues.priority) ? 0 : formValues.priority,
    dueDate: formValues.dueVal,
    categories: formValues.categories,
    location: formValues.location,
    isCompleted: false
  };
}

async function handleAddFormSubmit(e) {
  e.preventDefault();
  const formValues = getAddFormValues();
  if (!formValues.title) return;
  const plainItem = buildPlainItemFromAddForm(formValues);
  const res = await api.runtime.sendMessage({ command: "addItem", item: plainItem });
  if (res && res.error) {
    showError(res.error);
    return;
  }
  if (res && res.id != null) fullItems.push(res);
  closeAddModal();
  refreshView();
  showAddFeedback();
}

function editTask(item) {
  if (readOnlyMode) return;
  openEditModal(item);
}

function showAddFeedback() {
  const el = document.getElementById("add-feedback");
  if (!el) return;
  el.textContent = i18n("tab_task_added");
  el.style.display = "inline";
  setTimeout(() => {
    el.textContent = "";
    el.style.display = "none";
  }, 2000);
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
      showAddFeedback();
      loadItems();
    }
  });
}

document.getElementById("refresh").addEventListener("click", () => loadItems());
document.getElementById("add-task").addEventListener("click", addTask);

const addFormBtn = document.getElementById("add-task-form-btn");
if (addFormBtn) addFormBtn.addEventListener("click", openAddModal);

const addTaskOverlay = document.getElementById("add-task-overlay");
if (addTaskOverlay) {
  addTaskOverlay.addEventListener("click", (e) => { if (e.target === addTaskOverlay) closeAddModal(); });
}
const addCancelBtn = document.getElementById("add-cancel");
if (addCancelBtn) addCancelBtn.addEventListener("click", closeAddModal);
const addTaskForm = document.getElementById("add-task-form");
if (addTaskForm) addTaskForm.addEventListener("submit", handleAddFormSubmit);

const editOverlay = document.getElementById("edit-task-overlay");
if (editOverlay) {
  editOverlay.addEventListener("click", (e) => { if (e.target === editOverlay) closeEditModal(); });
}
const editCancelBtn = document.getElementById("edit-cancel");
if (editCancelBtn) editCancelBtn.addEventListener("click", closeEditModal);
function getEditFormValues(item) {
  const titleInput = document.getElementById("edit-field-title");
  const prioritySelect = document.getElementById("edit-field-priority");
  const dueInput = document.getElementById("edit-field-due");
  const projectsInput = document.getElementById("edit-field-projects");
  const contextsInput = document.getElementById("edit-field-contexts");
  const title = (titleInput && titleInput.value || "").trim() || (item.title || "");
  const priority = prioritySelect ? parseInt(prioritySelect.value, 10) : 0;
  const dueVal = dueInput && dueInput.value ? dueInput.value : null;
  const categories = parseCommaList(projectsInput ? projectsInput.value : "");
  const location = parseCommaList(contextsInput ? contextsInput.value : "");
  return { title, priority, dueVal, categories, location };
}

function buildNewItemFromEditForm(item, formValues) {
  return {
    id: item.id,
    title: formValues.title,
    priority: isNaN(formValues.priority) ? 0 : formValues.priority,
    dueDate: formValues.dueVal,
    categories: formValues.categories,
    location: formValues.location,
    isCompleted: item.isCompleted
  };
}

async function handleEditFormSubmit(e) {
  e.preventDefault();
  const item = editModalItem;
  if (!item) return closeEditModal();
  const formValues = getEditFormValues(item);
  const newItem = buildNewItemFromEditForm(item, formValues);
  const res = await api.runtime.sendMessage({ command: "modifyItem", oldItem: item, newItem });
  if (res && res.error) {
    showError(res.error);
    return;
  }
  const updatedItem = res && res.id != null ? res : newItem;
  const idx = fullItems.findIndex((i) => String(i.id) === String(item.id));
  if (idx >= 0) fullItems[idx] = updatedItem;
  closeEditModal();
  refreshView();
}

const editForm = document.getElementById("edit-task-form");
if (editForm) editForm.addEventListener("submit", handleEditFormSubmit);
document.getElementById("new-task").addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    addTask();
  }
});
["search", "filter-project", "filter-context", "filter-priority", "filter-due", "filter-completion"].forEach((id) => {
  const el = document.getElementById(id);
  if (el) el.addEventListener("change", onFilterOrSortChange);
});
["sort-by", "sort-dir", "group-by"].forEach((id) => {
  const el = document.getElementById(id);
  if (el) el.addEventListener("change", onGroupOrSortOnlyChange);
});
const searchEl = document.getElementById("search");
if (searchEl) searchEl.addEventListener("input", onFilterOrSortChange);

const toolbarResetEl = document.getElementById("toolbar-reset-filters");
if (toolbarResetEl) toolbarResetEl.addEventListener("click", resetFiltersAndRefresh);

document.getElementById("open-options").addEventListener("click", (e) => {
  e.preventDefault();
  const url = api.runtime.getURL("options/options.html");
  if (api.tabs && api.tabs.create) {
    api.tabs.create({ url });
  } else {
    api.runtime.openOptionsPage?.();
  }
});

const viewAllEl = document.getElementById("view-all");
if (viewAllEl) viewAllEl.addEventListener("click", () => applyAllView());
const viewBacklogEl = document.getElementById("view-backlog");
if (viewBacklogEl) viewBacklogEl.addEventListener("click", () => applyBacklogView());
const viewWeeklyEl = document.getElementById("view-weekly");
if (viewWeeklyEl) viewWeeklyEl.addEventListener("click", () => applyWeeklyView());
const viewTodayEl = document.getElementById("view-today");
if (viewTodayEl) viewTodayEl.addEventListener("click", () => applyTodayView());

const filtersHeader = document.getElementById("filters-bar-header");
if (filtersHeader) {
  filtersHeader.addEventListener("click", () => {
    const section = document.getElementById("filters-section");
    if (section) {
      section.classList.toggle("collapsed");
      saveTabPrefs(getPrefsFromUI());
    }
  });
  filtersHeader.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      filtersHeader.click();
    }
  });
}
document.getElementById("reset-filters-btn")?.addEventListener("click", resetFiltersAndRefresh);

function setTabViewButtonsI18n() {
  const viewAllEl = document.getElementById("view-all");
  if (viewAllEl) {
    viewAllEl.textContent = i18n("tab_view_all");
    const allAria = i18n("tab_view_all_aria");
    viewAllEl.setAttribute("aria-label", allAria);
    viewAllEl.title = allAria;
  }
  const viewBacklogEl = document.getElementById("view-backlog");
  if (viewBacklogEl) {
    viewBacklogEl.textContent = i18n("tab_view_backlog");
    const backlogAria = i18n("tab_view_backlog_aria");
    viewBacklogEl.setAttribute("aria-label", backlogAria);
    viewBacklogEl.title = backlogAria;
  }
  const viewWeeklyEl = document.getElementById("view-weekly");
  if (viewWeeklyEl) {
    viewWeeklyEl.textContent = i18n("tab_view_weekly");
    const weeklyAria = i18n("tab_view_weekly_aria");
    viewWeeklyEl.setAttribute("aria-label", weeklyAria);
    viewWeeklyEl.title = weeklyAria;
  }
  const viewTodayEl = document.getElementById("view-today");
  if (viewTodayEl) {
    viewTodayEl.textContent = i18n("tab_view_today");
    const todayAria = i18n("tab_view_today_aria");
    viewTodayEl.setAttribute("aria-label", todayAria);
    viewTodayEl.title = todayAria;
  }
}

function setToolbarI18n() {
  const refreshEl = document.getElementById("refresh");
  if (refreshEl) {
    refreshEl.textContent = i18n("tab_refresh");
    const refreshAria = i18n("tab_refresh_aria");
    refreshEl.setAttribute("aria-label", refreshAria);
    refreshEl.title = refreshAria;
  }
  const newTaskEl = document.getElementById("new-task");
  if (newTaskEl) newTaskEl.placeholder = i18n("tab_new_task_placeholder");
  const addEl = document.getElementById("add-task");
  if (addEl) {
    addEl.textContent = i18n("tab_add");
    const addAria = i18n("tab_add_aria");
    addEl.setAttribute("aria-label", addAria);
    addEl.title = addAria;
  }
  const addFormBtnEl = document.getElementById("add-task-form-btn");
  if (addFormBtnEl) {
    addFormBtnEl.textContent = i18n("tab_add_with_form");
    const addFormAria = i18n("tab_add_with_form_aria");
    addFormBtnEl.setAttribute("aria-label", addFormAria);
    addFormBtnEl.title = addFormAria;
  }
  const toolbarResetEl = document.getElementById("toolbar-reset-filters");
  if (toolbarResetEl) {
    toolbarResetEl.textContent = i18n("tab_reset_filters");
    const resetAria = i18n("tab_reset_filters");
    toolbarResetEl.setAttribute("aria-label", resetAria);
    toolbarResetEl.title = resetAria;
  }
  setTabViewButtonsI18n();
  const optionsEl = document.getElementById("open-options");
  if (optionsEl) {
    optionsEl.textContent = i18n("tab_options");
    const optionsTitle = i18n("tab_open_options");
    optionsEl.setAttribute("aria-label", optionsTitle);
    optionsEl.title = optionsTitle;
  }
  const hintEl = document.getElementById("toolbar-hint");
  if (hintEl) hintEl.textContent = i18n("tab_toolbar_hint");
}

const SYNTAX_UI_IDS = [
  ["syntax-hint-text", "tab_syntax_hint"],
  ["syntax-title", "tab_syntax_title"],
  ["syntax-line-priority", "tab_syntax_line_priority"],
  ["syntax-line-created", "tab_syntax_line_created"],
  ["syntax-line-project-context", "tab_syntax_line_project_context"],
  ["syntax-line-due", "tab_syntax_line_due"],
  ["syntax-line-completed", "tab_syntax_line_completed"],
  ["syntax-example-label", "tab_syntax_example_label"],
  ["syntax-example-text", "tab_syntax_example_text"]
];

function setSyntaxTextContents() {
  SYNTAX_UI_IDS.forEach(([id, key]) => {
    const el = document.getElementById(id);
    if (el) el.textContent = i18n(key);
  });
  const moreLink = document.getElementById("syntax-more-link");
  if (moreLink) {
    const msg = i18n("tab_syntax_more_link");
    moreLink.textContent = msg;
    moreLink.setAttribute("title", msg);
  }
}

function initSyntaxToggle() {
  const toggle = document.getElementById("syntax-toggle");
  const section = document.getElementById("syntax-section");
  if (!toggle || !section) return;
  const updateToggle = () => {
    const collapsed = section.classList.contains("collapsed");
    toggle.textContent = collapsed ? "▼" : "▲";
    toggle.setAttribute("aria-expanded", collapsed ? "false" : "true");
    section.style.display = collapsed ? "" : "";
  };
  toggle.setAttribute("aria-label", i18n("tab_syntax_toggle_aria"));
  updateToggle();
  toggle.addEventListener("click", () => {
    section.classList.toggle("collapsed");
    updateToggle();
  });
}

function initSyntaxUi() {
  setSyntaxTextContents();
  initSyntaxToggle();
}

(async function initTab() {
  try {
    if (typeof i18nHelper !== "undefined" && i18nHelper.init) await i18nHelper.init();
  } catch (_) {}
  setToolbarI18n();
  initSyntaxUi();
  loadItems();
})();
