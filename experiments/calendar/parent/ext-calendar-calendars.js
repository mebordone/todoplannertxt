/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
/* From webext-experiments/calendar - parent script for calendar.calendars API */

var compIfaces = Components.interfaces;
var { ExtensionCommon: { ExtensionAPI, EventManager } } = ChromeUtils.importESModule("resource://gre/modules/ExtensionCommon.sys.mjs");
var { ExtensionUtils: { ExtensionError } } = ChromeUtils.importESModule("resource://gre/modules/ExtensionUtils.sys.mjs");
var { cal } = ChromeUtils.importESModule("resource:///modules/calendar/calUtils.sys.mjs");

function urlMatches(calendarUri, urlPattern) {
  const spec = calendarUri && calendarUri.spec ? calendarUri.spec : String(calendarUri);
  if (!urlPattern || typeof urlPattern !== "string") return true;
  if (urlPattern.indexOf("*") < 0) return spec === urlPattern;
  const re = new RegExp("^" + urlPattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\\\*/g, ".*") + "$");
  return re.test(spec);
}

function nameMatches(calendarName, namePattern) {
  if (!namePattern || typeof namePattern !== "string") return true;
  const name = String(calendarName || "");
  if (namePattern.indexOf("*") < 0) return name === namePattern;
  const re = new RegExp("^" + namePattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\\\*/g, ".*") + "$");
  return re.test(name);
}

function isOwnCalendar(calendar, extension) {
  return calendar.superCalendar.type == "ext-" + extension.id;
}
function unwrapCalendar(calendar) {
  let unwrapped = calendar.wrappedJSObject;
  if (unwrapped.mUncachedCalendar) unwrapped = unwrapped.mUncachedCalendar.wrappedJSObject;
  return unwrapped;
}
function getResolvedCalendarById(extension, id) {
  let calendar;
  if (id.endsWith("#cache")) {
    const cached = cal.manager.getCalendarById(id.substring(0, id.length - 6));
    calendar = cached && isOwnCalendar(cached, extension) && cached.wrappedJSObject.mCachedCalendar;
  } else {
    calendar = cal.manager.getCalendarById(id);
  }
  if (!calendar) throw new ExtensionError("Invalid calendar: " + id);
  return calendar;
}
function convertCalendar(extension, calendar) {
  if (!calendar) return null;
  const props = {
    id: calendar.id,
    type: calendar.type,
    name: calendar.name,
    url: calendar.uri.spec,
    readOnly: calendar.readOnly,
    visible: !!calendar.getProperty("calendar-main-in-composite"),
    showReminders: !calendar.getProperty("suppressAlarms"),
    enabled: !calendar.getProperty("disabled"),
    color: calendar.getProperty("color") || "#A8C2E1",
  };
  if (isOwnCalendar(calendar, extension)) {
    props.cacheId = calendar.superCalendar.id + "#cache";
    props.capabilities = unwrapCalendar(calendar.superCalendar).capabilities;
  }
  return props;
}

this.calendar_calendars = class extends ExtensionAPI {
  getAPI(context) {
    return {
      calendar: {
        calendars: {
          async query({ type, url, name, color, readOnly, enabled, visible }) {
            const calendars = cal.manager.getCalendars();
            return calendars
              .filter(calendar => {
                let matches = true;
                if (type && calendar.type != type) matches = false;
                if (url && !urlMatches(calendar.uri, url)) matches = false;
                if (name && !nameMatches(calendar.name, name)) matches = false;
                if (color && color != calendar.getProperty("color")) matches = false;
                if (enabled != null && calendar.getProperty("disabled") == enabled) matches = false;
                if (visible != null && calendar.getProperty("calendar-main-in-composite") != visible) matches = false;
                if (readOnly != null && calendar.readOnly != readOnly) matches = false;
                return matches;
              })
              .map(calendar => convertCalendar(context.extension, calendar));
          },
          async get(id) {
            if (id.endsWith("#cache")) {
              const calendar = unwrapCalendar(cal.manager.getCalendarById(id.substring(0, id.length - 6)));
              const own = calendar.offlineStorage && isOwnCalendar(calendar, context.extension);
              return own ? convertCalendar(context.extension, calendar.offlineStorage) : null;
            }
            const calendar = cal.manager.getCalendarById(id);
            return convertCalendar(context.extension, calendar);
          },
          async create(createProperties) {
            let calendar = cal.manager.createCalendar(
              createProperties.type,
              Services.io.newURI(createProperties.url)
            );
            if (!calendar) {
              throw new ExtensionError(`Calendar type ${createProperties.type} is unknown`);
            }
            calendar.name = createProperties.name;
            if (typeof createProperties.color != "undefined") {
              calendar.setProperty("color", createProperties.color);
            }
            if (typeof createProperties.visible != "undefined") {
              calendar.setProperty("calendar-main-in-composite", createProperties.visible);
            }
            if (typeof createProperties.showReminders != "undefined") {
              calendar.setProperty("suppressAlarms", !createProperties.showReminders);
            }
            cal.manager.registerCalendar(calendar);
            calendar = cal.manager.getCalendarById(calendar.id);
            return convertCalendar(context.extension, calendar);
          },
          async update(id, updateProperties) {
            const calendar = cal.manager.getCalendarById(id);
            if (!calendar) {
              throw new ExtensionError(`Invalid calendar id: ${id}`);
            }
            if (updateProperties.capabilities && !isOwnCalendar(calendar, context.extension)) {
              throw new ExtensionError("Cannot update capabilities for foreign calendars");
            }
            if (updateProperties.url && !isOwnCalendar(calendar, context.extension)) {
              throw new ExtensionError("Cannot update url for foreign calendars");
            }
            if (updateProperties.url) {
              calendar.uri = Services.io.newURI(updateProperties.url);
            }
            if (updateProperties.enabled != null) {
              calendar.setProperty("disabled", !updateProperties.enabled);
            }
            if (updateProperties.visible != null) {
              calendar.setProperty("calendar-main-in-composite", updateProperties.visible);
            }
            if (updateProperties.showReminders != null) {
              calendar.setProperty("suppressAlarms", !updateProperties.showReminders);
            }
            for (const prop of ["readOnly", "name", "color"]) {
              if (updateProperties[prop] != null) {
                calendar.setProperty(prop, updateProperties[prop]);
              }
            }
            if (updateProperties.capabilities) {
              const unwrappedCalendar = calendar.wrappedJSObject.mUncachedCalendar.wrappedJSObject;
              unwrappedCalendar.capabilities = Object.assign({}, unwrappedCalendar.capabilities, updateProperties.capabilities);
              calendar.setProperty("extensionCapabilities", JSON.stringify(unwrappedCalendar.capabilities));
            }
            if (updateProperties.lastError !== undefined) {
              if (updateProperties.lastError === null) {
                calendar.setProperty("currentStatus", Cr.NS_ERROR_FAILURE);
                calendar.setProperty("lastErrorMessage", updateProperties.lastError);
              } else {
                calendar.setProperty("currentStatus", Cr.NS_OK);
                calendar.setProperty("lastErrorMessage", "");
              }
            }
            return convertCalendar(context.extension, calendar);
          },
          async remove(id) {
            const calendar = cal.manager.getCalendarById(id);
            if (!calendar) {
              throw new ExtensionError(`Invalid calendar id: ${id}`);
            }
            cal.manager.unregisterCalendar(calendar);
          },
          async clear(id) {
            if (!id.endsWith("#cache")) {
              throw new ExtensionError("Cannot clear non-cached calendar");
            }
            const offlineStorage = getResolvedCalendarById(context.extension, id);
            const calendar = cal.manager.getCalendarById(id.substring(0, id.length - 6));
            if (!isOwnCalendar(calendar, context.extension)) {
              throw new ExtensionError("Cannot clear foreign calendar");
            }
            await new Promise((resolve, reject) => {
              const listener = {
                onDeleteCalendar(aCalendar, aStatus, aDetail) {
                  if (Components.isSuccessCode(aStatus)) {
                    resolve();
                  } else {
                    reject(aDetail);
                  }
                },
              };
              offlineStorage.QueryInterface(compIfaces.calICalendarProvider).deleteCalendar(offlineStorage, listener);
            });
            calendar.wrappedJSObject.mObservers.notify("onLoad", [calendar]);
          },
          synchronize(ids) {
            let calendars = [];
            if (ids) {
              if (!Array.isArray(ids)) ids = [ids];
              for (const id of ids) {
                const calendar = cal.manager.getCalendarById(id);
                if (!calendar) throw new ExtensionError(`Invalid calendar id: ${id}`);
                calendars.push(calendar);
              }
            } else {
              for (const calendar of cal.manager.getCalendars()) {
                if (calendar.getProperty("calendar-main-in-composite")) {
                  calendars.push(calendar);
                }
              }
            }
            for (const calendar of calendars) {
              if (!calendar.getProperty("disabled") && calendar.canRefresh) {
                calendar.refresh();
              }
            }
          },
          onCreated: new EventManager({
            context,
            name: "calendar.calendars.onCreated",
            register: fire => {
              const observer = {
                QueryInterface: ChromeUtils.generateQI(["calICalendarManagerObserver"]),
                onCalendarRegistered(calendar) {
                  fire.sync(convertCalendar(context.extension, calendar));
                },
                onCalendarUnregistering() {},
                onCalendarDeleting() {},
              };
              cal.manager.addObserver(observer);
              return () => cal.manager.removeObserver(observer);
            },
          }).api(),
          onUpdated: new EventManager({
            context,
            name: "calendar.calendars.onUpdated",
            register: fire => {
              const observer = cal.createAdapter(compIfaces.calIObserver, {
                onPropertyChanged(calendar, name, value) {
                  const converted = convertCalendar(context.extension, calendar);
                  switch (name) {
                    case "name":
                    case "color":
                    case "readOnly":
                      fire.sync(converted, { [name]: value });
                      break;
                    case "uri":
                      fire.sync(converted, { url: value?.spec });
                      break;
                    case "suppressAlarms":
                      fire.sync(converted, { showReminders: !value });
                      break;
                    case "calendar-main-in-composite":
                      fire.sync(converted, { visible: value });
                      break;
                    case "disabled":
                      fire.sync(converted, { enabled: !value });
                      break;
                  }
                },
              });
              cal.manager.addCalendarObserver(observer);
              return () => cal.manager.removeCalendarObserver(observer);
            },
          }).api(),
          onRemoved: new EventManager({
            context,
            name: "calendar.calendars.onRemoved",
            register: fire => {
              const observer = {
                QueryInterface: ChromeUtils.generateQI(["calICalendarManagerObserver"]),
                onCalendarRegistered() {},
                onCalendarUnregistering(calendar) {
                  fire.sync(calendar.id);
                },
                onCalendarDeleting() {},
              };
              cal.manager.addObserver(observer);
              return () => cal.manager.removeObserver(observer);
            },
          }).api(),
        },
      },
    };
  }
};
