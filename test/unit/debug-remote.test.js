/**
 * Tests para scripts/debug-remote.js.
 * Levanta un servidor HTTP que simula el endpoint de depuración remota
 * y ejecuta el script contra él para verificar salida.
 */

const http = require("http");
const { spawn } = require("child_process");
const path = require("path");

const SCRIPT_PATH = path.join(__dirname, "../../scripts/debug-remote.js");

function createMockDebugServer() {
  const versionPayload = {
    Browser: "Test Thunderbird",
    "Protocol-Version": "1.0",
    webSocketDebuggerUrl: "ws://127.0.0.1:6000/browser"
  };
  const listPayload = [
    { type: "page", title: "Todo.txt – Popup", url: "moz-extension://xxx/popup.html", webSocketDebuggerUrl: "ws://127.0.0.1:6000/page1" },
    { type: "page", title: "Background", url: "about:blank", webSocketDebuggerUrl: "ws://127.0.0.1:6000/bg" }
  ];

  return http.createServer((req, res) => {
    res.setHeader("Content-Type", "application/json");
    if (req.url === "/json/version") {
      res.end(JSON.stringify(versionPayload));
      return;
    }
    if (req.url === "/json/list") {
      res.end(JSON.stringify(listPayload));
      return;
    }
    res.statusCode = 404;
    res.end("Not found");
  });
}

function runScript(port) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [SCRIPT_PATH, String(port)], {
      cwd: path.join(__dirname, "../.."),
      env: { ...process.env, REMOTE_DEBUG_PORT: "" }
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("close", (code) => resolve({ code, stdout, stderr }));
    child.on("error", reject);
  });
}

describe("debug-remote.js", () => {
  let server;
  let port;

  beforeAll((done) => {
    server = createMockDebugServer();
    server.listen(0, "127.0.0.1", () => {
      port = server.address().port;
      done();
    });
  });

  afterAll((done) => {
    if (server) server.close(done);
  });

  test("script runs and exits with 0 when server responds", async () => {
    const { code, stdout } = await runScript(port);
    expect(code).toBe(0);
    expect(stdout).toContain("Conectando a");
    expect(stdout).toContain("/json/version");
    expect(stdout).toContain("Test Thunderbird");
    expect(stdout).toContain("webSocketDebuggerUrl");
    expect(stdout).toContain("Objetivos depurables");
    expect(stdout).toContain("Todo.txt – Popup");
    expect(stdout).toContain("Background");
    expect(stdout).toContain("chrome://inspect");
  });

  test("script shows version and list when server is up", async () => {
    const { stdout } = await runScript(port);
    expect(stdout).toContain("--- /json/version ---");
    expect(stdout).toContain("ws://127.0.0.1:6000/browser");
    expect(stdout).toContain("[page]");
  });
});

describe("debug-remote.js when no server", () => {
  test("script exits with 0 and shows helpful message when connection refused", async () => {
    const { code, stdout } = await runScript(99991);
    expect(code).toBe(0);
    expect(stdout).toContain("No se pudo obtener /json/version");
    expect(stdout).toContain("thunderbird -start-debugger-server");
    expect(stdout).toContain("chrome://inspect");
  });
});
