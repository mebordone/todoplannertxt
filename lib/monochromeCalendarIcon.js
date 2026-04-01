/* This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. */

const SVG_NS = "http://www.w3.org/2000/svg";

/**
 * @returns {object} Immutable geometry for the outline calendar icon (stroke-only).
 */
function getMonochromeCalendarIconSpec() {
  return Object.freeze({
    viewBox: "0 0 16 16",
    frame: Object.freeze({ x: 2, y: 3.5, width: 12, height: 10.5, rx: 1 }),
    horizontalLine: Object.freeze({ x1: 2, y1: 6.5, x2: 14, y2: 6.5 }),
    hooks: Object.freeze([
      Object.freeze({ x1: 5.5, y1: 1.5, x2: 5.5, y2: 4 }),
      Object.freeze({ x1: 10.5, y1: 1.5, x2: 10.5, y2: 4 })
    ]),
    strokeWidth: 1.2,
    stroke: "currentColor",
    fill: "none"
  });
}

function applyFrameToRect(rect, frame, spec) {
  rect.setAttribute("x", String(frame.x));
  rect.setAttribute("y", String(frame.y));
  rect.setAttribute("width", String(frame.width));
  rect.setAttribute("height", String(frame.height));
  rect.setAttribute("rx", String(frame.rx));
  rect.setAttribute("fill", spec.fill);
  rect.setAttribute("stroke", spec.stroke);
  rect.setAttribute("stroke-width", String(spec.strokeWidth));
}

function applyLine(line, seg, spec) {
  line.setAttribute("x1", String(seg.x1));
  line.setAttribute("y1", String(seg.y1));
  line.setAttribute("x2", String(seg.x2));
  line.setAttribute("y2", String(seg.y2));
  line.setAttribute("stroke", spec.stroke);
  line.setAttribute("stroke-width", String(spec.strokeWidth));
}

/**
 * Build an SVG element (DOM). Tests can inject createElementNS (e.g. mock).
 *
 * @param {number} sizePx
 * @param {typeof Document.prototype.createElementNS} createElementNS
 * @returns {SVGElement}
 */
function buildMonochromeCalendarSvg(sizePx, createElementNS) {
  const spec = getMonochromeCalendarIconSpec();
  const svg = createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", spec.viewBox);
  svg.setAttribute("width", String(sizePx));
  svg.setAttribute("height", String(sizePx));
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("focusable", "false");
  if (svg.style) svg.style.display = "block";

  const rect = createElementNS(SVG_NS, "rect");
  applyFrameToRect(rect, spec.frame, spec);
  svg.appendChild(rect);

  const divider = createElementNS(SVG_NS, "line");
  applyLine(divider, spec.horizontalLine, spec);
  svg.appendChild(divider);

  spec.hooks.forEach((seg) => {
    const hook = createElementNS(SVG_NS, "line");
    applyLine(hook, seg, spec);
    svg.appendChild(hook);
  });

  return svg;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    SVG_NS,
    getMonochromeCalendarIconSpec,
    buildMonochromeCalendarSvg,
    applyFrameToRect,
    applyLine
  };
} else if (typeof globalThis !== "undefined") {
  globalThis.getMonochromeCalendarIconSpec = getMonochromeCalendarIconSpec;
  globalThis.buildMonochromeCalendarSvg = buildMonochromeCalendarSvg;
}
