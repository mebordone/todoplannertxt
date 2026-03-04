/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const api = typeof browser !== "undefined" ? browser : chrome;
let readOnlyMode = false;
let editDialogItem = null;

function i18n(id, subs) {
  try {
    if (typeof i18nHelper !== "undefined" && i18nHelper.getMessage) return i18nHelper.getMessage(id, subs) || id;
    return api.i18n.getMessage(id, subs) || id;
  } catch (_) {
    return id;
  }
}

function openOptionsPage() {
  const url = api.runtime.getURL("options/options.html");
  if (api.tabs && api.tabs.create) api.tabs.create({ url });
  else api.runtime.openOptionsPage?.();
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
      link.textContent = i18n("popup_open_options");
      link.style.marginLeft = "6px";
      link.addEventListener("click", (e) => {
        e.preventDefault();
        openOptionsPage();
      });
      el.appendChild(link);
    }
  }
  el.style.display = msg ? "block" : "none";
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

function createDueSpan(item) {
  if (!item.dueDate) return null;
  const dueSpan = document.createElement("span");
  dueSpan.className = "task-due";
  dueSpan.setAttribute("aria-hidden", "true");
  dueSpan.textContent = "\uD83D\uDCC5 " + String(item.dueDate).slice(0, 10);
  return dueSpan;
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
  const dueSpan = createDueSpan(item);
  if (dueSpan) div.appendChild(dueSpan);
  if (!readOnlyMode) {
    const delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.textContent = "×";
    delBtn.title = i18n("popup_delete_task");
    delBtn.setAttribute("aria-label", i18n("popup_delete_task"));
    delBtn.className = "task-delete-btn";
    delBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      deleteTask(item);
    });
    div.appendChild(delBtn);
  }
  div.addEventListener("dblclick", () => editTask(item));
  return div;
}

function setLoading(loading) {
  const refreshBtn = document.getElementById("refresh");
  const addBtn = document.getElementById("add-task");
  if (refreshBtn) refreshBtn.disabled = !!loading;
  if (addBtn) addBtn.disabled = !!loading;
}

function runPopupSetup(command, errEl, buttons) {
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
    errEl.style.display = "inline";
  };
}

function renderPopupWelcomeNoPaths(listEl) {
  const wrap = document.createElement("div");
  wrap.className = "empty welcome-setup";
  const title = document.createElement("strong");
  title.textContent = i18n("welcome_title");
  wrap.appendChild(title);
  wrap.appendChild(document.createTextNode(" " + i18n("welcome_text")));
  const br = document.createElement("br");
  wrap.appendChild(br);
  const btnFolder = document.createElement("button");
  btnFolder.type = "button";
  btnFolder.textContent = i18n("welcome_btn_select_folder");
  btnFolder.style.cssText = "margin:0.5rem 0.25rem 0.5rem 0; padding:0.4rem 0.8rem; cursor:pointer;";
  const btnTodo = document.createElement("button");
  btnTodo.type = "button";
  btnTodo.textContent = i18n("welcome_btn_select_todo");
  btnTodo.style.cssText = "margin:0.5rem 0.25rem 0.5rem 0; padding:0.4rem 0.8rem; cursor:pointer;";
  const errEl = document.createElement("span");
  errEl.className = "error";
  errEl.style.display = "none";
  errEl.style.marginLeft = "6px";
  wrap.appendChild(btnFolder);
  wrap.appendChild(btnTodo);
  wrap.appendChild(errEl);
  const optionsLink = document.createElement("a");
  optionsLink.href = "#";
  optionsLink.textContent = i18n("popup_open_options");
  optionsLink.style.cssText = "margin-left:0.5rem;";
  optionsLink.addEventListener("click", (e) => {
    e.preventDefault();
    openOptionsPage();
  });
  wrap.appendChild(document.createTextNode(" "));
  wrap.appendChild(optionsLink);
  const buttons = [btnFolder, btnTodo];
  btnFolder.addEventListener("click", runPopupSetup("pickFolderAndSetup", errEl, buttons));
  btnTodo.addEventListener("click", runPopupSetup("pickTodoFileAndSetup", errEl, buttons));
  listEl.innerHTML = "";
  listEl.appendChild(wrap);
}

async function loadItems() {
  const listEl = document.getElementById("list");
  listEl.innerHTML = "<div class=\"empty\">" + i18n("popup_loading") + "</div>";
  showError("");
  setLoading(true);
  try {
    const prefsRes = await api.runtime.sendMessage({ command: "getPrefs" });
    readOnlyMode = (prefsRes && prefsRes.readOnly) === true;
    const res = await api.runtime.sendMessage({ command: "getItems", refresh: true, pendingOnly: true });
    if (res && res.error) {
      renderPopupWelcomeNoPaths(listEl);
      return;
    }
    const items = (res && res.items) || [];
    listEl.innerHTML = "";
    if (items.length === 0) {
      const emptyWrap = document.createElement("div");
      emptyWrap.className = "empty";
      emptyWrap.appendChild(document.createTextNode(i18n("popup_empty_no_config") + " "));
      const optionsLink = document.createElement("a");
      optionsLink.href = "#";
      optionsLink.textContent = i18n("popup_open_options");
      optionsLink.addEventListener("click", (e) => {
        e.preventDefault();
        openOptionsPage();
      });
      emptyWrap.appendChild(optionsLink);
      listEl.appendChild(emptyWrap);
      return;
    }
    items.forEach((item) => listEl.appendChild(renderTask(item)));
  } finally {
    setLoading(false);
  }
}

async function deleteTask(item) {
  if (!confirm(i18n("popup_delete_confirm"))) return;
  const res = await api.runtime.sendMessage({ command: "deleteItem", item });
  if (res && res.error) showError(res.error);
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
  loadItems();
}

function showEditDialog(item) {
  editDialogItem = item;
  const overlay = document.getElementById("edit-overlay");
  const input = document.getElementById("edit-task-input");
  const titleEl = document.getElementById("edit-dialog-title");
  if (titleEl) titleEl.textContent = i18n("popup_edit_task");
  if (input) {
    input.value = item.title || "";
    input.focus();
    input.select();
  }
  if (overlay) overlay.classList.add("visible");
}

function hideEditDialog() {
  editDialogItem = null;
  const overlay = document.getElementById("edit-overlay");
  if (overlay) overlay.classList.remove("visible");
}

function editTask(item) {
  if (readOnlyMode) return;
  showEditDialog(item);
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
document.getElementById("new-task").addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    addTask();
  }
});
document.getElementById("open-tab").addEventListener("click", (e) => {
  e.preventDefault();
  const url = api.runtime.getURL("tab/tab.html");
  if (api.tabs && api.tabs.create) {
    api.tabs.create({ url });
  }
});

document.getElementById("open-options").addEventListener("click", (e) => {
  e.preventDefault();
  const url = api.runtime.getURL("options/options.html");
  if (api.tabs && api.tabs.create) {
    api.tabs.create({ url });
  } else {
    api.runtime.openOptionsPage?.();
  }
});

const editInput = document.getElementById("edit-task-input");
const editSave = document.getElementById("edit-save");
const editCancel = document.getElementById("edit-cancel");
if (editSave) {
  editSave.addEventListener("click", () => {
    if (!editDialogItem) return;
    const title = (editInput && editInput.value || "").trim() || editDialogItem.title;
    hideEditDialog();
    const newItem = { ...editDialogItem, title };
    api.runtime.sendMessage({ command: "modifyItem", oldItem: editDialogItem, newItem }).then((res) => {
      if (res && res.error) showError(res.error);
      loadItems();
    });
  });
}
if (editCancel) editCancel.addEventListener("click", hideEditDialog);
if (editInput) {
  editInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") editSave?.click();
    if (e.key === "Escape") hideEditDialog();
  });
}

const openTabEl = document.getElementById("open-tab");

function setPopupEditDialogI18n() {
  const editTitleEl = document.getElementById("edit-dialog-title");
  if (editTitleEl) editTitleEl.textContent = i18n("popup_edit_task");
  const editCancelBtn = document.getElementById("edit-cancel");
  if (editCancelBtn) editCancelBtn.textContent = i18n("popup_edit_cancel");
  const editSaveBtn = document.getElementById("edit-save");
  if (editSaveBtn) editSaveBtn.textContent = i18n("popup_edit_save");
}

function setPopupToolbarI18n() {
  const titleEl = document.getElementById("popup-title");
  if (titleEl) titleEl.textContent = i18n("extensionName");
  const refreshEl = document.getElementById("refresh");
  if (refreshEl) {
    refreshEl.setAttribute("aria-label", i18n("popup_refresh_aria"));
    refreshEl.setAttribute("title", i18n("popup_refresh"));
  }
  const newTaskEl = document.getElementById("new-task");
  if (newTaskEl) newTaskEl.placeholder = i18n("popup_new_task_placeholder");
  const addEl = document.getElementById("add-task");
  if (addEl) {
    addEl.setAttribute("aria-label", i18n("popup_add_aria"));
    addEl.setAttribute("title", i18n("popup_add"));
  }
  if (openTabEl) {
    openTabEl.setAttribute("title", i18n("popup_tab_tooltip"));
    openTabEl.setAttribute("aria-label", i18n("popup_tab_tooltip"));
    const labelEl = document.getElementById("open-tab-label");
    if (labelEl) labelEl.textContent = i18n("popup_open_full_view");
  }
  const optionsEl = document.getElementById("open-options");
  if (optionsEl) {
    optionsEl.setAttribute("title", i18n("popup_options"));
    optionsEl.setAttribute("aria-label", i18n("popup_options"));
  }
  setPopupEditDialogI18n();
}

(async function initPopup() {
  try {
    if (typeof i18nHelper !== "undefined" && i18nHelper.init) await i18nHelper.init();
  } catch (_) {}
  setPopupToolbarI18n();
  loadItems();
})();
