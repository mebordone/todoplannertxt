/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * Pure helpers to parse +project / @context tokens in the quick-add line for autocomplete.
 * IIFE avoids leaking globals in the MailExtension page context.
 */
(function() {
  function isSpace(ch) {
    return ch != null && /\s/.test(ch);
  }

  function wordStartIndex(value, caretPos) {
    let i = Math.min(caretPos, value.length);
    while (i > 0 && !isSpace(value.charAt(i - 1))) i -= 1;
    return i;
  }

  function tokenEndIndex(value, from) {
    let j = from;
    while (j < value.length && !isSpace(value.charAt(j))) j += 1;
    return j;
  }

  /**
   * @param {string} value - full input value
   * @param {number} caretPos - selectionStart
   * @returns {{ kind: 'project'|'context'|null, replaceStart: number, replaceEnd: number, prefix: string }}
   */
  function parseQuickAddToken(value, caretPos) {
    if (value == null || typeof value !== "string") {
      return { kind: null, replaceStart: 0, replaceEnd: 0, prefix: "" };
    }
    const pos = Math.max(0, Math.min(caretPos | 0, value.length));
    const start = wordStartIndex(value, pos);
    const ch = value.charAt(start);
    if (ch !== "+" && ch !== "@") {
      return { kind: null, replaceStart: start, replaceEnd: pos, prefix: "" };
    }
    if (pos <= start) {
      return { kind: null, replaceStart: start, replaceEnd: tokenEndIndex(value, pos), prefix: "" };
    }
    const kind = ch === "+" ? "project" : "context";
    const prefix = value.slice(start + 1, pos);
    const replaceEnd = tokenEndIndex(value, pos);
    return { kind, replaceStart: start, replaceEnd, prefix };
  }

  function filterTokenSuggestions(names, prefix, limit) {
    const lim = typeof limit === "number" && limit > 0 ? limit : 20;
    const p = prefix == null ? "" : String(prefix);
    const lower = p.toLowerCase();
    const arr = Array.isArray(names) ? names.filter((n) => n != null && String(n).length > 0).map(String) : [];
    const uniq = [...new Set(arr)];
    const filtered = uniq.filter((n) => n.toLowerCase().startsWith(lower));
    filtered.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase(), undefined, { sensitivity: "base" }));
    return filtered.slice(0, lim);
  }

  const quickAddToken = { parseQuickAddToken, filterTokenSuggestions };

  if (typeof globalThis !== "undefined") globalThis.quickAddToken = quickAddToken;
  if (typeof self !== "undefined") self.quickAddToken = quickAddToken;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = quickAddToken;
  }
})();
