/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
/**
 * Adapter between todo.txt domain and Thunderbird Calendar Experiment API.
 * Only tasks with due:YYYY-MM-DD are synced to the calendar as VTODOs.
 * +project maps to VTODO CATEGORIES; @context is not mapped.
 */

(function() {
  "use strict";

  const CALENDAR_NAME = "Todo.txt";
  const STORAGE_URL = "moz-storage-calendar://";
  const DEBOUNCE_MS = 600;

  const mappings = typeof self !== "undefined" && self.calendarMappings ? self.calendarMappings : null;

  function getCalendarApi() {
    if (typeof messenger === "undefined" || !messenger.calendar) return null;
    if (!messenger.calendar.calendars || !messenger.calendar.items) return null;
    return messenger.calendar;
  }

  /**
   * @returns {boolean} True if the Calendar Experiment API is available.
   */
  function isCalendarApiAvailable() {
    return getCalendarApi() !== null;
  }

  function todoPlainToVtodoIcal(plainItem) {
    return mappings ? mappings.todoPlainToVtodoIcal(plainItem) : fallbackTodoPlainToVtodoIcal(plainItem);
  }
  function vtodoIcalToTodoPlain(icalString) {
    return mappings ? mappings.vtodoIcalToTodoPlain(icalString) : fallbackVtodoIcalToTodoPlain(icalString);
  }
  function getVtodoIcalFromCalendarItem(item) {
    return mappings ? mappings.getVtodoIcalFromCalendarItem(item) : (item && typeof item.item === "string" && item.item.indexOf("VTODO") >= 0 ? item.item : null);
  }
  function fallbackTodoPlainToVtodoIcal(plainItem) {
    const uid = plainItem.id || "todotxt-" + Math.random().toString(36).slice(2) + "-" + Date.now();
    const esc = (s) => (s == null || typeof s !== "string") ? "" : s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
    const toDate = (d) => (!d || typeof d !== "string") ? null : d.replace(/-/g, "").trim().slice(0, 8);
    const summary = esc(plainItem.title || "");
    const due = toDate(plainItem.dueDate);
    const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Todo.txt MailExtension//EN", "BEGIN:VTODO", "UID:" + uid, "SUMMARY:" + summary, "STATUS:" + (plainItem.isCompleted ? "COMPLETED" : "NEEDS-ACTION")];
    if (due) lines.push("DUE;VALUE=DATE:" + due);
    if (plainItem.isCompleted && plainItem.completedDate) lines.push("COMPLETED:" + toDate(plainItem.completedDate) + "T120000Z");
    if (plainItem.categories && plainItem.categories.length) lines.push("CATEGORIES:" + plainItem.categories.map(c => esc((c.charAt(0) === "+" ? c.slice(1) : c))).join(","));
    lines.push("END:VTODO", "END:VCALENDAR");
    return lines.join("\r\n");
  }
  function fallbackVtodoIcalToTodoPlain(icalString) {
    const result = { id: "", title: "", dueDate: null, isCompleted: false, completedDate: null, categories: [] };
    if (!icalString || typeof icalString !== "string") return result;
    const m = (re) => icalString.match(re);
    if (m(/\bUID:(.+)/)) result.id = m(/\bUID:(.+)/)[1].trim();
    if (m(/\bSUMMARY:(.+)/)) result.title = m(/\bSUMMARY:(.+)/)[1].replace(/\\n/g, "\n").replace(/\\([;,n\\])/g, "$1").trim();
    if (m(/\bDUE(?:;VALUE=DATE)?:(\d{8})/)) { const d = m(/\bDUE(?:;VALUE=DATE)?:(\d{8})/)[1]; result.dueDate = d.slice(0, 4) + "-" + d.slice(4, 6) + "-" + d.slice(6, 8); }
    result.isCompleted = !!(m(/\bSTATUS:(COMPLETED|NEEDS-ACTION|CANCELLED)/i) && m(/\bSTATUS:(COMPLETED|NEEDS-ACTION|CANCELLED)/i)[1].toUpperCase() === "COMPLETED");
    if (m(/\bCOMPLETED:(\d{8})T?\d*Z?/)) { const d = m(/\bCOMPLETED:(\d{8})T?\d*Z?/)[1]; result.completedDate = d.slice(0, 4) + "-" + d.slice(4, 6) + "-" + d.slice(6, 8); }
    if (m(/\bCATEGORIES:(.+)/)) {
      const raw = m(/\bCATEGORIES:(.+)/)[1].replace(/\\,/g, "\u0001").split(",").map(s => s.trim().replace(/\u0001/g, ","));
      result.categories = raw.map(c => (c.charAt(0) === "+" ? c : "+" + c));
    }
    return result;
  }

  /**
   * Ensure the "Todo.txt" calendar exists; create if not. Returns calendar id to use for items.
   */
  async function ensureTodoTxtCalendar() {
    const api = getCalendarApi();
    if (!api) return null;
    const list = await api.calendars.query({ type: "storage", name: CALENDAR_NAME });
    if (list && list.length > 0) {
      const cal = list[0];
      return cal.cacheId || cal.id;
    }
    const created = await api.calendars.create({
      type: "storage",
      url: STORAGE_URL,
      name: CALENDAR_NAME,
    });
    return created ? (created.cacheId || created.id) : null;
  }

  async function syncOneItemToCalendar(api, calendarId, plain) {
    const ical = todoPlainToVtodoIcal(plain);
    const meta = { todoLineId: plain.id };
    const existing = await api.items.query({ calendarId, id: plain.id }).catch(() => []);
    if (existing && existing.length > 0) {
      await api.items.update(calendarId, plain.id, { format: "ical", item: ical, metadata: meta });
    } else {
      await api.items.create(calendarId, {
        id: plain.id,
        type: "task",
        format: "ical",
        item: ical,
        metadata: meta,
      });
    }
  }

  async function populateCalendarFromTodoTxt(calendarId) {
    const api = getCalendarApi();
    if (!api || !calendarId) return;
    if (typeof self.getCalendarItems !== "function") return;
    const items = await self.getCalendarItems();
    const withDue = (items || []).filter(it => it.dueDate);
    for (const plain of withDue) {
      try {
        await syncOneItemToCalendar(api, calendarId, plain);
      } catch (e) {
        if (typeof todotxtLogger !== "undefined") todotxtLogger.debug("calendarAdapter", "populate item error: " + (e && e.message));
      }
    }
  }

  let calendarChangeListeners = [];
  let debounceTimer = null;

  /**
   * Register for calendar item changes (created/updated/removed). Callback receives (event, itemOrIds).
   * event is "created"|"updated"|"removed". For removed, second arg is { calendarId, id }.
   */
  function onCalendarChange(callback) {
    const api = getCalendarApi();
    if (!api) return;
    const opts = { returnFormat: "ical" };
    const fire = (event, payload) => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        debounceTimer = null;
        try {
          callback(event, payload);
        } catch (e) {
          if (typeof todotxtLogger !== "undefined") todotxtLogger.error("calendarAdapter", e);
        }
      }, DEBOUNCE_MS);
    };
    api.items.onCreated.addListener((item) => fire("created", item), opts);
    api.items.onUpdated.addListener((item) => fire("updated", item), opts);
    api.items.onRemoved.addListener((calendarId, id) => fire("removed", { calendarId, id }), opts);
    calendarChangeListeners.push({ callback, fire });
  }

  /**
   * Export todo items with due date to a single ICAL string (VCALENDAR with VTODOs).
   * Used when Calendar API is not available (fallback). Call from background so getCalendarItems is available.
   */
  async function exportTodoToIcsAsync() {
    if (typeof self.getCalendarItems !== "function") return "";
    const items = await self.getCalendarItems();
    const withDue = (items || []).filter(it => it.dueDate);
    const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Todo.txt MailExtension//EN"];
    withDue.forEach(plain => {
      const vtodo = todoPlainToVtodoIcal(plain);
      const body = vtodo.replace(/BEGIN:VCALENDAR\r?\nVERSION:2.0\r?\nPRODID:[^\r\n]+\r?\n/, "").replace(/\r?\nEND:VCALENDAR\r?$/, "");
      lines.push(body);
    });
    lines.push("END:VCALENDAR");
    return lines.join("\r\n");
  }

  /**
   * List calendar IDs that are our Todo.txt calendar (by name).
   */
  async function listTodoTxtCalendars() {
    const api = getCalendarApi();
    if (!api) return [];
    const list = await api.calendars.query({ type: "storage" });
    return (list || []).filter(c => c.name === CALENDAR_NAME);
  }

  /**
   * Get all calendars for the selector in options.
   */
  async function listCalendars() {
    const api = getCalendarApi();
    if (!api) return [];
    return api.calendars.query({}) || [];
  }

  const calendarAdapter = {
    isCalendarApiAvailable,
    ensureTodoTxtCalendar,
    populateCalendarFromTodoTxt,
    onCalendarChange,
    listTodoTxtCalendars,
    listCalendars,
    todoPlainToVtodoIcal,
    vtodoIcalToTodoPlain,
    getVtodoIcalFromCalendarItem,
    exportTodoToIcsAsync,
  };

  if (typeof self !== "undefined") self.calendarAdapter = calendarAdapter;
  if (typeof globalThis !== "undefined") globalThis.calendarAdapter = calendarAdapter;
})();
