/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const api = typeof browser !== "undefined" ? browser : chrome;

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

async function loadPrefs() {
  const res = await api.runtime.sendMessage({ command: "getPrefs" });
  if (res && res.error) {
    showError(res.error);
    return;
  }
  const prefs = res || {};
  const todoLabel = prefs.todoFolderPath
    ? prefs.todoFileName + " — " + (prefs.todoFolderPath || "").slice(-40)
    : (prefs.todoFolderId && prefs.todoFileName ? prefs.todoFileName + " (" + (prefs.todoFolderId || "").slice(0, 8) + "…)" : "");
  const doneLabel = prefs.doneFolderPath
    ? prefs.doneFileName + " — " + (prefs.doneFolderPath || "").slice(-40)
    : (prefs.doneFolderId && prefs.doneFileName ? prefs.doneFileName + " (" + (prefs.doneFolderId || "").slice(0, 8) + "…)" : "");
  document.getElementById("todo-path").value = todoLabel;
  document.getElementById("done-path").value = doneLabel;
  document.getElementById("use-thunderbird").checked = prefs.useThunderbird !== false;
  document.getElementById("use-creation").checked = prefs.useCreation !== false;
  document.getElementById("show-full-title").checked = !!prefs.showFullTitle;
  document.getElementById("calendar-enabled").checked = prefs.calendarIntegrationEnabled === true;
  document.getElementById("calendar-sync-auto").checked = prefs.calendarSyncAuto !== false;
  const calSelect = document.getElementById("calendar-select");
  if (calSelect) {
    const res = await api.runtime.sendMessage({ command: "listCalendars" });
    const apiAvailable = res && res.apiAvailable && Array.isArray(res.calendars);
    document.getElementById("calendar-unavailable").style.display = apiAvailable ? "none" : "block";
    document.getElementById("calendar-options").style.display = apiAvailable ? "block" : "none";
    document.getElementById("calendar-export-row").style.display = apiAvailable ? "none" : "block";
    if (apiAvailable && res.calendars.length) {
      calSelect.innerHTML = "";
      const defaultId = prefs.calendarId || null;
      let selectedId = defaultId;
      res.calendars.forEach((cal) => {
        const id = cal.cacheId || cal.id;
        const opt = document.createElement("option");
        opt.value = id;
        opt.textContent = cal.name || id;
        if (cal.name === "Todo.txt" && !defaultId) selectedId = id;
        calSelect.appendChild(opt);
      });
      if (selectedId) calSelect.value = selectedId;
      else if (res.calendars.length) calSelect.selectedIndex = 0;
    }
  }
}

async function savePrefs(updates) {
  const res = await api.runtime.sendMessage({ command: "getPrefs" });
  const prefs = (res && !res.error) ? res : {};
  Object.assign(prefs, updates);
  await api.runtime.sendMessage({ command: "savePrefs", prefs });
  showError("");
}

async function pickFile(type) {
  showError("");
  const cmd = type === "todo" ? "pickTodoFile" : "pickDoneFile";
  const res = await api.runtime.sendMessage({ command: cmd });
  if (res && res.error) {
    showError(res.error);
    return;
  }
  if (!res) return;
  const updates = type === "todo" ? { todoFileName: res.fileName } : { doneFileName: res.fileName };
  if (res.folderPath != null) {
    updates[type === "todo" ? "todoFolderPath" : "doneFolderPath"] = res.folderPath;
  }
  if (res.folderId != null) {
    updates[type === "todo" ? "todoFolderId" : "doneFolderId"] = res.folderId;
  }
  await savePrefs(updates);
  await loadPrefs();
}

document.addEventListener("DOMContentLoaded", () => {
  try {
    document.title = i18n("options_title") || document.title;
  } catch (_) {}
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const id = el.getAttribute("data-i18n");
    if (id) el.textContent = i18n(id);
  });

  loadPrefs();

  document.getElementById("browse-todo").addEventListener("click", () => pickFile("todo"));
  document.getElementById("browse-done").addEventListener("click", () => pickFile("done"));

  document.getElementById("use-thunderbird").addEventListener("change", (e) => savePrefs({ useThunderbird: e.target.checked }));
  document.getElementById("use-creation").addEventListener("change", (e) => savePrefs({ useCreation: e.target.checked }));
  document.getElementById("show-full-title").addEventListener("change", (e) => savePrefs({ showFullTitle: e.target.checked }));
  document.getElementById("calendar-enabled").addEventListener("change", (e) => savePrefs({ calendarIntegrationEnabled: e.target.checked }));
  document.getElementById("calendar-sync-auto").addEventListener("change", (e) => savePrefs({ calendarSyncAuto: e.target.checked }));
  const calSelect = document.getElementById("calendar-select");
  if (calSelect) {
    calSelect.addEventListener("change", () => savePrefs({ calendarId: calSelect.value || null }));
  }
  const exportIcsBtn = document.getElementById("calendar-export-ics");
  if (exportIcsBtn) {
    exportIcsBtn.addEventListener("click", async () => {
      const res = await api.runtime.sendMessage({ command: "exportTodoToIcs" });
      if (res && res.error) {
        showError(res.error);
        return;
      }
      const ics = (res && res.ics) || "";
      if (!ics) {
        showError("No tasks with due date to export.");
        return;
      }
      const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "todo-due.ics";
      a.click();
      URL.revokeObjectURL(url);
      showError("");
    });
  }
});
