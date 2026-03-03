/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * UI helpers for priority and due date display in popup/tab.
 * Maps internal priority numbers (1=A, 5=B, 9=C) to letters and CSS classes;
 * provides isOverdue for row styling.
 */
const priorityDisplay = {
  /**
   * @param {number} priority - 1 (A), 5 (B), 9 (C), or 0/none
   * @returns {string} "A" | "B" | "C" | ""
   */
  priorityToLetter(priority) {
    if (priority === 1) return "A";
    if (priority === 5) return "B";
    if (priority === 9) return "C";
    return "";
  },

  /**
   * @param {number} priority - 1 (A), 5 (B), 9 (C), or 0/none
   * @returns {string} "task-priority-a" | "task-priority-b" | "task-priority-c" | ""
   */
  priorityToCssClass(priority) {
    if (priority === 1) return "task-priority-a";
    if (priority === 5) return "task-priority-b";
    if (priority === 9) return "task-priority-c";
    return "";
  },

  /**
   * @param {string|null|undefined} dueDate - YYYY-MM-DD or null/undefined
   * @returns {boolean} true if dueDate is before today (date-only comparison)
   */
  isOverdue(dueDate) {
    if (!dueDate || typeof dueDate !== "string") return false;
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, "0");
    const d = String(today.getDate()).padStart(2, "0");
    const todayStr = `${y}-${m}-${d}`;
    const dueStr = String(dueDate).slice(0, 10);
    return dueStr < todayStr;
  }
};

if (typeof globalThis !== "undefined") globalThis.priorityDisplay = priorityDisplay;
if (typeof self !== "undefined") self.priorityDisplay = priorityDisplay;
if (typeof module !== "undefined" && module.exports) module.exports = { priorityDisplay };
