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
  const readOnlyEl = document.getElementById("read-only");
  if (readOnlyEl) readOnlyEl.checked = prefs.readOnly === true;
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
  const readOnlyEl = document.getElementById("read-only");
  if (readOnlyEl) readOnlyEl.addEventListener("change", (e) => savePrefs({ readOnly: e.target.checked }));
  document.getElementById("calendar-enabled").addEventListener("change", async (e) => {
    await savePrefs({ calendarIntegrationEnabled: e.target.checked });
    await loadPrefs();
  });
  document.getElementById("calendar-sync-auto").addEventListener("change", (e) => savePrefs({ calendarSyncAuto: e.target.checked }));
  const calSelect = document.getElementById("calendar-select");
  if (calSelect) {
    calSelect.addEventListener("change", () => savePrefs({ calendarId: calSelect.value || null }));
  }
  const syncNowBtn = document.getElementById("calendar-sync-now");
  const syncStatusEl = document.getElementById("calendar-sync-status");
  if (syncNowBtn && syncStatusEl) {
    syncNowBtn.addEventListener("click", async () => {
      syncStatusEl.textContent = "";
      syncNowBtn.disabled = true;
      try {
        const res = await api.runtime.sendMessage({ command: "syncCalendarNow" });
        if (res && res.ok) {
          const n = res.syncedCount || 0;
          const total = res.withDueCount || 0;
          if (total === 0) {
            syncStatusEl.textContent = i18n("options_calendar_sync_no_due") || "No tasks with due date in todo.txt.";
          } else {
            syncStatusEl.textContent = (i18n("options_calendar_sync_done") || "Synced %d task(s).").replace("%d", String(n));
          }
          syncStatusEl.style.color = "";
        } else {
          syncStatusEl.textContent = (res && res.error) || "Sync failed.";
          syncStatusEl.style.color = "#c00";
        }
      } catch (e) {
        syncStatusEl.textContent = (e && e.message) || "Error";
        syncStatusEl.style.color = "#c00";
      }
      syncNowBtn.disabled = false;
    });
  }
  const copyLogBtn = document.getElementById("calendar-copy-log");
  if (copyLogBtn) {
    copyLogBtn.addEventListener("click", async () => {
      try {
        const log = await api.runtime.sendMessage({ command: "getLastCalendarSyncLog" });
        const lines = [
          "[Todo.txt calendar sync log]",
          "at: " + (log && log.at ? log.at : "never"),
          "Note: Tasks (VTODO) may appear in Calendar → Task view / To-do list, not only in the day grid.",
        ];
        if (log) {
          lines.push("ok: " + !!log.ok);
          if (log.error) lines.push("error: " + log.error);
          if (typeof log.withDueCount === "number") lines.push("withDueCount: " + log.withDueCount);
          if (typeof log.syncedCount === "number") lines.push("syncedCount: " + log.syncedCount);
          if (log.calendarId) lines.push("calendarId: " + log.calendarId);
          if (log.sample) lines.push("sample: title=\"" + (log.sample.title || "") + "\" dueDate=" + (log.sample.dueDate || ""));
          if (log.errors && log.errors.length) log.errors.forEach((e, i) => lines.push("error[" + i + "]: " + (e.message || e.id || JSON.stringify(e))));
        } else {
          lines.push("(no sync run yet)");
        }
        if (log && log.debugPushedKeys) {
          lines.push("--- debug: keys we consider 'pushed' (sample) ---");
          lines.push("size=" + (log.debugPushedKeys.size || 0));
          (log.debugPushedKeys.keys || []).forEach(function (k, i) {
            lines.push("  [" + i + "] " + (k || "").slice(0, 70));
          });
        }
        if (log && log.pullLog && log.pullLog.length) {
          lines.push("--- calendar→todo (last " + log.pullLog.length + ") ---");
          log.pullLog.forEach(function (e) {
            var line = e.at + " " + e.event + " id=" + (e.plainId || "") + " " + e.action;
            if (e.debug) {
              line += " key=" + (e.debug.key || "").slice(0, 50);
              if (e.debug.inPushedSet !== undefined) line += " inPushedSet=" + e.debug.inPushedSet;
              if (e.debug.pushedSetSize !== undefined) line += " pushedSetSize=" + e.debug.pushedSetSize;
              if (e.debug.reason) line += " reason=" + e.debug.reason;
              if (e.debug.todoCount !== undefined) line += " todoCount=" + e.debug.todoCount;
            }
            lines.push(line);
          });
        }
        const text = lines.join("\n");
        await navigator.clipboard.writeText(text);
        copyLogBtn.textContent = (typeof i18n("options_calendar_copied") !== "undefined" ? i18n("options_calendar_copied") : "Copied.");
        setTimeout(() => { copyLogBtn.textContent = i18n("options_calendar_copy_log") || "Copy last sync log"; }, 1500);
      } catch (e) {
        if (copyLogBtn.nextElementSibling) copyLogBtn.nextElementSibling.textContent = "Copy failed: " + (e && e.message);
      }
    });
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
