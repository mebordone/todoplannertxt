/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const todotxtLogger = {
  notif: {},
  debugMode: false,

  getEpoch() {
    return Date.now();
  },

  getDateTime() {
    return new Date().toLocaleString();
  },

  debug(src, msg) {
    if (this.debugMode) {
      let output = "(" + this.getDateTime() + ") ";
      if (src) output += "[" + src + "] ";
      if (msg) output += msg;
      console.log("[Todo.txt]", output);
    }
  },

  error(src, error) {
    this.showNotification(error && error.message ? error.message : String(error));
    let output = "(" + this.getDateTime() + ") ";
    if (src) output += "[" + src + "] ";
    output += "ERROR: " + (error && error.message ? error.message : String(error));
    if (this.debugMode && error && error.stack) output += "\n" + error.stack;
    console.error("[Todo.txt]", output);
  },

  resetNotifications() {
    this.notif = {};
  },

  showNotification(message) {
    const seconds = 30 * 1000;
    if (this.notif[message] == null) {
      this.notif[message] = { count: 0, time: this.getEpoch() + seconds };
    } else {
      if (this.getEpoch() < this.notif[message].time) return;
      const count = this.notif[message].count + 1;
      this.notif[message].count = count;
      this.notif[message].time = this.getEpoch() + seconds * Math.pow(2, count);
    }
    if (typeof browser !== "undefined" && browser.notifications && browser.notifications.create) {
      browser.notifications.create({
        type: "basic",
        title: "Todo.txt",
        message: message,
        iconUrl: browser.runtime.getURL("icons/32.png")
      }).catch(() => {
        console.warn("[Todo.txt]", message);
      });
    } else {
      console.warn("[Todo.txt]", message);
    }
  }
};

typeof globalThis !== "undefined" ? (globalThis.todotxtLogger = todotxtLogger) : (self.todotxtLogger = todotxtLogger);
