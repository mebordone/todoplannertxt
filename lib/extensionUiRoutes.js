/* This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. */

const OPTIONS_PAGE = "options/options.html";
const TAB_PAGE = "tab/tab.html";

function optionsPageRelativePath() {
  return OPTIONS_PAGE;
}

function tabPageRelativePath() {
  return TAB_PAGE;
}

/**
 * @param {(path: string) => string} getURL runtime.getURL
 * @param {"options"|"tab"} which
 * @returns {string}
 */
function extensionPageUrl(getURL, which) {
  if (which === "options") return getURL(optionsPageRelativePath());
  if (which === "tab") return getURL(tabPageRelativePath());
  throw new Error("Invalid extension page key: " + which);
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    OPTIONS_PAGE,
    TAB_PAGE,
    optionsPageRelativePath,
    tabPageRelativePath,
    extensionPageUrl
  };
} else if (typeof globalThis !== "undefined") {
  globalThis.optionsPageRelativePath = optionsPageRelativePath;
  globalThis.tabPageRelativePath = tabPageRelativePath;
  globalThis.extensionPageUrl = extensionPageUrl;
}
