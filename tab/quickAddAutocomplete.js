/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * Autocomplete UI for +project / @context in the quick-add input.
 * Depends on globalThis.quickAddToken (tab/quickAddToken.js).
 */
(function() {
  const LIMIT = 20;
  const LIST_ID_PREFIX = "quick-add-opt-";

  function getTokenApi() {
    const t = typeof globalThis !== "undefined" ? globalThis.quickAddToken : null;
    return t && typeof t.parseQuickAddToken === "function" ? t : null;
  }

  function hideList(listEl, input) {
    if (listEl) listEl.style.display = "none";
    if (listEl) listEl.innerHTML = "";
    if (input) {
      input.removeAttribute("aria-activedescendant");
      input.setAttribute("aria-expanded", "false");
    }
  }

  function suggestionList(tokenApi, value, caret, getProjectNames, getContextNames) {
    const parsed = tokenApi.parseQuickAddToken(value, caret);
    if (!parsed.kind) return { parsed, items: [] };
    const raw = parsed.kind === "project" ? getProjectNames() : getContextNames();
    const items = tokenApi.filterTokenSuggestions(raw, parsed.prefix, LIMIT);
    return { parsed, items };
  }

  function applySuggestion(input, parsed, choice) {
    const sym = parsed.kind === "project" ? "+" : "@";
    const before = input.value.slice(0, parsed.replaceStart);
    const after = input.value.slice(parsed.replaceEnd);
    input.value = before + sym + choice + after;
    const pos = before.length + sym.length + choice.length;
    input.setSelectionRange(pos, pos);
  }

  function renderOptions(listEl, items, activeIdx, i18nEmpty, baseId) {
    listEl.innerHTML = "";
    if (items.length === 0) {
      const row = document.createElement("div");
      row.className = "quick-add-suggestion quick-add-suggestion--empty";
      row.setAttribute("role", "option");
      row.setAttribute("aria-disabled", "true");
      row.textContent = i18nEmpty || "";
      listEl.appendChild(row);
      return;
    }
    items.forEach((text, i) => {
      const row = document.createElement("div");
      row.className = "quick-add-suggestion";
      row.setAttribute("role", "option");
      row.id = baseId + i;
      row.textContent = text;
      listEl.appendChild(row);
    });
  }

  function setActiveRow(listEl, items, activeIdx, input, baseId) {
    const rows = listEl.querySelectorAll(".quick-add-suggestion:not(.quick-add-suggestion--empty)");
    rows.forEach((row, i) => {
      if (i === activeIdx) row.classList.add("quick-add-suggestion--active");
      else row.classList.remove("quick-add-suggestion--active");
    });
    if (items.length > 0 && activeIdx >= 0 && activeIdx < items.length) {
      input.setAttribute("aria-activedescendant", baseId + activeIdx);
    } else {
      input.removeAttribute("aria-activedescendant");
    }
  }

  function attachQuickAddAutocomplete(opts) {
    const tokenApi = getTokenApi();
    if (!tokenApi || !opts || !opts.input) {
      return { destroy() {}, isListOpen() { return false; } };
    }
    const input = opts.input;
    const getProjectNames = typeof opts.getProjectNames === "function" ? opts.getProjectNames : () => [];
    const getContextNames = typeof opts.getContextNames === "function" ? opts.getContextNames : () => [];
    const i18n = typeof opts.i18n === "function" ? opts.i18n : (id) => id;

    let listEl = opts.listElement;
    if (!listEl) {
      listEl = document.createElement("div");
      listEl.className = "quick-add-suggestions";
      listEl.setAttribute("role", "listbox");
      listEl.id = "quick-add-suggestions";
      const wrap = input.parentElement;
      if (wrap) wrap.appendChild(listEl);
    }
    listEl.setAttribute("aria-label", i18n("tab_quick_add_suggestions_aria"));

    let open = false;
    let activeIdx = 0;
    let lastItems = [];
    let lastParsed = null;
    let blurTimer = null;
    /** After Esc: keep list hidden until input/click or ArrowDown/ArrowUp to resume. */
    let suppressedSuggestionsAfterEsc = false;
    const baseId = LIST_ID_PREFIX;

    function close() {
      open = false;
      lastItems = [];
      lastParsed = null;
      hideList(listEl, input);
    }

    function refreshFromInput() {
      const caret = input.selectionStart != null ? input.selectionStart : input.value.length;
      const { parsed, items } = suggestionList(tokenApi, input.value, caret, getProjectNames, getContextNames);
      lastParsed = parsed;
      if (!parsed.kind) {
        suppressedSuggestionsAfterEsc = false;
        close();
        return;
      }
      lastItems = items;
      if (suppressedSuggestionsAfterEsc) {
        open = false;
        listEl.style.display = "none";
        listEl.innerHTML = "";
        input.setAttribute("aria-expanded", "false");
        input.removeAttribute("aria-activedescendant");
        return;
      }
      open = true;
      activeIdx = 0;
      listEl.style.display = "block";
      input.setAttribute("aria-expanded", "true");
      const emptyMsg = i18n("tab_quick_add_no_matches");
      renderOptions(listEl, items, activeIdx, emptyMsg, baseId);
      setActiveRow(listEl, items, items.length ? activeIdx : -1, input, baseId);
    }

    function tryResumeAfterEsc(e) {
      if (!suppressedSuggestionsAfterEsc) return false;
      if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return false;
      const caret = input.selectionStart != null ? input.selectionStart : input.value.length;
      const { parsed, items } = suggestionList(tokenApi, input.value, caret, getProjectNames, getContextNames);
      if (!parsed.kind || items.length === 0) return false;
      suppressedSuggestionsAfterEsc = false;
      e.preventDefault();
      lastParsed = parsed;
      lastItems = items;
      open = true;
      activeIdx = 0;
      listEl.style.display = "block";
      input.setAttribute("aria-expanded", "true");
      const emptyMsg = i18n("tab_quick_add_no_matches");
      renderOptions(listEl, items, activeIdx, emptyMsg, baseId);
      if (e.key === "ArrowDown") moveActive(1);
      else moveActive(-1);
      return true;
    }

    function applyActive() {
      if (!open || !lastParsed || !lastParsed.kind) return false;
      if (lastItems.length === 0) return false;
      const choice = lastItems[activeIdx];
      if (choice == null) return false;
      try {
        applySuggestion(input, lastParsed, choice);
        close();
        return true;
      } catch (_) {
        return false;
      }
    }

    function moveActive(delta) {
      if (!open || lastItems.length === 0) return;
      activeIdx = (activeIdx + delta + lastItems.length) % lastItems.length;
      setActiveRow(listEl, lastItems, activeIdx, input, baseId);
    }

    function onInput() {
      suppressedSuggestionsAfterEsc = false;
      if (blurTimer) {
        clearTimeout(blurTimer);
        blurTimer = null;
      }
      refreshFromInput();
    }

    /** Do not call refresh on keyup after arrow/Esc/Tab or list selection resets to first item. */
    function onKeyUpRefresh(e) {
      if (blurTimer) {
        clearTimeout(blurTimer);
        blurTimer = null;
      }
      const skip = ["ArrowDown", "ArrowUp", "Escape", "Tab"];
      if (skip.includes(e.key)) return;
      refreshFromInput();
    }

    function onClickInput() {
      suppressedSuggestionsAfterEsc = false;
      onInput();
    }

    /** Tab applies the highlighted suggestion; Enter is left for "add task" (tab.js). */
    function handleTabComplete(e) {
      if (e.key !== "Tab" || e.shiftKey) return;
      if (lastItems.length === 0) return;
      if (applyActive()) {
        e.preventDefault();
        e.stopPropagation();
      }
    }

    function onKeyDown(e) {
      if (tryResumeAfterEsc(e)) return;
      if (e.key === "Escape") {
        if (!open) return;
        e.preventDefault();
        e.stopPropagation();
        suppressedSuggestionsAfterEsc = true;
        close();
        return;
      }
      if (!open) return;
      if (e.key === "ArrowDown") {
        if (lastItems.length === 0) return;
        e.preventDefault();
        moveActive(1);
        return;
      }
      if (e.key === "ArrowUp") {
        if (lastItems.length === 0) return;
        e.preventDefault();
        moveActive(-1);
        return;
      }
      handleTabComplete(e);
    }

    function onKeyDownCapture(e) {
      onKeyDown(e);
    }

    function onBlur() {
      blurTimer = setTimeout(() => {
        blurTimer = null;
        suppressedSuggestionsAfterEsc = false;
        close();
      }, 150);
    }

    function onListMouseDown(e) {
      const row = e.target.closest(".quick-add-suggestion:not(.quick-add-suggestion--empty)");
      if (!row || !listEl.contains(row)) return;
      e.preventDefault();
      const idx = Array.prototype.indexOf.call(listEl.querySelectorAll(".quick-add-suggestion:not(.quick-add-suggestion--empty)"), row);
      if (idx < 0) return;
      activeIdx = idx;
      applyActive();
      input.focus();
    }

    input.addEventListener("input", onInput);
    input.addEventListener("keyup", onKeyUpRefresh);
    input.addEventListener("click", onClickInput);
    input.addEventListener("keydown", onKeyDownCapture, true);
    input.addEventListener("blur", onBlur);
    listEl.addEventListener("mousedown", onListMouseDown);

    return {
      isListOpen() {
        return open && lastItems.length > 0;
      },
      destroy() {
        input.removeEventListener("input", onInput);
        input.removeEventListener("keyup", onInput);
        input.removeEventListener("click", onInput);
        input.removeEventListener("keydown", onKeyDownCapture, true);
        input.removeEventListener("blur", onBlur);
        listEl.removeEventListener("mousedown", onListMouseDown);
        if (blurTimer) clearTimeout(blurTimer);
        close();
      }
    };
  }

  const api = { attachQuickAddAutocomplete };
  if (typeof globalThis !== "undefined") globalThis.quickAddAutocomplete = api;
  if (typeof self !== "undefined") self.quickAddAutocomplete = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})();
