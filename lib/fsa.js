/* File System Access: uses built-in experiment (no external add-on required).
 * Falls back to File Access Manager proxy if built-in API is not available. */

const FSA_PROXY_ID = "file-system-access@addons.thunderbird.net";

function useBuiltInFileAccess() {
  try {
    const api = typeof browser !== "undefined" ? browser : chrome;
    return !!(api && api.todotxtFileAccess);
  } catch (_) {
    return false;
  }
}

async function proxyRequest(request) {
  const api = typeof browser !== "undefined" ? browser : chrome;
  let error = null;
  try {
    const rv = await api.runtime.sendMessage(FSA_PROXY_ID, request);
    if (rv && rv.error) error = rv.error;
    else return rv;
  } catch (e) {
    error = (e && e.message) || "Failed to send request.";
  }
  throw new Error("fsa." + (request.command || "") + "(): " + error);
}

function buildBuiltInFsaApi() {
  const api = (typeof browser !== "undefined" ? browser : chrome).todotxtFileAccess;
  return {
    getVersion() {
      return Promise.resolve("built-in");
    },
    async readFileWithPicker(permissions, options) {
      const opts = {
        filters: (options && options.filters) || ["text", "all"],
        defaultFileName: (options && options.defaultFileName) || "todo.txt"
      };
      const result = await api.readFileWithPicker(opts);
      if (result && result.error) throw new Error(result.error);
      return {
        file: result.file,
        folderPath: result.folderPath,
        fileName: result.fileName
      };
    },
    writeFileWithPicker(file, permissions, options) {
      const opts = {
        filters: (options && options.filters) || ["text", "all"],
        defaultFileName: (options && options.defaultFileName) || "done.txt"
      };
      return api.writeFileWithPicker(file, opts);
    },
    getFolderWithPicker() {
      return Promise.reject(new Error("Not implemented in built-in mode"));
    },
    getPermissions(folderPath, fileName) {
      return Promise.resolve({ read: true, write: true });
    },
    async readFile(folderPath, fileName) {
      const result = await api.readFile(folderPath, fileName);
      return { file: result.file, folderPath: result.folderPath };
    },
    writeFile(file, folderPath, fileName) {
      return api.writeFile(file, folderPath, fileName);
    }
  };
}

function buildProxyFsaApi() {
  return {
    getVersion() {
      return proxyRequest({ command: "getVersion" });
    },
    readFileWithPicker(permissions, options) {
      return proxyRequest({
        command: "readFileWithPicker",
        read: !!(permissions && permissions.read),
        write: !!(permissions && permissions.write),
        filters: options && options.filters,
        defaultFileName: options && options.defaultFileName,
        defaultFolderId: options && options.defaultFolderId
      });
    },
    writeFileWithPicker(file, permissions, options) {
      return proxyRequest({
        command: "writeFileWithPicker",
        file,
        read: !!(permissions && permissions.read),
        write: !!(permissions && permissions.write),
        filters: options && options.filters,
        defaultFileName: options && options.defaultFileName,
        defaultFolderId: options && options.defaultFolderId
      });
    },
    getFolderWithPicker(permissions, options) {
      return proxyRequest({
        command: "getFolderWithPicker",
        read: !!(permissions && permissions.read),
        write: !!(permissions && permissions.write),
        defaultFolderId: options && options.defaultFolderId
      });
    },
    getPermissions(folderId, fileName) {
      if (!folderId || !fileName) throw new Error("fsa.getPermissions(): Missing folderId or fileName");
      return proxyRequest({ command: "getPermissions", folderId, fileName });
    },
    async readFile(folderId, fileName) {
      if (!folderId || !fileName) throw new Error("fsa.readFile(): Missing folderId or fileName");
      const result = await proxyRequest({ command: "readFile", folderId, fileName });
      if (result && result.file && typeof result.file.text === "function") {
        return { folderId: result.folderId, file: result.file };
      }
      return result;
    },
    writeFile(file, folderId, fileName) {
      if (!file || !folderId || !fileName) throw new Error("fsa.writeFile(): Missing file, folderId or fileName");
      return proxyRequest({ command: "writeFile", file, folderId, fileName });
    }
  };
}

const fsaApi = useBuiltInFileAccess() ? buildBuiltInFsaApi() : buildProxyFsaApi();
const usesBuiltIn = useBuiltInFileAccess();

(typeof globalThis !== "undefined" ? globalThis : self).fsaApi = fsaApi;
(typeof globalThis !== "undefined" ? globalThis : self).fsaUsesBuiltIn = usesBuiltIn;
