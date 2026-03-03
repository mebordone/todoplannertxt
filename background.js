/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const POLL_INTERVAL_MS = 15 * 1000;
const DEFAULT_PREFS = {
  todoFolderId: null,
  todoFolderPath: null,
  todoFileName: "todo.txt",
  doneFolderId: null,
  doneFolderPath: null,
  doneFileName: "done.txt",
  useThunderbird: true,
  useCreation: true,
  showFullTitle: false,
  calendarIntegrationEnabled: false,
  calendarId: null,
  calendarSyncAuto: true
};

let lastMD5 = null;
let pollTimerId = null;
const api = typeof browser !== "undefined" ? browser : chrome;

async function getPrefs() {
  const raw = await api.storage.local.get(null);
  return { ...DEFAULT_PREFS, ...raw };
}

function hasPathsConfigured(prefs) {
  if (!prefs) return false;
  return !!(prefs.todoFolderPath && prefs.doneFolderPath) || !!(prefs.todoFolderId && prefs.doneFolderId);
}

async function runPolling() {
  try {
    const prefs = await getPrefs();
    if (!hasPathsConfigured(prefs) || !self.fsaApi) return;
    const hash = await fileUtil.calculateMD5(self.fsaApi, prefs);
    if (lastMD5 !== null && hash !== lastMD5) {
      await api.storage.local.set({ lastFileChange: Date.now() });
      if (self.syncService && typeof self.syncService.onTodoTxtFileChanged === "function") {
        self.syncService.onTodoTxtFileChanged();
      }
    }
    lastMD5 = hash;
  } catch (e) {
    if (todotxtLogger) todotxtLogger.debug("background", "Poll error: " + (e && e.message));
  }
}

function startPolling() {
  if (pollTimerId) return;
  pollTimerId = setInterval(runPolling, POLL_INTERVAL_MS);
}

function stopPolling() {
  if (pollTimerId) {
    clearInterval(pollTimerId);
    pollTimerId = null;
  }
}

api.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "local") return;
  api.storage.local.set({ lastPrefsChange: Date.now() }).catch(() => {});
});

async function computeForceRefresh(refresh) {
  const stored = await api.storage.local.get(["lastFileChange", "lastPrefsChange"]);
  const forceRefresh = !!refresh || !!stored.lastFileChange || !!stored.lastPrefsChange;
  if (forceRefresh) {
    await api.storage.local.remove(["lastFileChange", "lastPrefsChange"]);
  }
  return forceRefresh;
}

async function handleGetItems(refresh, pendingOnly) {
  const prefs = await getPrefs();
  if (!hasPathsConfigured(prefs)) throw (self.exception || {}).FILES_NOT_SPECIFIED ? (self.exception).FILES_NOT_SPECIFIED() : new Error("Files not configured");
  if (!self.fsaApi) throw new Error("File access is not available. Please restart Thunderbird and try again.");
  const forceRefresh = await computeForceRefresh(refresh);
  let items = await todoclient.getItems(self.fsaApi, prefs, forceRefresh);
  if (pendingOnly && self.filterPendingOnly) {
    items = self.filterPendingOnly(items);
  }
  return { items };
}

async function handleAddItem(plainItem) {
  const prefs = await getPrefs();
  if (!hasPathsConfigured(prefs)) throw (self.exception || {}).FILES_NOT_SPECIFIED ? (self.exception).FILES_NOT_SPECIFIED() : new Error("Files not configured");
  if (!self.fsaApi) throw new Error("File access is not available. Please restart Thunderbird and try again.");
  return await todoclient.addItem(self.fsaApi, prefs, plainItem);
}

async function handleModifyItem(oldItem, newItem) {
  const prefs = await getPrefs();
  if (!hasPathsConfigured(prefs)) throw new Error("Files not configured");
  if (!self.fsaApi) throw new Error("File access is not available. Please restart Thunderbird and try again.");
  return await todoclient.modifyItem(self.fsaApi, prefs, oldItem, newItem);
}

async function handleDeleteItem(item) {
  const prefs = await getPrefs();
  if (!hasPathsConfigured(prefs)) throw new Error("Files not configured");
  if (!self.fsaApi) throw new Error("File access is not available. Please restart Thunderbird and try again.");
  await todoclient.deleteItem(self.fsaApi, prefs, item);
}

async function handleGetPrefs() {
  return await getPrefs();
}

function defaultFileName(type) {
  return type === "todo" ? "todo.txt" : "done.txt";
}

function pickResultToPrefs(result, type) {
  if (!result || result.error) return null;
  const defaultName = defaultFileName(type);
  if (self.fsaUsesBuiltIn && result.folderPath) {
    return {
      folderPath: result.folderPath,
      fileName: result.fileName || (result.file && result.file.name) || defaultName
    };
  }
  return {
    folderId: result.folderId,
    fileName: (result.file && result.file.name) || defaultName
  };
}

async function handlePickFile(type) {
  if (!self.fsaApi) throw new Error("File access is not available. Please restart Thunderbird and try again.");
  const opts = { filters: ["text", "all"], defaultFileName: defaultFileName(type) };
  const result = await self.fsaApi.readFileWithPicker({ read: true, write: true }, opts);
  return pickResultToPrefs(result, type);
}

async function handleListCalendars() {
  if (!self.calendarAdapter || !self.calendarAdapter.isCalendarApiAvailable()) {
    return { calendars: [], apiAvailable: false };
  }
  const calendars = await self.calendarAdapter.listCalendars();
  return { calendars: calendars || [], apiAvailable: true };
}

async function handleExportTodoToIcs() {
  if (!self.calendarAdapter || !self.calendarAdapter.exportTodoToIcsAsync) {
    return { error: "Export not available" };
  }
  try {
    const ics = await self.calendarAdapter.exportTodoToIcsAsync();
    return { ics: ics || "" };
  } catch (e) {
    return { error: (e && e.message) || String(e) };
  }
}

const LAST_SYNC_LOG_KEY = "lastCalendarSyncLog";

function syncLogOut(overrides) {
  return { ...overrides, at: new Date().toISOString() };
}
async function saveSyncLog(out) {
  await api.storage.local.set({ [LAST_SYNC_LOG_KEY]: syncLogOut(out) });
}

function getSyncNowPreconditionError(prefs) {
  if (!prefs.calendarIntegrationEnabled || !prefs.calendarId) return "Enable calendar integration and select a calendar first";
  if (!hasPathsConfigured(prefs)) return "Configure todo.txt and done.txt paths in options";
  return null;
}

async function saveAndReturnSyncError(errorMessage) {
  const out = { ok: false, error: errorMessage };
  await saveSyncLog(out);
  return syncLogOut(out);
}

async function runSyncAndBuildLogResult() {
  const result = await self.syncService.pushTodoToCalendar();
  if (!result) {
    await saveSyncLog({ ok: false, error: "Sync skipped (e.g. already in progress)" });
    return syncLogOut({ ok: false, error: "Sync skipped (e.g. already in progress)" });
  }
  const out = {
    ok: true,
    withDueCount: result.withDueCount || 0,
    syncedCount: result.syncedCount || 0,
    errors: result.errors || [],
    calendarId: result.calendarId || null,
    sample: result.sample || null,
  };
  await saveSyncLog(out);
  return syncLogOut(out);
}

async function handleSyncCalendarNow() {
  if (!self.syncService || typeof self.syncService.pushTodoToCalendar !== "function") {
    return saveAndReturnSyncError("Calendar sync not available");
  }
  const prefs = await getPrefs();
  const errMsg = getSyncNowPreconditionError(prefs);
  if (errMsg) return saveAndReturnSyncError(errMsg);
  try {
    return await runSyncAndBuildLogResult();
  } catch (e) {
    return saveAndReturnSyncError((e && e.message) || String(e));
  }
}

async function handleGetLastCalendarSyncLog() {
  const raw = await api.storage.local.get(LAST_SYNC_LOG_KEY);
  const log = raw[LAST_SYNC_LOG_KEY] || null;
  const pullLog = self.syncService && typeof self.syncService.getLastPullLog === "function" ? self.syncService.getLastPullLog() : [];
  const out = log ? { ...log, pullLog } : (pullLog.length ? { at: null, pullLog } : null);
  if (out && self.syncService && typeof self.syncService.getLastPushedTitleDueSample === "function") {
    out.debugPushedKeys = self.syncService.getLastPushedTitleDueSample();
  }
  return out;
}

async function ensureCalendarIdInPrefs(prefs) {
  const needCalendar = prefs.calendarIntegrationEnabled && !prefs.calendarId;
  const apiOk = self.calendarAdapter && self.calendarAdapter.isCalendarApiAvailable();
  if (!needCalendar || !apiOk) return prefs;
  try {
    const calendarId = await self.calendarAdapter.ensureTodoTxtCalendar();
    if (calendarId) prefs.calendarId = calendarId;
  } catch (e) {
    if (todotxtLogger) todotxtLogger.debug("background", "ensureTodoTxtCalendar: " + (e && e.message));
  }
  return prefs;
}

async function handleSavePrefs(msg) {
  let prefs = msg.prefs || {};
  prefs = await ensureCalendarIdInPrefs(prefs);
  await api.storage.local.set(prefs);
  if (self.syncService && prefs.calendarIntegrationEnabled && self.calendarAdapter && self.calendarAdapter.isCalendarApiAvailable()) {
    self.syncService.start();
    if (prefs.calendarId && hasPathsConfigured(prefs) && typeof self.syncService.pushTodoToCalendar === "function") {
      self.syncService.pushTodoToCalendar().catch(() => {});
    }
  }
  return { ok: true };
}

const messageHandlers = {
  getItems: (msg) => handleGetItems(msg.refresh, msg.pendingOnly),
  addItem: (msg) => handleAddItem(msg.item),
  modifyItem: (msg) => handleModifyItem(msg.oldItem, msg.newItem),
  deleteItem: (msg) => handleDeleteItem(msg.item),
  getPrefs: () => handleGetPrefs(),
  pickTodoFile: () => handlePickFile("todo"),
  pickDoneFile: () => handlePickFile("done"),
  listCalendars: () => handleListCalendars(),
  exportTodoToIcs: () => handleExportTodoToIcs(),
  syncCalendarNow: () => handleSyncCalendarNow(),
  getLastCalendarSyncLog: () => handleGetLastCalendarSyncLog(),
  savePrefs: (msg) => handleSavePrefs(msg),
};

api.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const cmd = message && message.command;
  const run = async () => {
    try {
      const handler = messageHandlers[cmd];
      if (handler) return await handler(message);
      throw new Error("Unknown command: " + cmd);
    } catch (err) {
      if (todotxtLogger && err && err.message) todotxtLogger.error("background", err);
      throw err;
    }
  };
  run()
    .then((result) => sendResponse(result))
    .catch((e) => sendResponse({ error: (e && e.message) || String(e) }));
  return true;
});

api.runtime.onStartup?.addListener(() => {
  startPolling();
});

api.runtime.onInstalled?.addListener(() => {
  startPolling();
});

startPolling();

if (self.calendarAdapter && self.calendarAdapter.isCalendarApiAvailable() && self.syncService) {
  getPrefs().then((prefs) => {
    if (prefs.calendarIntegrationEnabled) {
      self.syncService.start();
      if (prefs.calendarId && hasPathsConfigured(prefs) && typeof self.syncService.pushTodoToCalendar === "function") {
        setTimeout(() => self.syncService.pushTodoToCalendar().catch(() => {}), 1000);
      }
    }
  });
}

// Expose for experiment (addon_parent) when it needs to fetch items / modify items.
// If todo/done paths are not configured, return [] so calendar sync does not throw or log ERROR.
self.getCalendarItems = async () => {
  const prefs = await getPrefs();
  if (!hasPathsConfigured(prefs)) return [];
  try {
    const r = await handleGetItems(true);
    return (r && r.items) ? r.items : [];
  } catch (e) {
    if (todotxtLogger) todotxtLogger.debug("background", "getCalendarItems: " + (e && e.message));
    return [];
  }
};
self.addCalendarItem = (plainItem) => handleAddItem(plainItem);
self.modifyCalendarItem = (oldItem, newItem) => handleModifyItem(oldItem, newItem);
self.deleteCalendarItem = (item) => handleDeleteItem(item);
self.getCalendarPrefs = () => handleGetPrefs();
