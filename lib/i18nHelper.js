/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

(function (global) {
  const api = typeof browser !== "undefined" ? browser : chrome;
  let messageMap = null;
  let displayLang = "browser";

  function applySubstitutions(message, substitutions) {
    if (!message) return message;
    if (!Array.isArray(substitutions) || substitutions.length === 0) return message;
    let out = message;
    for (let i = 0; i < substitutions.length && i < 9; i++) {
      out = out.replace(new RegExp("\\$" + (i + 1), "g"), String(substitutions[i]));
    }
    let i = 0;
    while (out.indexOf("%d") !== -1 && i < substitutions.length) {
      out = out.replace(/%d/, String(substitutions[i++]));
    }
    return out;
  }

  function getMessageSync(key, substitutions) {
    if (displayLang === "browser" || !messageMap) {
      try {
        return api.i18n.getMessage(key, substitutions) || key;
      } catch (_) {
        return key;
      }
    }
    const raw = messageMap[key];
    const message = (raw && typeof raw === "string") ? raw : key;
    return applySubstitutions(message, substitutions);
  }

  async function initI18n() {
    try {
      const stored = await api.storage.local.get("displayLanguage");
      const lang = stored.displayLanguage === "en" || stored.displayLanguage === "es" ? stored.displayLanguage : "browser";
      displayLang = lang;
      if (lang === "browser") {
        messageMap = null;
        return;
      }
      const url = api.runtime.getURL("_locales/" + lang + "/messages.json");
      const res = await fetch(url);
      if (!res.ok) {
        messageMap = null;
        displayLang = "browser";
        return;
      }
      const json = await res.json();
      messageMap = {};
      for (const [k, v] of Object.entries(json)) {
        if (v && typeof v.message === "string") messageMap[k] = v.message;
      }
    } catch (_) {
      messageMap = null;
      displayLang = "browser";
    }
  }

  global.i18nHelper = {
    init: initI18n,
    getMessage: getMessageSync
  };
})(typeof window !== "undefined" ? window : self);
