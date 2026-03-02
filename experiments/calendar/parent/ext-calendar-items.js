/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
/* From webext-experiments/calendar - parent script for calendar.items API */
var compClasses = Components.classes;
var compIfaces = Components.interfaces;

var { ExtensionCommon: { ExtensionAPI, EventManager } } = ChromeUtils.importESModule("resource://gre/modules/ExtensionCommon.sys.mjs");
var { ExtensionUtils: { ExtensionError } } = ChromeUtils.importESModule("resource://gre/modules/ExtensionUtils.sys.mjs");
var { cal } = ChromeUtils.importESModule("resource:///modules/calendar/calUtils.sys.mjs");
var { CalEvent } = ChromeUtils.importESModule("resource:///modules/CalEvent.sys.mjs");
var { CalTodo } = ChromeUtils.importESModule("resource:///modules/CalTodo.sys.mjs");
var { default: ICAL } = ChromeUtils.importESModule("resource:///modules/calendar/Ical.sys.mjs");

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
function getCachedCalendar(calendar) {
  return calendar.wrappedJSObject.mCachedCalendar || calendar;
}
function isCachedCalendar(id) {
  return id.endsWith("#cache");
}
function parseJcalData(jcalComp) {
  function generateItem(jcalSubComp) {
    let item;
    if (jcalSubComp.name == "vevent") item = new CalEvent();
    else if (jcalSubComp.name == "vtodo") item = new CalTodo();
    else throw new ExtensionError("Invalid item component");
    const comp = cal.icsService.createIcalComponent(jcalSubComp.name);
    comp.wrappedJSObject.innerObject = jcalSubComp;
    item.icalComponent = comp;
    return item;
  }
  if (jcalComp.name == "vevent" || jcalComp.name == "vtodo") return generateItem(jcalComp);
  if (jcalComp.name == "vcalendar") {
    const exceptions = [];
    let parent;
    for (const subComp of jcalComp.getAllSubcomponents()) {
      if (subComp.name != "vevent" && subComp.name != "vtodo") continue;
      if (subComp.hasProperty("recurrence-id")) { exceptions.push(subComp); continue; }
      if (parent) throw new ExtensionError("Cannot parse more than one parent item");
      parent = generateItem(subComp);
    }
    if (!parent) throw new ExtensionError("TODO need to retrieve a parent item from storage");
    if (exceptions.length && !parent.recurrenceInfo) throw new ExtensionError("Exceptions were supplied to a non-recurring item");
    for (const exception of exceptions) {
      const excItem = generateItem(exception);
      if (excItem.id != parent.id || parent.isEvent() != excItem.isEvent()) throw new ExtensionError("Exception does not relate to parent item");
      parent.recurrenceInfo.modifyException(excItem, true);
    }
    return parent;
  }
  throw new ExtensionError("Don't know how to handle component type " + jcalComp.name);
}
function propsToItem(props) {
  let jcalComp;
  if (props.format == "ical") {
    try { jcalComp = new ICAL.Component(ICAL.parse(props.item)); } catch (e) { throw new ExtensionError("Could not parse iCalendar", { cause: e }); }
    return parseJcalData(jcalComp);
  }
  if (props.format == "jcal") {
    try { jcalComp = new ICAL.Component(props.item); } catch (e) { throw new ExtensionError("Could not parse jCal", { cause: e }); }
    return parseJcalData(jcalComp);
  }
  throw new ExtensionError("Invalid item format: " + props.format);
}
function convertItem(item, options, extension) {
  if (!item) return null;
  const props = {};
  if (item.isEvent()) props.type = "event";
  else if (item.isTodo()) props.type = "task";
  else throw new ExtensionError("Encountered unknown item type for " + item.calendar.id + "/" + item.id);
  props.id = item.id;
  props.calendarId = item.calendar.superCalendar.id;
  const recId = item.recurrenceId && item.recurrenceId.getInTimezone(cal.timezoneService.UTC) && item.recurrenceId.getInTimezone(cal.timezoneService.UTC).icalString;
  if (recId) {
    const jcalId = ICAL.design.icalendar.value[recId.length == 8 ? "date" : "date-time"].fromICAL(recId);
    props.instance = jcalId;
  }
  if (isOwnCalendar(item.calendar, extension)) {
    props.metadata = {};
    const cache = getCachedCalendar(item.calendar);
    try { props.metadata = JSON.parse(cache.getMetaData(item.id)) || {}; } catch (_) {}
  }
  if (options && options.returnFormat) {
    props.format = options.returnFormat;
    const serializer = compClasses["@mozilla.org/calendar/ics-serializer;1"].createInstance(compIfaces.calIIcsSerializer);
    serializer.addItems([item]);
    const icalString = serializer.serializeToString();
    switch (options.returnFormat) {
      case "ical": props.item = icalString; break;
      case "jcal": props.item = ICAL.parse(icalString); break;
      default: throw new ExtensionError("Invalid format specified: " + options.returnFormat);
    }
  }
  return props;
}
function convertAlarm(item, alarm) {
  const ALARM_RELATED_MAP = {
    [compIfaces.calIAlarm.ALARM_RELATED_ABSOLUTE]: "absolute",
    [compIfaces.calIAlarm.ALARM_RELATED_START]: "start",
    [compIfaces.calIAlarm.ALARM_RELATED_END]: "end",
  };
  return {
    itemId: item.id,
    action: alarm.action.toLowerCase(),
    date: alarm.alarmDate && alarm.alarmDate.icalString,
    offset: alarm.offset && alarm.offset.icalString,
    related: ALARM_RELATED_MAP[alarm.related],
  };
}

this.calendar_items = class extends ExtensionAPI {
  getAPI(context) {
    return {
      calendar: {
        items: {
          async query(queryProps) {
            let calendars = [];
            if (typeof queryProps.calendarId == "string") {
              calendars = [getResolvedCalendarById(context.extension, queryProps.calendarId)];
            } else if (Array.isArray(queryProps.calendarId)) {
              calendars = queryProps.calendarId.map(calendarId => getResolvedCalendarById(context.extension, calendarId));
            } else {
              calendars = cal.manager.getCalendars().filter(calendar => !calendar.getProperty("disabled"));
            }
            let calendarItems;
            if (queryProps.id) {
              calendarItems = await Promise.all(calendars.map(calendar => calendar.getItem(queryProps.id)));
            } else {
              let filter = compIfaces.calICalendar.ITEM_FILTER_COMPLETED_ALL;
              if (queryProps.type == "event") {
                filter |= compIfaces.calICalendar.ITEM_FILTER_TYPE_EVENT;
              } else if (queryProps.type == "task") {
                filter |= compIfaces.calICalendar.ITEM_FILTER_TYPE_TODO;
              } else {
                filter |= compIfaces.calICalendar.ITEM_FILTER_TYPE_ALL;
              }
              if (queryProps.expand) {
                filter |= compIfaces.calICalendar.ITEM_FILTER_CLASS_OCCURRENCES;
              }
              const rangeStart = queryProps.rangeStart ? cal.createDateTime(queryProps.rangeStart) : null;
              const rangeEnd = queryProps.rangeEnd ? cal.createDateTime(queryProps.rangeEnd) : null;
              calendarItems = await Promise.all(calendars.map(calendar =>
                calendar.getItemsAsArray(filter, queryProps.limit ?? 0, rangeStart, rangeEnd)
              ));
            }
            return calendarItems.flat().map(item => convertItem(item, queryProps, context.extension));
          },
          async get(calendarId, id, options) {
            const calendar = getResolvedCalendarById(context.extension, calendarId);
            const item = await calendar.getItem(id);
            return convertItem(item, options, context.extension);
          },
          async create(calendarId, createProperties) {
            const calendar = getResolvedCalendarById(context.extension, calendarId);
            const item = propsToItem(createProperties);
            item.calendar = calendar.superCalendar;
            if (createProperties.metadata && isOwnCalendar(calendar, context.extension)) {
              const cache = getCachedCalendar(calendar);
              cache.setMetaData(item.id, JSON.stringify(createProperties.metadata));
            }
            let createdItem;
            if (isCachedCalendar(calendarId)) {
              createdItem = await calendar.modifyItem(item, null);
            } else {
              createdItem = await calendar.adoptItem(item);
            }
            return convertItem(createdItem, createProperties, context.extension);
          },
          async update(calendarId, id, updateProperties) {
            const calendar = getResolvedCalendarById(context.extension, calendarId);
            const oldItem = await calendar.getItem(id);
            if (!oldItem) {
              throw new ExtensionError("Could not find item " + id);
            }
            if (oldItem.isEvent()) {
              updateProperties.type = "event";
            } else if (oldItem.isTodo()) {
              updateProperties.type = "task";
            } else {
              throw new ExtensionError(`Encountered unknown item type for ${calendarId}/${id}`);
            }
            const newItem = propsToItem(updateProperties);
            newItem.calendar = calendar.superCalendar;
            if (updateProperties.metadata && isOwnCalendar(calendar, context.extension)) {
              const cache = getCachedCalendar(calendar);
              cache.setMetaData(newItem.id, JSON.stringify(updateProperties.metadata));
            }
            const modifiedItem = await calendar.modifyItem(newItem, oldItem);
            return convertItem(modifiedItem, updateProperties, context.extension);
          },
          async move(fromCalendarId, id, toCalendarId) {
            if (fromCalendarId == toCalendarId) return;
            const fromCalendar = cal.manager.getCalendarById(fromCalendarId);
            const toCalendar = cal.manager.getCalendarById(toCalendarId);
            const item = await fromCalendar.getItem(id);
            if (!item) {
              throw new ExtensionError("Could not find item " + id);
            }
            if (isOwnCalendar(toCalendar, context.extension) && isOwnCalendar(fromCalendar, context.extension)) {
              const fromCache = getCachedCalendar(fromCalendar);
              const toCache = getCachedCalendar(toCalendar);
              toCache.setMetaData(item.id, fromCache.getMetaData(item.id));
            }
            await toCalendar.addItem(item);
            await fromCalendar.deleteItem(item);
          },
          async remove(calendarId, id) {
            const calendar = getResolvedCalendarById(context.extension, calendarId);
            const item = await calendar.getItem(id);
            if (!item) {
              throw new ExtensionError("Could not find item " + id);
            }
            await calendar.deleteItem(item);
          },
          async getCurrent(options) {
            try {
              const item = context.browsingContext.embedderElement.ownerGlobal.calendarItem;
              return convertItem(item, options, context.extension);
            } catch (e) {
              return null;
            }
          },
          onCreated: new EventManager({
            context,
            name: "calendar.items.onCreated",
            register: (fire, options) => {
              const observer = cal.createAdapter(compIfaces.calIObserver, {
                onAddItem: item => {
                  fire.sync(convertItem(item, options, context.extension));
                },
              });
              cal.manager.addCalendarObserver(observer);
              return () => cal.manager.removeCalendarObserver(observer);
            },
          }).api(),
          onUpdated: new EventManager({
            context,
            name: "calendar.items.onUpdated",
            register: (fire, options) => {
              const observer = cal.createAdapter(compIfaces.calIObserver, {
                onModifyItem: (newItem) => {
                  const changeInfo = {};
                  fire.sync(convertItem(newItem, options, context.extension), changeInfo);
                },
              });
              cal.manager.addCalendarObserver(observer);
              return () => cal.manager.removeCalendarObserver(observer);
            },
          }).api(),
          onRemoved: new EventManager({
            context,
            name: "calendar.items.onRemoved",
            register: fire => {
              const observer = cal.createAdapter(compIfaces.calIObserver, {
                onDeleteItem: item => {
                  const calId = item.calendar && item.calendar.superCalendar ? item.calendar.superCalendar.id : (item.calendar && item.calendar.id);
                  const calendarId = calId != null ? String(calId) : "";
                  const id = item.id != null ? String(item.id) : "";
                  fire.sync(calendarId, id);
                },
              });
              cal.manager.addCalendarObserver(observer);
              return () => cal.manager.removeCalendarObserver(observer);
            },
          }).api(),
          onAlarm: new EventManager({
            context,
            name: "calendar.items.onAlarm",
            register: (fire, options) => {
              const observer = {
                QueryInterface: ChromeUtils.generateQI(["calIAlarmServiceObserver"]),
                onAlarm(item, alarm) {
                  fire.sync(convertItem(item, options, context.extension), convertAlarm(item, alarm));
                },
                onRemoveAlarmsByItem() {},
                onRemoveAlarmsByCalendar() {},
                onAlarmsLoaded() {},
              };
              const alarmsvc = compClasses["@mozilla.org/calendar/alarm-service;1"].getService(compIfaces.calIAlarmService);
              alarmsvc.addObserver(observer);
              return () => alarmsvc.removeObserver(observer);
            },
          }).api(),
        },
      },
    };
  }
};
