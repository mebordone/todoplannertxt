/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const { filterPendingOnly } = require("../../lib/pendingOnlyFilter.js");

describe("filterPendingOnly", () => {
  test("returns only items with isCompleted !== true", () => {
    const items = [
      { id: "1", title: "Pending", isCompleted: false },
      { id: "2", title: "Done", isCompleted: true },
      { id: "3", title: "Also pending", isCompleted: false }
    ];
    const result = filterPendingOnly(items);
    expect(result).toHaveLength(2);
    expect(result.every((i) => !i.isCompleted)).toBe(true);
    expect(result.map((i) => i.id)).toEqual(["1", "3"]);
  });

  test("returns empty array when all items are completed", () => {
    const items = [
      { id: "1", isCompleted: true },
      { id: "2", isCompleted: true }
    ];
    expect(filterPendingOnly(items)).toEqual([]);
  });

  test("returns all items when none are completed", () => {
    const items = [
      { id: "1", isCompleted: false },
      { id: "2", isCompleted: false }
    ];
    const result = filterPendingOnly(items);
    expect(result).toHaveLength(2);
    expect(result).toEqual(items);
  });

  test("treats missing isCompleted as pending", () => {
    const items = [{ id: "1", title: "No flag" }];
    const result = filterPendingOnly(items);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("1");
  });

  test("returns empty array for non-array input", () => {
    expect(filterPendingOnly(null)).toEqual([]);
    expect(filterPendingOnly(undefined)).toEqual([]);
    expect(filterPendingOnly("")).toEqual([]);
  });
});
