/* Test setup: ensure globalThis and minimal browser mock for modules that check typeof browser */
if (typeof globalThis === "undefined") {
  global.globalThis = global;
}
if (typeof self === "undefined") {
  global.self = global;
}
if (typeof browser === "undefined") {
  global.browser = { i18n: { getMessage: (id) => id } };
}
