/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const fileUtil = {
  getTodoPath(prefs) {
    if (!prefs) return null;
    if (prefs.todoFolderPath) {
      return { folderPath: prefs.todoFolderPath, fileName: prefs.todoFileName || "todo.txt" };
    }
    if (prefs.todoFolderId || prefs.todoFileName) {
      return { folderId: prefs.todoFolderId, fileName: prefs.todoFileName || "todo.txt" };
    }
    return null;
  },

  getDonePath(prefs) {
    if (!prefs) return null;
    if (prefs.doneFolderPath) {
      return { folderPath: prefs.doneFolderPath, fileName: prefs.doneFileName || "done.txt" };
    }
    if (prefs.doneFolderId || prefs.doneFileName) {
      return { folderId: prefs.doneFolderId, fileName: prefs.doneFileName || "done.txt" };
    }
    return null;
  },

  _usesFolderPath(path) {
    return path && path.folderPath !== undefined && path.folderPath !== null;
  },

  _getException() {
    return (typeof self !== "undefined" && self.exception) || (typeof globalThis !== "undefined" && globalThis.exception) || null;
  },

  _classifyFsaError(err) {
    const msg = (err && err.message) ? String(err.message).toLowerCase() : "";
    const name = (err && err.name) ? String(err.name) : "";
    if (/not found|no such file|enoent/i.test(msg) || name === "NotFoundError") return "FILE_NOT_FOUND";
    if (/permission|locked|access denied|ebusy|eacces/i.test(msg) || name === "SecurityError") return "FILE_ACCESS";
    if (/network|remote|ns_error|unreachable/i.test(msg)) return "FILE_NETWORK_OR_REMOTE";
    return null;
  },

  _mapFsaError(err, fileName, isWrite) {
    const exc = this._getException();
    if (!exc) return err;
    const kind = this._classifyFsaError(err);
    if (kind === "FILE_NOT_FOUND") return exc.FILE_NOT_FOUND(fileName);
    if (kind === "FILE_ACCESS") return isWrite ? exc.FILE_CANNOT_WRITE(fileName) : exc.FILE_LOCKED(fileName);
    if (kind === "FILE_NETWORK_OR_REMOTE") return exc.FILE_NETWORK_OR_REMOTE(err && err.message ? String(err.message) : undefined);
    return err;
  },

  _validatePath(path) {
    if (!path || !path.fileName) throw new Error("Invalid path");
    const usePath = this._usesFolderPath(path);
    if (usePath && !path.folderPath) throw new Error("Invalid path");
    if (!usePath && !path.folderId) throw new Error("Invalid path");
  },

  async _textFromResult(result) {
    if (!result) return "";
    if (result.file && typeof result.file.text === "function") return await result.file.text();
    if (typeof result.content === "string") return result.content;
    if (result.file && typeof result.file === "string") return result.file;
    return "";
  },

  async readFile(fsaApi, path) {
    this._validatePath(path);
    const usePath = this._usesFolderPath(path);
    const fileName = path.fileName || "";
    try {
      const result = usePath
        ? await fsaApi.readFile(path.folderPath, path.fileName)
        : await fsaApi.readFile(path.folderId, path.fileName);
      const str = String(await this._textFromResult(result) || "");
      return str.endsWith("\n") ? str : str + "\n";
    } catch (err) {
      throw this._mapFsaError(err, fileName, false);
    }
  },

  async writeFile(fsaApi, path, content) {
    this._validatePath(path);
    const usePath = this._usesFolderPath(path);
    const fileName = path.fileName || "";
    const blob = typeof content === "string" ? new Blob([content], { type: "text/plain;charset=utf-8" }) : content;
    try {
      if (usePath) await fsaApi.writeFile(blob, path.folderPath, path.fileName);
      else await fsaApi.writeFile(blob, path.folderId, path.fileName);
    } catch (err) {
      throw this._mapFsaError(err, fileName, true);
    }
  },

  async readTodo(fsaApi, prefs) {
    const todoPath = this.getTodoPath(prefs);
    const donePath = this.getDonePath(prefs);
    let todoContent = "";
    let doneContent = "";
    if (todoPath) todoContent = await this.readFile(fsaApi, todoPath);
    if (donePath) doneContent = await this.readFile(fsaApi, donePath);
    return todoContent + doneContent;
  },

  async writeTodo(fsaApi, prefs, todo) {
    const exc = this._getException();
    if (!exc) throw new Error("Exception module not available");
    if (prefs && prefs.readOnly === true) throw exc.READ_ONLY_MODE();
    const todoPath = this.getTodoPath(prefs);
    const donePath = this.getDonePath(prefs);
    if (!todoPath || !donePath) throw exc.FILES_NOT_SPECIFIED();
    const todoRender = todo.render({ isComplete: false });
    const doneRender = todo.render({ isComplete: true }, [{ field: "completedDate", direction: "desc" }]);
    await this.writeFile(fsaApi, todoPath, todoRender);
    await this.writeFile(fsaApi, donePath, doneRender);
  },

  async calculateMD5(fsaApi, prefs) {
    const md5fn = self.md5 || globalThis.md5;
    if (!md5fn) return Promise.reject(new Error("MD5 not available"));
    const content = await this.readTodo(fsaApi, prefs);
    return md5fn(content);
  }
};

/* istanbul ignore next: export boilerplate, not business logic */
if (typeof globalThis !== "undefined") globalThis.fileUtil = fileUtil; else if (typeof self !== "undefined") self.fileUtil = fileUtil;
/* istanbul ignore next: export boilerplate */
if (typeof module !== "undefined" && module.exports) module.exports = { fileUtil };
