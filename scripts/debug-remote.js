#!/usr/bin/env node
/**
 * Conecta al puerto de depuración remota de Thunderbird (o Firefox)
 * para listar objetivos depurables y mostrar URLs WebSocket.
 *
 * Uso:
 *   node scripts/debug-remote.js [puerto]
 *   REMOTE_DEBUG_PORT=9222 node scripts/debug-remote.js
 *
 * Cómo habilitar el servidor en Thunderbird:
 *   thunderbird -start-debugger-server [puerto]
 * Por defecto el puerto es 6000. En versiones recientes puede usarse
 * también --remote-debugging-port=9222 si está disponible.
 */

const http = require("http");

const DEFAULT_PORT = parseInt(process.env.REMOTE_DEBUG_PORT, 10) || 6000;
const HOST = process.env.REMOTE_DEBUG_HOST || "127.0.0.1";

function getPort() {
  const arg = process.argv[2];
  if (arg !== undefined) {
    const p = parseInt(arg, 10);
    if (!Number.isNaN(p)) return p;
  }
  return DEFAULT_PORT;
}

function fetchJson(host, port, path) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        host,
        port,
        path,
        method: "GET",
        timeout: 5000
      },
      (res) => {
        let body = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => { body += chunk; });
        res.on("end", () => {
          try {
            resolve(JSON.parse(body));
          } catch (e) {
            reject(new Error(`Invalid JSON from ${path}: ${e.message}`));
          }
        });
      }
    );
    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("Connection timeout"));
    });
    req.end();
  });
}

function printTargets(list) {
  if (!Array.isArray(list)) {
    console.log("(no list array)");
    return;
  }
  console.log("\n--- Objetivos depurables ---\n");
  list.forEach((t, i) => {
    const type = t.type || "unknown";
    const title = (t.title || t.name || "").slice(0, 60);
    const url = (t.url || "").slice(0, 70);
    const ws = t.webSocketDebuggerUrl || t.ws;
    console.log(`${i + 1}. [${type}] ${title || "(sin título)"}`);
    if (url) console.log(`   URL: ${url}`);
    if (ws) console.log(`   WebSocket: ${ws}`);
    console.log("");
  });
}

async function main() {
  const port = getPort();
  const base = `http://${HOST}:${port}`;

  console.log(`Conectando a ${base} ...\n`);

  try {
    const version = await fetchJson(HOST, port, "/json/version");
    console.log("--- /json/version ---");
    console.log(JSON.stringify(version, null, 2));
    if (version.webSocketDebuggerUrl) {
      console.log("\nWebSocket (browser):", version.webSocketDebuggerUrl);
    }
  } catch (e) {
    console.log("No se pudo obtener /json/version:", e.message);
    console.log("Comprueba que Thunderbird esté en marcha con depuración remota:");
    console.log("  thunderbird -start-debugger-server", port);
    console.log("  (o --remote-debugging-port=" + port + " si tu versión lo soporta)\n");
  }

  try {
    const list = await fetchJson(HOST, port, "/json/list");
    if (list && (Array.isArray(list) || list.length !== undefined)) {
      const arr = Array.isArray(list) ? list : [list];
      printTargets(arr);
    } else {
      console.log("--- /json/list ---");
      console.log(JSON.stringify(list, null, 2));
    }
  } catch (e) {
    console.log("No se pudo obtener /json/list:", e.message);
  }

  console.log("\nPara depurar desde Chrome DevTools:");
  console.log("  1. Abre chrome://inspect en Chrome.");
  console.log("  2. Configura 'Discover network targets' con host:port si hace falta.");
  console.log("  3. O usa la URL WebSocket anterior con una herramienta que hable CDP.\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
