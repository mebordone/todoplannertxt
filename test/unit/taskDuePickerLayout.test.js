/* This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. */

const {
  computeTaskDuePickerLayout,
  MARGIN,
  PICKER_HEIGHT,
  MIN_WIDTH,
  MAX_WIDTH
} = require("../../lib/taskDuePickerLayout");

function rect(left, top, w, h) {
  return { left, top, width: w, height: h, bottom: top + h };
}

describe("computeTaskDuePickerLayout", () => {
  const vw = 800;
  const vh = 600;

  it("exports layout constants", () => {
    expect(MARGIN).toBe(8);
    expect(PICKER_HEIGHT).toBe(32);
    expect(MIN_WIDTH).toBe(120);
    expect(MAX_WIDTH).toBe(200);
  });

  it("centers in viewport when anchor is null", () => {
    const box = computeTaskDuePickerLayout(null, vw, vh);
    expect(box.width).toBe(200);
    expect(box.height).toBe(PICKER_HEIGHT);
    expect(box.left).toBe((vw - box.width) / 2);
    expect(box.top).toBe((vh - box.height) / 2);
  });

  it("centers when anchor is undefined", () => {
    const box = computeTaskDuePickerLayout(undefined, vw, vh);
    expect(box.left).toBe((vw - 200) / 2);
    expect(box.top).toBe((vh - PICKER_HEIGHT) / 2);
  });

  it("centers when anchor is invalid (missing bottom)", () => {
    const bad = { left: 0, top: 0, width: 26, height: 26 };
    const box = computeTaskDuePickerLayout(bad, vw, vh);
    expect(box.left).toBe((vw - 200) / 2);
  });

  it("centers when anchor is invalid (missing width)", () => {
    const bad = { left: 0, top: 0, height: 26, bottom: 26 };
    const box = computeTaskDuePickerLayout(bad, vw, vh);
    expect(box.top).toBe((vh - PICKER_HEIGHT) / 2);
  });

  it("places below anchor when there is room", () => {
    const r = rect(400, 100, 26, 26);
    const box = computeTaskDuePickerLayout(r, vw, vh);
    expect(box.top).toBe(r.bottom + MARGIN);
    expect(box.left).toBe(r.left + r.width / 2 - box.width / 2);
  });

  it("places above anchor when below would overflow viewport", () => {
    const r = rect(400, vh - 40, 26, 26);
    const box = computeTaskDuePickerLayout(r, vw, vh);
    expect(box.top).toBe(r.top - MARGIN - PICKER_HEIGHT);
  });

  it("uses viewport center when below overflows and above would leave top < margin", () => {
    const r = rect(100, 10, 26, 560);
    expect(r.bottom).toBeGreaterThan(vh - MARGIN - MARGIN - PICKER_HEIGHT);
    const box = computeTaskDuePickerLayout(r, vw, vh);
    expect(box.top).toBe((vh - PICKER_HEIGHT) / 2);
    expect(box.left).toBe((vw - box.width) / 2);
  });

  it("clamps left when anchor is near right edge", () => {
    const r = rect(vw - 20, 200, 26, 26);
    const box = computeTaskDuePickerLayout(r, vw, vh);
    expect(box.left).toBeLessThanOrEqual(vw - box.width - MARGIN);
    expect(box.left).toBeGreaterThanOrEqual(MARGIN);
  });

  it("clamps left when anchor is near left edge", () => {
    const r = rect(0, 200, 26, 26);
    const box = computeTaskDuePickerLayout(r, vw, vh);
    expect(box.left).toBeGreaterThanOrEqual(MARGIN);
  });

  it("uses MIN_WIDTH when viewport is narrow", () => {
    const narrow = 100;
    const box = computeTaskDuePickerLayout(null, narrow, vh);
    expect(box.width).toBe(MIN_WIDTH);
    expect(box.left).toBe(MARGIN);
  });

  it("clamps top when viewport is very short", () => {
    const short = 50;
    const box = computeTaskDuePickerLayout(null, vw, short);
    expect(box.top).toBeGreaterThanOrEqual(MARGIN);
    expect(box.top).toBeLessThanOrEqual(short - PICKER_HEIGHT - MARGIN);
    expect(box.height).toBe(PICKER_HEIGHT);
  });

  it("clamps horizontal position for narrow viewport with anchor", () => {
    const r = rect(50, 20, 26, 26);
    const narrowW = 130;
    const box = computeTaskDuePickerLayout(r, narrowW, vh);
    expect(box.width).toBe(MIN_WIDTH);
    expect(box.left).toBe(MARGIN);
  });
});
