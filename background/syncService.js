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
    syncFromCalendarInProgress = true;
    try {
      if (self.deleteCalendarItem) await self.deleteCalendarItem({ id });
    } catch (e) {
      log("debug", "delete from calendar event: " + (e && e.message));
    } finally {
      syncFromCalendarInProgress = false;
    }
  }

  async function handleCalendarCreatedOrUpdated(event, payload) {
    const icalStr = self.calendarAdapter.getVtodoIcalFromCalendarItem(payload);
    if (!icalStr) return;
    const plain = self.calendarAdapter.vtodoIcalToTodoPlain(icalStr);
    if (!plain.dueDate) return;
    syncFromCalendarInProgress = true;
    try {
      if (event === "created" && self.addCalendarItem) {
        await self.addCalendarItem(plain);
      } else if (event === "updated" && self.modifyCalendarItem) {
        const existing = { id: plain.id, title: plain.title, dueDate: plain.dueDate, isCompleted: plain.isCompleted, categories: plain.categories || [] };
        await self.modifyCalendarItem(existing, plain);
      }
    } catch (e) {
      log("error", "applyCalendarChangeToTodo: " + (e && e.message));
    } finally {
      syncFromCalendarInProgress = false;
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

  /**
   * Push todo.txt changes to the calendar (only items with due).
   */
  async function pushTodoToCalendar() {
    if (syncToCalendarInProgress) return;
    const settings = await getCalendarSettings();
    if (!settings.enabled || !settings.calendarId) return;
    if (!self.calendarAdapter || !self.calendarAdapter.populateCalendarFromTodoTxt) return;
    syncToCalendarInProgress = true;
    try {
      await self.calendarAdapter.populateCalendarFromTodoTxt(settings.calendarId);
    } catch (e) {
      log("error", "pushTodoToCalendar: " + (e && e.message));
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
  };

  if (typeof self !== "undefined") self.syncService = syncService;
  if (typeof globalThis !== "undefined") globalThis.syncService = syncService;
})();
