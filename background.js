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
  showFullTitle: false
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

async function handleGetItems(refresh) {
  const prefs = await getPrefs();
  if (!hasPathsConfigured(prefs)) throw (self.exception || {}).FILES_NOT_SPECIFIED ? (self.exception).FILES_NOT_SPECIFIED() : new Error("Files not configured");
  if (!self.fsaApi) throw new Error("File access is not available. Please restart Thunderbird and try again.");
  const forceRefresh = !!refresh;
  const stored = await api.storage.local.get(["lastFileChange", "lastPrefsChange"]);
  if (forceRefresh || stored.lastFileChange || stored.lastPrefsChange) {
    await api.storage.local.remove(["lastFileChange", "lastPrefsChange"]);
  }
  const items = await todoclient.getItems(self.fsaApi, prefs, forceRefresh || !!stored.lastFileChange || !!stored.lastPrefsChange);
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

const messageHandlers = {
  getItems: (msg) => handleGetItems(msg.refresh),
  addItem: (msg) => handleAddItem(msg.item),
  modifyItem: (msg) => handleModifyItem(msg.oldItem, msg.newItem),
  deleteItem: (msg) => handleDeleteItem(msg.item),
  getPrefs: () => handleGetPrefs(),
  pickTodoFile: () => handlePickFile("todo"),
  pickDoneFile: () => handlePickFile("done"),
  savePrefs: async (msg) => {
    await api.storage.local.set(msg.prefs || {});
    return { ok: true };
  }
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

// Expose for experiment (addon_parent) when it needs to fetch items / modify items
self.getCalendarItems = async () => {
  const r = await handleGetItems(true);
  return (r && r.items) ? r.items : [];
};
self.addCalendarItem = (plainItem) => handleAddItem(plainItem);
self.modifyCalendarItem = (oldItem, newItem) => handleModifyItem(oldItem, newItem);
self.deleteCalendarItem = (item) => handleDeleteItem(item);
self.getCalendarPrefs = () => handleGetPrefs();
