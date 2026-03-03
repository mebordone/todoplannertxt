/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
/**
 * Pure mapping functions: todo.txt plain item <-> VTODO ICAL.
 * Used by calendarAdapter; testable in Node without messenger.
 */

(function() {
  "use strict";

  const ICAL_DATE_LENGTH = 8;

  function escapeIcalText(str) {
    if (str == null || typeof str !== "string") return "";
    return str.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
  }

  function toIcalDate(dateStr) {
    if (!dateStr || typeof dateStr !== "string") return null;
    const normalized = dateStr.replace(/-/g, "").trim();
    return normalized.length >= ICAL_DATE_LENGTH ? normalized.slice(0, ICAL_DATE_LENGTH) : null;
  }

  function todoPlainToVtodoIcal(plainItem) {
    const uid = plainItem.id || "todotxt-" + Math.random().toString(36).slice(2) + "-" + Date.now();
    const summary = escapeIcalText(plainItem.title || "");
    const due = toIcalDate(plainItem.dueDate);
    const lines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Todo.txt MailExtension//EN",
      "BEGIN:VTODO",
      "UID:" + uid,
      "SUMMARY:" + summary,
      "STATUS:" + (plainItem.isCompleted ? "COMPLETED" : "NEEDS-ACTION"),
    ];
    if (due) lines.push("DUE;VALUE=DATE:" + due);
    if (plainItem.isCompleted && plainItem.completedDate) {
      const completedIcal = toIcalDate(plainItem.completedDate) + "T120000Z";
      lines.push("COMPLETED:" + completedIcal);
    }
    if (plainItem.categories && plainItem.categories.length > 0) {
      const cats = plainItem.categories.map(c => (c.charAt(0) === "+" ? c.slice(1) : c));
      lines.push("CATEGORIES:" + cats.map(escapeIcalText).join(","));
    }
    lines.push("END:VTODO", "END:VCALENDAR");
    return lines.join("\r\n");
  }

  function vtodoIcalToTodoPlain(icalString) {
    const result = {
      id: "",
      title: "",
      dueDate: null,
      isCompleted: false,
      completedDate: null,
      categories: [],
    };
    if (!icalString || typeof icalString !== "string") return result;
    const uidMatch = icalString.match(/\bUID:(.+)/);
    if (uidMatch) result.id = uidMatch[1].trim();
    const summaryMatch = icalString.match(/\bSUMMARY:(.+)/);
    if (summaryMatch) {
      result.title = summaryMatch[1].replace(/\\n/g, "\n").replace(/\\([;,n\\])/g, "$1").trim();
    }
    const dueMatch = icalString.match(/\bDUE(?:;VALUE=DATE)?:(\d{8})/);
    if (dueMatch) {
      const d = dueMatch[1];
      result.dueDate = d.slice(0, 4) + "-" + d.slice(4, 6) + "-" + d.slice(6, 8);
    }
    const statusMatch = icalString.match(/\bSTATUS:(COMPLETED|NEEDS-ACTION|CANCELLED)/i);
    result.isCompleted = statusMatch && statusMatch[1].toUpperCase() === "COMPLETED";
    const completedMatch = icalString.match(/\bCOMPLETED:(\d{8})T?\d*Z?/);
    if (completedMatch) {
      const d = completedMatch[1];
      result.completedDate = d.slice(0, 4) + "-" + d.slice(4, 6) + "-" + d.slice(6, 8);
    }
    const catMatch = icalString.match(/\bCATEGORIES:(.+)/);
    if (catMatch) {
      const raw = catMatch[1].replace(/\\,/g, "\u0001").split(",").map(s => s.trim().replace(/\u0001/g, ","));
      result.categories = raw.map(c => (c.charAt(0) === "+" ? c : "+" + c));
    }
    return result;
  }

  function getVtodoIcalFromCalendarItem(item) {
    if (!item) return null;
    if (typeof item.item === "string" && item.item.indexOf("VTODO") >= 0) return item.item;
    return null;
  }

  const api = {
    escapeIcalText,
    toIcalDate,
    todoPlainToVtodoIcal,
    vtodoIcalToTodoPlain,
    getVtodoIcalFromCalendarItem,
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
  if (typeof self !== "undefined") {
    self.calendarMappings = api;
  }
  if (typeof globalThis !== "undefined") {
    globalThis.calendarMappings = api;
  }
})();
