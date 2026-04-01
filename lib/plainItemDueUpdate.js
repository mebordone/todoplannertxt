/* This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. */

/**
 * @param {object} item Plain task from the tab / todoclient
 * @param {string|null|undefined} dueInputValue Value from input[type=date] or ""
 * @returns {object} Shallow copy with dueDate set to YYYY-MM-DD or null
 */
function buildPlainItemWithDueDate(item, dueInputValue) {
  const trimmed = dueInputValue && String(dueInputValue).trim();
  const dueDate = trimmed ? trimmed.slice(0, 10) : null;
  return { ...item, dueDate };
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { buildPlainItemWithDueDate };
} else if (typeof globalThis !== "undefined") {
  globalThis.buildPlainItemWithDueDate = buildPlainItemWithDueDate;
}
