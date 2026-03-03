/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Built-in file access for Todo.txt. Uses Thunderbird privileged APIs so the
 * user does not need to install the external File Access Manager add-on.
 */

"use strict";

const windowMediator = Components.classes["@mozilla.org/appshell/window-mediator;1"]
  .getService(Components.interfaces.nsIWindowMediator);
const { XPCOMUtils } = ChromeUtils.importESModule("resource://gre/modules/XPCOMUtils.sys.mjs");
let PathUtils = null;
try {
  const pathUtilsMod = ChromeUtils.importESModule("resource://gre/modules/PathUtils.sys.mjs");
  PathUtils = pathUtilsMod.PathUtils || pathUtilsMod;
} catch (_) {
  // PathUtils may be unavailable in Thunderbird; joinPath fallback used below
}

const FILTERS = {
  all: Components.interfaces.nsIFilePicker.filterAll,
  text: Components.interfaces.nsIFilePicker.filterText,
  html: Components.interfaces.nsIFilePicker.filterHTML,
  images: Components.interfaces.nsIFilePicker.filterImages,
  xml: Components.interfaces.nsIFilePicker.filterXML,
  audio: Components.interfaces.nsIFilePicker.filterAudio,
  video: Components.interfaces.nsIFilePicker.filterVideo,
  pdf: Components.interfaces.nsIFilePicker.filterPDF
};

const lazy = {};
XPCOMUtils.defineLazyGlobalGetters(lazy, ["File", "FileReader"]);

function writeUint8ToPath(path, bytes) {
  const file = Components.classes["@mozilla.org/file/local;1"]
    .createInstance(Components.interfaces.nsIFile);
  file.initWithPath(path);
  const fos = Components.classes["@mozilla.org/network/file-output-stream;1"]
    .createInstance(Components.interfaces.nsIFileOutputStream);
  // PR_WRONLY | PR_CREATE_FILE | PR_TRUNCATE
  const flags = 0x02 | 0x08 | 0x20;
  fos.init(file, flags, 0o600, 0);
  const bos = Components.classes["@mozilla.org/binaryoutputstream;1"]
    .createInstance(Components.interfaces.nsIBinaryOutputStream);
  bos.setOutputStream(fos);
  bos.writeByteArray(Array.from(bytes), bytes.length);
  bos.close();
  fos.close();
}

function joinPath(folderPath, fileName) {
  if (PathUtils && typeof PathUtils.join === "function") {
    return PathUtils.join(folderPath, fileName);
  }
  const sep = folderPath.indexOf("\\") >= 0 ? "\\" : "/";
  return folderPath.replace(/[/\\]+$/, "") + sep + fileName.replace(/^[/\\]+/, "");
}

function makeTask() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

async function picker({ displayPath, mode, filters, defaultName }) {
  const task = makeTask();
  const fp = Components.classes["@mozilla.org/filepicker;1"]
    .createInstance(Components.interfaces.nsIFilePicker);
  const win = windowMediator.getMostRecentWindow(null);
  if (!win) {
    task.resolve(null);
    return task.promise;
  }
  fp.init(win.browsingContext, null, mode);

  if (displayPath) {
    try {
      const displayDirectory = Components.classes["@mozilla.org/file/local;1"]
        .createInstance(Components.interfaces.nsIFile);
      displayDirectory.initWithPath(displayPath);
      fp.displayDirectory = displayDirectory;
    } catch (_) {}
  }

  const validFilters = Array.isArray(filters) && filters.length > 0
    ? filters.filter(f => typeof f === "string" && FILTERS[f])
    : [];
  if (validFilters.length === 0) {
    fp.appendFilters(Components.interfaces.nsIFilePicker.filterAll);
  } else {
    validFilters.forEach(f => fp.appendFilters(FILTERS[f]));
  }

  if (defaultName) fp.defaultString = defaultName;

  fp.open(rv => {
    if (rv === Components.interfaces.nsIFilePicker.returnCancel) {
      task.resolve(null);
    } else if (mode === Components.interfaces.nsIFilePicker.modeGetFolder) {
      task.resolve(fp.file);
    } else {
      task.resolve(fp.file);
    }
  });
  return task.promise;
}

var todotxtFileAccess = class extends ExtensionCommon.ExtensionAPI {
  getAPI(context) {
    return {
      todotxtFileAccess: {
        async readFileWithPicker(options = {}) {
          const opts = {
            displayPath: options.displayPath || null,
            filters: options.filters || ["text", "all"],
            defaultName: options.defaultFileName || "todo.txt"
          };
          const nativeFile = await picker({
            ...opts,
            mode: Components.interfaces.nsIFilePicker.modeOpen
          });
          if (!nativeFile) return { error: "Canceled by user" };
          const file = await lazy.File.createFromNsIFile(nativeFile);
          const folderPath = nativeFile.parent.path;
          const fileName = nativeFile.leafName;
          return { file, folderPath, fileName };
        },

        async getFolderWithPicker(options) {
          const o = options || {};
          const opts = {
            displayPath: o.displayPath || null,
            filters: ["all"],
            defaultName: null
          };
          const nativeFolder = await picker({
            ...opts,
            mode: Components.interfaces.nsIFilePicker.modeGetFolder
          });
          if (!nativeFolder) return { error: "Canceled by user" };
          return { folderPath: nativeFolder.path };
        },

        async writeFileWithPicker(file, options = {}) {
          const opts = {
            displayPath: options.displayPath || null,
            filters: options.filters || ["text", "all"],
            defaultName: options.defaultFileName || "done.txt"
          };
          const nativeFile = await picker({
            ...opts,
            mode: Components.interfaces.nsIFilePicker.modeSave
          });
          if (!nativeFile) return { error: "Canceled by user" };
          const buffer = await file.arrayBuffer();
          writeUint8ToPath(nativeFile.path, new Uint8Array(buffer));
          const readBack = Components.classes["@mozilla.org/file/local;1"]
            .createInstance(Components.interfaces.nsIFile);
          readBack.initWithPath(nativeFile.path);
          const resultFile = await lazy.File.createFromNsIFile(readBack);
          return {
            file: resultFile,
            folderPath: readBack.parent.path,
            fileName: readBack.leafName
          };
        },

        async readFile(folderPath, fileName) {
          const path = joinPath(folderPath, fileName);
          const nativeFile = Components.classes["@mozilla.org/file/local;1"]
            .createInstance(Components.interfaces.nsIFile);
          nativeFile.initWithPath(path);
          if (!nativeFile.exists()) {
            const err = new Error("File not found");
            err.code = "FILE_NOT_FOUND";
            throw err;
          }
          const file = await lazy.File.createFromNsIFile(nativeFile);
          return {
            file,
            folderPath: nativeFile.parent.path,
            fileName: nativeFile.leafName
          };
        },

        async writeFile(file, folderPath, fileName) {
          const path = joinPath(folderPath, fileName);
          const buffer = await file.arrayBuffer();
          writeUint8ToPath(path, new Uint8Array(buffer));
          const nativeFile = Components.classes["@mozilla.org/file/local;1"]
            .createInstance(Components.interfaces.nsIFile);
          nativeFile.initWithPath(path);
          const resultFile = await lazy.File.createFromNsIFile(nativeFile);
          return {
            file: resultFile,
            folderPath: nativeFile.parent.path,
            fileName: nativeFile.leafName
          };
        }
      }
    };
  }
};
