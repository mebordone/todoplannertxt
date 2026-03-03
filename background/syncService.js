/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
/**
 * Sync engine: bidirectional todo.txt <-> Calendar.
 * Avoids loops by marking the origin of each change and skipping re-application.
 */

(function() {
  "use strict";

  const api = typeof browser !== "undefined" ? browser : chrome;
  const STORAGE_KEYS = {
    enabled: "calendarIntegrationEnabled",
    calendarId: "calendarId",
    syncAuto: "calendarSyncAuto",
  };

  let syncFromCalendarInProgress = false;
  let syncToCalendarInProgress = false;
  let calendarChangeUnregister = null;
  let lastPushedIds = null;
  let lastPushedTitleDue = null;
  const PUSHED_IDS_CLEAR_MS = 20000;

  function normalizeTitleForKey(t) {
    if (!t || typeof t !== "string") return "";
    return t.trim().replace(/\s+\+\S+(\s+\+\S+)*$/, "").trim();
  }
  function keyTitleDue(plain) {
    return normalizeTitleForKey(plain.title) + "\n" + (plain.dueDate || "");
  }
  const lastPullLog = [];
  const PULL_LOG_MAX = 30;
  let lastCreatedDebug = null;

  function appendPullLog(event, plainId, action, debugExtra) {
    lastPullLog.push({ at: new Date().toISOString(), event, plainId: (plainId || "").slice(0, 36), action, debug: debugExtra || null });
    if (lastPullLog.length > PULL_LOG_MAX) lastPullLog.shift();
  }

  function getLastPullLog() {
    return lastPullLog.slice();
  }
  function getLastPushedTitleDueSample() {
    if (!lastPushedTitleDue || lastPushedTitleDue.size === 0) return null;
    return { size: lastPushedTitleDue.size, keys: Array.from(lastPushedTitleDue).slice(0, 5) };
  }

  async function getCalendarSettings() {
    const raw = await api.storage.local.get([
      STORAGE_KEYS.enabled,
      STORAGE_KEYS.calendarId,
      STORAGE_KEYS.syncAuto,
    ]);
    return {
      enabled: raw[STORAGE_KEYS.enabled] === true,
      calendarId: raw[STORAGE_KEYS.calendarId] || null,
      syncAuto: raw[STORAGE_KEYS.syncAuto] !== false,
    };
  }

  function log(level, msg) {
    if (typeof todotxtLogger === "undefined") return;
    if (level === "debug") todotxtLogger.debug("syncService", msg);
    else if (level === "error") todotxtLogger.error("syncService", msg);
    else todotxtLogger.info("syncService", msg);
  }

  async function handleCalendarRemoved(payload, settings) {
    const { calendarId, id } = payload;
    if (calendarId !== settings.calendarId) return;
    const prefs = await (typeof self.getCalendarPrefs === "function" ? self.getCalendarPrefs() : Promise.resolve({}));
    if (prefs && prefs.readOnly === true) {
      log("debug", "readOnly: skip calendar→todo delete");
      return;
    }
    syncFromCalendarInProgress = true;
    try {
      if (self.deleteCalendarItem) await self.deleteCalendarItem({ id });
    } catch (e) {
      log("debug", "delete from calendar event: " + (e && e.message));
    } finally {
      syncFromCalendarInProgress = false;
    }
  }

  const lastAddedFromCalendar = new Set();
  const LAST_ADDED_CLEAR_MS = 8000;

  async function shouldSkipCalendarAdd(plain) {
    const prefs = await (typeof self.getCalendarPrefs === "function" ? self.getCalendarPrefs() : Promise.resolve({}));
    if (prefs && prefs.readOnly === true) {
      log("debug", "readOnly: skip calendar→todo add");
      return true;
    }
    const key = keyTitleDue(plain);
    if (lastAddedFromCalendar.has(key)) {
      appendPullLog("created", plain.id, "skipped_recently_added");
      return true;
    }
    const items = await (typeof self.getCalendarItems === "function" ? self.getCalendarItems() : Promise.resolve([]));
    const alreadyInTodo = Array.isArray(items) && items.some(function (it) {
      return it && (normalizeTitleForKey(it.title) + "\n" + (it.dueDate || "")) === key;
    });
    if (alreadyInTodo) {
      appendPullLog("created", plain.id, "skipped_already_in_todo");
      return true;
    }
    return false;
  }

  async function handleCalendarCreated(plain) {
    if (await shouldSkipCalendarAdd(plain)) return;
    const key = keyTitleDue(plain);
    syncFromCalendarInProgress = true;
    try {
      if (self.addCalendarItem) {
        await self.addCalendarItem(plain);
        lastAddedFromCalendar.add(key);
        setTimeout(function () { lastAddedFromCalendar.delete(key); }, LAST_ADDED_CLEAR_MS);
        appendPullLog("created", plain.id, "added");
      }
    } catch (e) {
      log("error", "applyCalendarChangeToTodo created: " + (e && e.message));
    } finally {
      syncFromCalendarInProgress = false;
    }
  }

  async function handleCalendarUpdated(plain) {
    const prefs = await (typeof self.getCalendarPrefs === "function" ? self.getCalendarPrefs() : Promise.resolve({}));
    if (prefs && prefs.readOnly === true) {
      log("debug", "readOnly: skip calendar→todo update");
      return;
    }
    syncFromCalendarInProgress = true;
    try {
      if (self.modifyCalendarItem) {
        const existing = { id: plain.id, title: plain.title, dueDate: plain.dueDate, isCompleted: plain.isCompleted, categories: plain.categories || [] };
        await self.modifyCalendarItem(existing, plain);
        appendPullLog("updated", plain.id, "updated");
      }
    } catch (e) {
      log("error", "applyCalendarChangeToTodo: " + (e && e.message));
    } finally {
      syncFromCalendarInProgress = false;
    }
  }

  async function handleCalendarCreatedOrUpdated(event, payload) {
    const icalStr = self.calendarAdapter.getVtodoIcalFromCalendarItem(payload);
    if (!icalStr) return;
    const plain = self.calendarAdapter.vtodoIcalToTodoPlain(icalStr);
    if (!plain.dueDate) return;
    if (event === "created") {
      await handleCalendarCreated(plain);
      return;
    }
    if (event === "updated") {
      await handleCalendarUpdated(plain);
    }
  }

  async function applyCalendarChangeToTodo(event, payload) {
    if (syncFromCalendarInProgress) return;
    if (!self.calendarAdapter || !self.calendarAdapter.getVtodoIcalFromCalendarItem) return;
    const settings = await getCalendarSettings();
    if (!settings.enabled || !settings.calendarId) return;
    if (event === "removed") {
      await handleCalendarRemoved(payload, settings);
      return;
    }
    await handleCalendarCreatedOrUpdated(event, payload);
  }

  function canPushToCalendar(settings) {
    return settings.enabled && settings.calendarId && self.calendarAdapter && self.calendarAdapter.populateCalendarFromTodoTxt;
  }

  function setPushedSets(withDue) {
    lastPushedIds = new Set(withDue.map(function (it) { return it.id; }));
    lastPushedTitleDue = new Set(withDue.map(function (it) { return normalizeTitleForKey(it.title) + "\n" + (it.dueDate || ""); }));
    setTimeout(function () { lastPushedIds = null; }, PUSHED_IDS_CLEAR_MS);
  }

  async function doPushToCalendar(settings) {
    const items = await (typeof self.getCalendarItems === "function" ? self.getCalendarItems() : Promise.resolve([]));
    const withDue = (items || []).filter(function (it) { return it && it.dueDate; });
    setPushedSets(withDue);
    const result = await self.calendarAdapter.populateCalendarFromTodoTxt(settings.calendarId);
    if (result && typeof result.syncedCount === "number" && typeof console !== "undefined" && console.info) {
      console.info("[Todo.txt] Calendar sync done: " + result.syncedCount + "/" + (result.withDueCount || 0) + " synced → calendarId=" + settings.calendarId);
    }
    if (result) result.calendarId = settings.calendarId;
    return result || null;
  }

  /**
   * Push todo.txt changes to the calendar (only items with due).
   * @returns {{ withDueCount: number, syncedCount: number, errors: Array }|null} Result or null if skipped.
   */
  async function pushTodoToCalendar() {
    if (syncToCalendarInProgress) return null;
    const settings = await getCalendarSettings();
    if (!canPushToCalendar(settings)) return null;
    syncToCalendarInProgress = true;
    try {
      return await doPushToCalendar(settings);
    } catch (e) {
      log("error", "pushTodoToCalendar: " + (e && e.message));
      return { withDueCount: 0, syncedCount: 0, errors: [{ message: (e && e.message) || String(e) }] };
    } finally {
      syncToCalendarInProgress = false;
    }
  }

  /**
   * Start listening to calendar changes and wire file-change to push.
   */
  function start() {
    if (!self.calendarAdapter || !self.calendarAdapter.isCalendarApiAvailable()) return;
    self.calendarAdapter.onCalendarChange(applyCalendarChangeToTodo);
    log("debug", "syncService started (calendar listeners registered)");
  }

  /**
   * Called by background when todo.txt file change is detected (e.g. after polling).
   */
  async function onTodoTxtFileChanged() {
    const settings = await getCalendarSettings();
    if (!settings.enabled || !settings.syncAuto) return;
    await pushTodoToCalendar();
  }

  const syncService = {
    start,
    onTodoTxtFileChanged,
    pushTodoToCalendar,
    getCalendarSettings,
    getLastPullLog,
    getLastPushedTitleDueSample,
  };

  if (typeof self !== "undefined") self.syncService = syncService;
  if (typeof globalThis !== "undefined") globalThis.syncService = syncService;
})();
