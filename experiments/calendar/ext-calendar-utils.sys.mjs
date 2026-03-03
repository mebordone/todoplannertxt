/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
/*
 * From webext-experiments/calendar. Required by ext-calendar-calendars.js and
 * ext-calendar-items.js. Handles ICAL/jCal parsing and conversion.
 */

const { Cc, Ci } = Components;
var { ExtensionUtils: { ExtensionError, promiseEvent } } = ChromeUtils.importESModule("resource://gre/modules/ExtensionUtils.sys.mjs");
var { cal } = ChromeUtils.importESModule("resource:///modules/calendar/calUtils.sys.mjs");
var { CalEvent } = ChromeUtils.importESModule("resource:///modules/CalEvent.sys.mjs");
var { CalTodo } = ChromeUtils.importESModule("resource:///modules/CalTodo.sys.mjs");
var { ExtensionParent } = ChromeUtils.importESModule("resource://gre/modules/ExtensionParent.sys.mjs");
var { default: ICAL } = ChromeUtils.importESModule("resource:///modules/calendar/Ical.sys.mjs");

export function isOwnCalendar(calendar, extension) {
  return calendar.superCalendar.type == "ext-" + extension.id;
}

export function unwrapCalendar(calendar) {
  let unwrapped = calendar.wrappedJSObject;
  if (unwrapped.mUncachedCalendar) {
    unwrapped = unwrapped.mUncachedCalendar.wrappedJSObject;
  }
  return unwrapped;
}

export function getResolvedCalendarById(extension, id) {
  let calendar;
  if (id.endsWith("#cache")) {
    const cached = cal.manager.getCalendarById(id.substring(0, id.length - 6));
    calendar = cached && isOwnCalendar(cached, extension) && cached.wrappedJSObject.mCachedCalendar;
  } else {
    calendar = cal.manager.getCalendarById(id);
  }
  if (!calendar) {
    throw new ExtensionError("Invalid calendar: " + id);
  }
  return calendar;
}

export function getCachedCalendar(calendar) {
  return calendar.wrappedJSObject.mCachedCalendar || calendar;
}

export function isCachedCalendar(id) {
  return id.endsWith("#cache");
}

export function convertCalendar(extension, calendar) {
  if (!calendar) {
    return null;
  }
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

function parseJcalData(jcalComp) {
  function generateItem(jcalSubComp) {
    let item;
    if (jcalSubComp.name == "vevent") {
      item = new CalEvent();
    } else if (jcalSubComp.name == "vtodo") {
      item = new CalTodo();
    } else {
      throw new ExtensionError("Invalid item component");
    }
    const comp = cal.icsService.createIcalComponent(jcalSubComp.name);
    comp.wrappedJSObject.innerObject = jcalSubComp;
    item.icalComponent = comp;
    return item;
  }
  if (jcalComp.name == "vevent" || jcalComp.name == "vtodo") {
    return generateItem(jcalComp);
  }
  if (jcalComp.name == "vcalendar") {
    const exceptions = [];
    let parent;
    for (const subComp of jcalComp.getAllSubcomponents()) {
      if (subComp.name != "vevent" && subComp.name != "vtodo") {
        continue;
      }
      if (subComp.hasProperty("recurrence-id")) {
        exceptions.push(subComp);
        continue;
      }
      if (parent) {
        throw new ExtensionError("Cannot parse more than one parent item");
      }
      parent = generateItem(subComp);
    }
    if (!parent) {
      throw new ExtensionError("TODO need to retrieve a parent item from storage");
    }
    if (exceptions.length && !parent.recurrenceInfo) {
      throw new ExtensionError("Exceptions were supplied to a non-recurring item");
    }
    for (const exception of exceptions) {
      const excItem = generateItem(exception);
      if (excItem.id != parent.id || parent.isEvent() != excItem.isEvent()) {
        throw new ExtensionError("Exception does not relate to parent item");
      }
      parent.recurrenceInfo.modifyException(excItem, true);
    }
    return parent;
  }
  throw new ExtensionError("Don't know how to handle component type " + jcalComp.name);
}

export function propsToItem(props) {
  let jcalComp;
  if (props.format == "ical") {
    try {
      jcalComp = new ICAL.Component(ICAL.parse(props.item));
    } catch (e) {
      throw new ExtensionError("Could not parse iCalendar", { cause: e });
    }
    return parseJcalData(jcalComp);
  }
  if (props.format == "jcal") {
    try {
      jcalComp = new ICAL.Component(props.item);
    } catch (e) {
      throw new ExtensionError("Could not parse jCal", { cause: e });
    }
    return parseJcalData(jcalComp);
  }
  throw new ExtensionError("Invalid item format: " + props.format);
}

export function convertItem(item, options, extension) {
  if (!item) {
    return null;
  }
  const props = {};
  if (item.isEvent()) {
    props.type = "event";
  } else if (item.isTodo()) {
    props.type = "task";
  } else {
    throw new ExtensionError(`Encountered unknown item type for ${item.calendar.id}/${item.id}`);
  }
  props.id = item.id;
  props.calendarId = item.calendar.superCalendar.id;
  const recId = item.recurrenceId?.getInTimezone(cal.timezoneService.UTC)?.icalString;
  if (recId) {
    const jcalId = ICAL.design.icalendar.value[recId.length == 8 ? "date" : "date-time"].fromICAL(recId);
    props.instance = jcalId;
  }
  if (isOwnCalendar(item.calendar, extension)) {
    props.metadata = {};
    const cache = getCachedCalendar(item.calendar);
    try {
      props.metadata = JSON.parse(cache.getMetaData(item.id)) ?? {};
    } catch {
      // Ignore json parse errors
    }
  }
  if (options?.returnFormat) {
    props.format = options.returnFormat;
    const serializer = Cc["@mozilla.org/calendar/ics-serializer;1"].createInstance(Ci.calIIcsSerializer);
    serializer.addItems([item]);
    const icalString = serializer.serializeToString();
    switch (options.returnFormat) {
      case "ical":
        props.item = icalString;
        break;
      case "jcal":
        props.item = ICAL.parse(icalString);
        break;
      default:
        throw new ExtensionError("Invalid format specified: " + options.returnFormat);
    }
  }
  return props;
}

export function convertAlarm(item, alarm) {
  const ALARM_RELATED_MAP = {
    [Ci.calIAlarm.ALARM_RELATED_ABSOLUTE]: "absolute",
    [Ci.calIAlarm.ALARM_RELATED_START]: "start",
    [Ci.calIAlarm.ALARM_RELATED_END]: "end",
  };
  return {
    itemId: item.id,
    action: alarm.action.toLowerCase(),
    date: alarm.alarmDate?.icalString,
    offset: alarm.offset?.icalString,
    related: ALARM_RELATED_MAP[alarm.related],
  };
}
