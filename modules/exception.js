/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const exception = {
  FILE_NOT_FOUND: (fileName) => {
    const message = (typeof browser !== "undefined" && browser.i18n
      ? browser.i18n.getMessage("error_fileNotFound")
      : "Cannot read from file:") + " " + (fileName || "");
    return Object.assign(new Error(message), { code: "FILE_NOT_FOUND" });
  },

  FILE_CANNOT_WRITE: (fileName) => {
    const message = (typeof browser !== "undefined" && browser.i18n
      ? browser.i18n.getMessage("error_fileCannotWrite")
      : "Cannot write to file:") + " " + (fileName || "");
    return Object.assign(new Error(message), { code: "FILE_CANNOT_WRITE" });
  },

  FILES_NOT_SPECIFIED: () => {
    const message = typeof browser !== "undefined" && browser.i18n
      ? browser.i18n.getMessage("error_filesNotSpecified")
      : "Please specify the location of the todo.txt & done.txt files in the properties.";
    return Object.assign(new Error(message), { code: "FILES_NOT_SPECIFIED" });
  },

  ITEM_NOT_FOUND: () => {
    const message = typeof browser !== "undefined" && browser.i18n
      ? browser.i18n.getMessage("error_itemNotFound")
      : "Todo task cannot be found in todo.txt";
    return Object.assign(new Error(message), { code: "ITEM_NOT_FOUND" });
  },

  EVENT_ENCOUNTERED: () => {
    const message = typeof browser !== "undefined" && browser.i18n
      ? browser.i18n.getMessage("error_eventEncountered")
      : "This calendar is used for Todo.txt and only accepts tasks, not events!";
    return Object.assign(new Error(message), { code: "EVENT_ENCOUNTERED" });
  },

  UNKNOWN: () => {
    const message = typeof browser !== "undefined" && browser.i18n
      ? browser.i18n.getMessage("error_unknown")
      : "An unknown error occurred";
    return Object.assign(new Error(message), { code: "UNKNOWN" });
  }
};

if (typeof globalThis !== "undefined") globalThis.exception = exception; else if (typeof self !== "undefined") self.exception = exception;
if (typeof module !== "undefined" && module.exports) module.exports = { exception };
