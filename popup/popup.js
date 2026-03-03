/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const api = typeof browser !== "undefined" ? browser : chrome;
let readOnlyMode = false;
let editDialogItem = null;

function i18n(id) {
  try {
    return api.i18n.getMessage(id) || id;
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

function renderTask(item) {
  const div = document.createElement("div");
  div.className = "task" + (item.isCompleted ? " completed" : "");
  div.setAttribute("role", "listitem");
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

async function loadItems() {
  const listEl = document.getElementById("list");
  listEl.innerHTML = "<div class=\"empty\">Loading…</div>";
  showError("");
  setLoading(true);
  try {
    const prefsRes = await api.runtime.sendMessage({ command: "getPrefs" });
    readOnlyMode = (prefsRes && prefsRes.readOnly) === true;
    const res = await api.runtime.sendMessage({ command: "getItems", refresh: true, pendingOnly: true });
    if (res && res.error) {
      listEl.innerHTML = "";
      showError(res.error, true);
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
if (openTabEl) openTabEl.title = i18n("popup_tab_tooltip");

loadItems();
