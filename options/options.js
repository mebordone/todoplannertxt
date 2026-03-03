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

function getFileLabel(prefs, folderPathKey, fileNameKey, folderIdKey) {
  const path = prefs[folderPathKey];
  const name = prefs[fileNameKey];
  if (path) return name + " — " + (path || "").slice(-40);
  if (prefs[folderIdKey] && name) return name + " (" + (prefs[folderIdKey] || "").slice(0, 8) + "…)";
  return "";
}

function applyBasicPrefsToUI(prefs) {
  document.getElementById("todo-path").value = getFileLabel(prefs, "todoFolderPath", "todoFileName", "todoFolderId");
  document.getElementById("done-path").value = getFileLabel(prefs, "doneFolderPath", "doneFileName", "doneFolderId");
  document.getElementById("use-thunderbird").checked = prefs.useThunderbird !== false;
  document.getElementById("use-creation").checked = prefs.useCreation !== false;
  document.getElementById("show-full-title").checked = !!prefs.showFullTitle;
  const readOnlyEl = document.getElementById("read-only");
  if (readOnlyEl) readOnlyEl.checked = prefs.readOnly === true;
  document.getElementById("calendar-enabled").checked = prefs.calendarIntegrationEnabled === true;
  document.getElementById("calendar-sync-auto").checked = prefs.calendarSyncAuto !== false;
}

function populateCalendarSelect(calSelect, prefs, listRes) {
  if (!listRes.calendars.length) return;
  calSelect.innerHTML = "";
  const defaultId = prefs.calendarId || null;
  let selectedId = defaultId;
  listRes.calendars.forEach((cal) => {
    const id = cal.cacheId || cal.id;
    const opt = document.createElement("option");
    opt.value = id;
    opt.textContent = cal.name || id;
    if (cal.name === "Todo.txt" && !defaultId) selectedId = id;
    calSelect.appendChild(opt);
  });
  if (selectedId) calSelect.value = selectedId;
  else calSelect.selectedIndex = 0;
}

async function loadCalendarSection(calSelect, prefs) {
  const listRes = await api.runtime.sendMessage({ command: "listCalendars" });
  const apiAvailable = listRes && listRes.apiAvailable && Array.isArray(listRes.calendars);
  document.getElementById("calendar-unavailable").style.display = apiAvailable ? "none" : "block";
  document.getElementById("calendar-options").style.display = apiAvailable ? "block" : "none";
  document.getElementById("calendar-export-row").style.display = apiAvailable ? "none" : "block";
  if (apiAvailable && calSelect) populateCalendarSelect(calSelect, prefs, listRes);
}

async function loadPrefs() {
  const res = await api.runtime.sendMessage({ command: "getPrefs" });
  if (res && res.error) {
    showError(res.error);
    return;
  }
  const prefs = res || {};
  applyBasicPrefsToUI(prefs);
  const calSelect = document.getElementById("calendar-select");
  if (calSelect) await loadCalendarSection(calSelect, prefs);
}

function showSavedFeedback() {
  const el = document.getElementById("options-saved");
  if (!el) return;
  el.textContent = i18n("options_saved");
  el.style.display = "block";
  setTimeout(() => {
    el.textContent = "";
    el.style.display = "none";
  }, 2000);
}

async function savePrefs(updates) {
  const res = await api.runtime.sendMessage({ command: "getPrefs" });
  const prefs = (res && !res.error) ? res : {};
  Object.assign(prefs, updates);
  await api.runtime.sendMessage({ command: "savePrefs", prefs });
  showError("");
  showSavedFeedback();
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

function appendLogMeta(log, lines) {
  lines.push("ok: " + !!log.ok);
  if (log.error) lines.push("error: " + log.error);
  if (typeof log.withDueCount === "number") lines.push("withDueCount: " + log.withDueCount);
  if (typeof log.syncedCount === "number") lines.push("syncedCount: " + log.syncedCount);
  if (log.calendarId) lines.push("calendarId: " + log.calendarId);
  if (log.sample) lines.push("sample: title=\"" + (log.sample.title || "") + "\" dueDate=" + (log.sample.dueDate || ""));
  if (log.errors && log.errors.length) log.errors.forEach((e, i) => lines.push("error[" + i + "]: " + (e.message || e.id || JSON.stringify(e))));
}

function appendDebugPushedKeys(log, lines) {
  if (!log.debugPushedKeys) return;
  lines.push("--- debug: keys we consider 'pushed' (sample) ---");
  lines.push("size=" + (log.debugPushedKeys.size || 0));
  (log.debugPushedKeys.keys || []).forEach((k, i) => lines.push("  [" + i + "] " + (k || "").slice(0, 70)));
}

function formatPullLogEntry(e) {
  let line = e.at + " " + e.event + " id=" + (e.plainId || "") + " " + e.action;
  if (e.debug) {
    line += " key=" + (e.debug.key || "").slice(0, 50);
    if (e.debug.inPushedSet !== undefined) line += " inPushedSet=" + e.debug.inPushedSet;
    if (e.debug.pushedSetSize !== undefined) line += " pushedSetSize=" + e.debug.pushedSetSize;
    if (e.debug.reason) line += " reason=" + e.debug.reason;
    if (e.debug.todoCount !== undefined) line += " todoCount=" + e.debug.todoCount;
  }
  return line;
}

function appendPullLog(log, lines) {
  if (!log.pullLog || !log.pullLog.length) return;
  lines.push("--- calendar→todo (last " + log.pullLog.length + ") ---");
  log.pullLog.forEach((e) => lines.push(formatPullLogEntry(e)));
}

function buildSyncLogLines(log) {
  const lines = [
    "[Todo.txt calendar sync log]",
    "at: " + (log && log.at ? log.at : "never"),
    "Note: Tasks (VTODO) may appear in Calendar → Task view / To-do list, not only in the day grid.",
  ];
  if (!log) {
    lines.push("(no sync run yet)");
    return lines;
  }
  appendLogMeta(log, lines);
  appendDebugPushedKeys(log, lines);
  appendPullLog(log, lines);
  return lines;
}

async function handleCopyLogClick(copyLogBtn) {
  try {
    const log = await api.runtime.sendMessage({ command: "getLastCalendarSyncLog" });
    const text = buildSyncLogLines(log).join("\n");
    await navigator.clipboard.writeText(text);
    copyLogBtn.textContent = i18n("options_calendar_copied") || "Copied.";
    setTimeout(() => { copyLogBtn.textContent = i18n("options_calendar_copy_log") || "Copy last sync log"; }, 1500);
  } catch (e) {
    if (copyLogBtn.nextElementSibling) copyLogBtn.nextElementSibling.textContent = "Copy failed: " + (e && e.message);
  }
}

function handleSyncNowClick(syncNowBtn, syncStatusEl) {
  syncStatusEl.textContent = "";
  syncNowBtn.disabled = true;
  api.runtime.sendMessage({ command: "syncCalendarNow" }).then((res) => {
    if (res && res.ok) {
      const n = res.syncedCount || 0;
      const total = res.withDueCount || 0;
      syncStatusEl.textContent = total === 0
        ? (i18n("options_calendar_sync_no_due") || "No tasks with due date in todo.txt.")
        : (i18n("options_calendar_sync_done") || "Synced %d task(s).").replace("%d", String(n));
      syncStatusEl.style.color = "";
    } else {
      syncStatusEl.textContent = (res && res.error) || "Sync failed.";
      syncStatusEl.style.color = "#c00";
    }
    syncNowBtn.disabled = false;
  }).catch((e) => {
    syncStatusEl.textContent = (e && e.message) || "Error";
    syncStatusEl.style.color = "#c00";
    syncNowBtn.disabled = false;
  });
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
    syncNowBtn.addEventListener("click", () => handleSyncNowClick(syncNowBtn, syncStatusEl));
  }
  const copyLogBtn = document.getElementById("calendar-copy-log");
  if (copyLogBtn) copyLogBtn.addEventListener("click", () => handleCopyLogClick(copyLogBtn));
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
