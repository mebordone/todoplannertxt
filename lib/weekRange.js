/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * Pure helpers for week range (start/end) and due-in-range check.
 * Used by the tab's "This week" view and week-start preference.
 * Wrapped in an IIFE so function names do not leak to the global scope
 * (avoids "redeclaration of non-configurable global property" in extension context).
 */
(function() {
  function formatDateLocal(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  function getWeekRange(weekStart, todayStr) {
    const d = new Date(todayStr + "T12:00:00");
    if (isNaN(d.getTime())) return { start: todayStr, end: todayStr };
    const day = d.getDay();
    const daysBack = weekStart === "sunday" ? day : (day + 6) % 7;
    const start = new Date(d);
    start.setDate(start.getDate() - daysBack);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    return { start: formatDateLocal(start), end: formatDateLocal(end) };
  }

  function isDueInWeekRange(dueStr, start, end) {
    if (!dueStr || typeof dueStr !== "string") return false;
    const s = dueStr.slice(0, 10);
    return s >= start && s <= end;
  }

  const weekRange = { getWeekRange, isDueInWeekRange, formatDateLocal };

  if (typeof globalThis !== "undefined") globalThis.weekRange = weekRange;
  if (typeof self !== "undefined") self.weekRange = weekRange;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { getWeekRange, isDueInWeekRange, formatDateLocal };
  }
})();
