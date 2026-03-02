/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const { Cc, Ci } = Components;
const PROVIDER_ID = "{00C350E2-3F65-11E5-8E8B-FBF81D5D46B0}";

var calendarTodoTxt = class extends ExtensionCommon.ExtensionAPI {
  getAPI(context) {
    return {
      calendarTodoTxt: {}
    };
  }

  onStartup() {
    try {
      if (typeof ChromeUtils.import !== "function") {
        return;
      }
      const { cal } = ChromeUtils.import("resource://calendar/modules/calUtils.jsm");
      const ioService = Cc["@mozilla.org/network/io-service;1"].getService(Ci.nsIIOService);
      const uri = ioService.newURI("todotxt://_unused", null, null);
      const calManager = Cc["@mozilla.org/calendar/manager;1"].getService(Ci.calICalendarManager);

      let found = false;
      const calendars = calManager.getCalendars({});
      for (let i = 0; i < calendars.length; i++) {
        if (calendars[i].providerID === PROVIDER_ID) {
          found = true;
          this._calendar = calendars[i];
          break;
        }
      }

      if (!found) {
        try {
          const newCal = calManager.createCalendar("todotxt", uri);
          if (newCal) {
            newCal.name = "Todo.txt";
            calManager.registerCalendar(newCal);
            this._calendar = newCal;
          }
        } catch (e) {
          console.warn("[Todo.txt] Calendar registration failed (expected in WebExtension without legacy component):", e.message);
        }
      }
    } catch (e) {
      console.warn("[Todo.txt] Calendar startup:", e.message);
    }
  }

  onShutdown() {
    try {
      if (this._calendar) {
        const calManager = Cc["@mozilla.org/calendar/manager;1"].getService(Ci.calICalendarManager);
        calManager.removeCalendar(this._calendar);
      }
    } catch (e) {
      console.warn("[Todo.txt] Calendar shutdown:", e.message);
    }
    let Services = globalThis.Services;
    if (!Services && typeof ChromeUtils !== "undefined" && typeof ChromeUtils.import === "function") {
      try {
        Services = ChromeUtils.import("resource://gre/modules/Services.jsm").Services;
      } catch (_) {}
    }
    if (Services && Services.obs) Services.obs.notifyObservers(null, "startupcache-invalidate", null);
  }
};
