/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const calendarMappings = require("../../background/calendarMappings.js");

describe("calendarMappings", () => {
  describe("escapeIcalText", () => {
    it("returns empty string for null or non-string", () => {
      expect(calendarMappings.escapeIcalText(null)).toBe("");
      expect(calendarMappings.escapeIcalText(undefined)).toBe("");
      expect(calendarMappings.escapeIcalText(123)).toBe("");
    });
    it("escapes backslash, semicolon, comma and newline", () => {
      expect(calendarMappings.escapeIcalText("a\\b;c,d\ne")).toBe("a\\\\b\\;c\\,d\\ne");
    });
  });

  describe("toIcalDate", () => {
    it("returns null for invalid or short input", () => {
      expect(calendarMappings.toIcalDate(null)).toBe(null);
      expect(calendarMappings.toIcalDate("")).toBe(null);
      expect(calendarMappings.toIcalDate("2025-1-1")).toBe(null);
    });
    it("returns YYYYMMDD for YYYY-MM-DD", () => {
      expect(calendarMappings.toIcalDate("2025-12-01")).toBe("20251201");
    });
  });

  describe("todoPlainToVtodoIcal", () => {
    it("produces valid VCALENDAR with VTODO", () => {
      const plain = { id: "tid-1", title: "Task one", dueDate: "2025-12-01", isCompleted: false, categories: ["+work"] };
      const ical = calendarMappings.todoPlainToVtodoIcal(plain);
      expect(ical).toContain("BEGIN:VCALENDAR");
      expect(ical).toContain("BEGIN:VTODO");
      expect(ical).toContain("UID:tid-1");
      expect(ical).toContain("SUMMARY:Task one");
      expect(ical).toContain("DUE;VALUE=DATE:20251201");
      expect(ical).toContain("STATUS:NEEDS-ACTION");
      expect(ical).toContain("CATEGORIES:work");
      expect(ical).toContain("END:VTODO");
      expect(ical).toContain("END:VCALENDAR");
    });
    it("includes COMPLETED and completed date when isCompleted", () => {
      const plain = { id: "t2", title: "Done", dueDate: "2025-11-15", isCompleted: true, completedDate: "2025-11-14", categories: [] };
      const ical = calendarMappings.todoPlainToVtodoIcal(plain);
      expect(ical).toContain("STATUS:COMPLETED");
      expect(ical).toMatch(/COMPLETED:20251114T120000Z/);
    });
    it("does not map @context (categories only from +project)", () => {
      const plain = { id: "t3", title: "Title", dueDate: "2025-12-01", categories: ["+project1"], location: "home" };
      const ical = calendarMappings.todoPlainToVtodoIcal(plain);
      expect(ical).toContain("CATEGORIES:project1");
      expect(ical).not.toContain("home");
    });
    it("generates UID when id is missing", () => {
      const plain = { title: "No id", dueDate: "2025-12-01" };
      const ical = calendarMappings.todoPlainToVtodoIcal(plain);
      expect(ical).toMatch(/UID:todotxt-[a-z0-9]+-\d+/);
    });
  });

  describe("vtodoIcalToTodoPlain", () => {
    it("parses SUMMARY, DUE, STATUS, UID", () => {
      const ical = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "BEGIN:VTODO",
        "UID:my-uid",
        "SUMMARY:My task",
        "DUE;VALUE=DATE:20251201",
        "STATUS:NEEDS-ACTION",
        "END:VTODO",
        "END:VCALENDAR",
      ].join("\r\n");
      const plain = calendarMappings.vtodoIcalToTodoPlain(ical);
      expect(plain.id).toBe("my-uid");
      expect(plain.title).toBe("My task");
      expect(plain.dueDate).toBe("2025-12-01");
      expect(plain.isCompleted).toBe(false);
    });
    it("parses COMPLETED and STATUS:COMPLETED", () => {
      const ical = [
        "BEGIN:VTODO",
        "UID:x",
        "SUMMARY:Done task",
        "DUE;VALUE=DATE:20251101",
        "STATUS:COMPLETED",
        "COMPLETED:20251101T120000Z",
        "END:VTODO",
      ].join("\r\n");
      const plain = calendarMappings.vtodoIcalToTodoPlain(ical);
      expect(plain.isCompleted).toBe(true);
      expect(plain.completedDate).toBe("2025-11-01");
    });
    it("parses CATEGORIES to +project form", () => {
      const ical = "BEGIN:VTODO\r\nUID:y\r\nSUMMARY:T\r\nCATEGORIES:work,personal\r\nEND:VTODO";
      const plain = calendarMappings.vtodoIcalToTodoPlain(ical);
      expect(plain.categories).toEqual(["+work", "+personal"]);
    });
    it("returns empty shape for null or non-string", () => {
      const empty = { id: "", title: "", dueDate: null, isCompleted: false, completedDate: null, categories: [] };
      expect(calendarMappings.vtodoIcalToTodoPlain(null)).toEqual(empty);
      expect(calendarMappings.vtodoIcalToTodoPlain("")).toEqual(empty);
    });
  });

  describe("round-trip", () => {
    it("todoPlainToVtodoIcal then vtodoIcalToTodoPlain preserves id, title, dueDate, isCompleted, categories", () => {
      const plain = { id: "r1", title: "Round trip", dueDate: "2025-12-25", isCompleted: false, categories: ["+x", "+y"] };
      const ical = calendarMappings.todoPlainToVtodoIcal(plain);
      const back = calendarMappings.vtodoIcalToTodoPlain(ical);
      expect(back.id).toBe(plain.id);
      expect(back.title).toBe(plain.title);
      expect(back.dueDate).toBe(plain.dueDate);
      expect(back.isCompleted).toBe(plain.isCompleted);
      expect(back.categories).toEqual(plain.categories);
    });
  });

  describe("getVtodoIcalFromCalendarItem", () => {
    it("returns item.item when it is a string containing VTODO", () => {
      const item = { item: "BEGIN:VCALENDAR\r\nBEGIN:VTODO\r\nUID:1\r\nEND:VTODO\r\nEND:VCALENDAR" };
      expect(calendarMappings.getVtodoIcalFromCalendarItem(item)).toBe(item.item);
    });
    it("returns null when item is null or item.item does not contain VTODO", () => {
      expect(calendarMappings.getVtodoIcalFromCalendarItem(null)).toBe(null);
      expect(calendarMappings.getVtodoIcalFromCalendarItem({ item: "BEGIN:VCALENDAR\r\nEND:VCALENDAR" })).toBe(null);
    });
  });
});
