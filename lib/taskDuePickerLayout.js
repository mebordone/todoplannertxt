/* This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. */

const MARGIN = 8;
const PICKER_HEIGHT = 32;
const MIN_WIDTH = 120;
const MAX_WIDTH = 200;

/**
 * Compute fixed position and size for a hidden <input type="date"> so the native
 * picker opens near the task row button (viewport coordinates).
 *
 * @param {DOMRectReadOnly | { left: number, top: number, width: number, height: number, bottom: number } | null | undefined} anchorRect
 * @param {number} viewportWidth
 * @param {number} viewportHeight
 * @returns {{ left: number, top: number, width: number, height: number }}
 */
function computeTaskDuePickerLayout(anchorRect, viewportWidth, viewportHeight) {
  const margin = MARGIN;
  const h = PICKER_HEIGHT;
  let w = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, viewportWidth - margin * 2));
  let left;
  let top;

  if (
    anchorRect &&
    typeof anchorRect.left === "number" &&
    typeof anchorRect.top === "number" &&
    typeof anchorRect.width === "number" &&
    typeof anchorRect.height === "number" &&
    typeof anchorRect.bottom === "number"
  ) {
    const r = anchorRect;
    left = r.left + r.width / 2 - w / 2;
    top = r.bottom + margin;
    if (top + h > viewportHeight - margin) {
      top = r.top - margin - h;
    }
    if (top < margin) {
      top = (viewportHeight - h) / 2;
      left = (viewportWidth - w) / 2;
    }
  } else {
    left = (viewportWidth - w) / 2;
    top = (viewportHeight - h) / 2;
  }

  left = Math.max(margin, Math.min(left, viewportWidth - w - margin));
  top = Math.max(margin, Math.min(top, viewportHeight - h - margin));

  return { left, top, width: w, height: h };
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    computeTaskDuePickerLayout,
    MARGIN,
    PICKER_HEIGHT,
    MIN_WIDTH,
    MAX_WIDTH
  };
} else if (typeof globalThis !== "undefined") {
  globalThis.computeTaskDuePickerLayout = computeTaskDuePickerLayout;
}
