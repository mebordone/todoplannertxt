/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * Returns only items that are not completed (pending tasks).
 * @param {Array<{isCompleted?: boolean}>} items - List of task items
 * @returns {Array} Items with isCompleted !== true
 */
function filterPendingOnly(items) {
  if (!Array.isArray(items)) return [];
  return items.filter((i) => !i.isCompleted);
}

if (typeof self !== "undefined") {
  self.filterPendingOnly = filterPendingOnly;
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = { filterPendingOnly };
}
