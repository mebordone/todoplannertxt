/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const util = {
  makeTitle(item, prefs) {
    if (!prefs || !prefs.useThunderbird) return item.render();
    if (prefs.showFullTitle) {
      let itemTitle = item.render();
      const regex = [/^\([A-Za-z]{1}\)\s*/, /^\d{4}-\d{2}-\d{2}\s*/, /[\w\d-_]+:[\w\d-_]+\s*/];
      for (let i = 0; i < regex.length; i++) itemTitle = itemTitle.replace(regex[i], "");
      return itemTitle;
    }
    return this.makeStr(item.textTokens());
  },

  makeArray(string) {
    const result = [];
    if (!string) return result;
    const parts = String(string).split(/\s+/);
    for (let i = 0; i < parts.length; i++) {
      const t = parts[i].trim();
      if (t) result.push(t);
    }
    return result;
  },

  makeStr(array, separator) {
    if (separator === undefined) separator = " ";
    return Array.isArray(array) ? array.join(separator) : "";
  },

  makeDateStr(date) {
    if (!(date instanceof Date)) return "";
    const day = date.getDate();
    const month = date.getMonth() + 1;
    return date.getFullYear() + "-" + (month < 10 ? "0" : "") + month + "-" + (day < 10 ? "0" : "") + day;
  },

  parseDate(input) {
    const parts = String(input).split("-");
    return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
  },

  calPriority(pri) {
    if (typeof pri === "string") {
      const p = pri.charAt(0);
      switch (p) {
        case "A": return 1;
        case "B": return 5;
        case "C": return 9;
        default: return 0;
      }
    }
    if (typeof pri === "number") {
      switch (pri) {
        case 1: return "A";
        case 5: return "B";
        case 9: return "C";
        default: return null;
      }
    }
    throw new Error("Unknown priority type");
  }
};

if (typeof globalThis !== "undefined") globalThis.util = util; else if (typeof self !== "undefined") self.util = util;
if (typeof module !== "undefined" && module.exports) module.exports = { util };
