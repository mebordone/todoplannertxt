/* This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. */

const {
  getMonochromeCalendarIconSpec,
  buildMonochromeCalendarSvg,
  applyFrameToRect,
  applyLine,
  SVG_NS
} = require("../../lib/monochromeCalendarIcon");

function createMockCreateElementNS() {
  const log = [];
  function createElementNS(ns, tag) {
    const attrs = {};
    const children = [];
    const el = {
      tag,
      ns,
      attrs,
      children,
      style: {},
      setAttribute(k, v) {
        attrs[k] = v;
      },
      appendChild(c) {
        children.push(c);
      }
    };
    log.push({ op: "create", ns, tag });
    return el;
  }
  return { createElementNS, log };
}

describe("getMonochromeCalendarIconSpec", () => {
  it("returns stable geometry", () => {
    const s = getMonochromeCalendarIconSpec();
    expect(s.viewBox).toBe("0 0 16 16");
    expect(s.frame).toEqual({ x: 2, y: 3.5, width: 12, height: 10.5, rx: 1 });
    expect(s.horizontalLine).toEqual({ x1: 2, y1: 6.5, x2: 14, y2: 6.5 });
    expect(s.hooks).toHaveLength(2);
    expect(s.strokeWidth).toBe(1.2);
    expect(s.stroke).toBe("currentColor");
    expect(s.fill).toBe("none");
  });
});

describe("buildMonochromeCalendarSvg", () => {
  it("builds svg with rect and three lines", () => {
    const { createElementNS } = createMockCreateElementNS();
    const svg = buildMonochromeCalendarSvg(14, createElementNS);
    expect(svg.tag).toBe("svg");
    expect(svg.ns).toBe(SVG_NS);
    expect(svg.attrs.viewBox).toBe("0 0 16 16");
    expect(svg.attrs.width).toBe("14");
    expect(svg.attrs.height).toBe("14");
    expect(svg.children).toHaveLength(4);
    expect(svg.children[0].tag).toBe("rect");
    expect(svg.children[1].tag).toBe("line");
    expect(svg.children[2].tag).toBe("line");
    expect(svg.children[3].tag).toBe("line");
    expect(svg.children[0].attrs.stroke).toBe("currentColor");
    expect(svg.children[0].attrs.fill).toBe("none");
  });

  it("sets hook line endpoints from spec", () => {
    const { createElementNS } = createMockCreateElementNS();
    const svg = buildMonochromeCalendarSvg(11, createElementNS);
    const hook1 = svg.children[2].attrs;
    expect(hook1.x1).toBe("5.5");
    expect(hook1.y1).toBe("1.5");
    expect(hook1.x2).toBe("5.5");
    expect(hook1.y2).toBe("4");
  });
});

describe("applyFrameToRect and applyLine", () => {
  it("applyFrameToRect sets rect attributes", () => {
    const spec = getMonochromeCalendarIconSpec();
    const rect = { attrs: {}, setAttribute(k, v) { this.attrs[k] = v; } };
    applyFrameToRect(rect, spec.frame, spec);
    expect(rect.attrs.x).toBe("2");
    expect(rect.attrs.rx).toBe("1");
  });

  it("applyLine sets line attributes", () => {
    const spec = getMonochromeCalendarIconSpec();
    const line = { attrs: {}, setAttribute(k, v) { this.attrs[k] = v; } };
    applyLine(line, spec.horizontalLine, spec);
    expect(line.attrs.x2).toBe("14");
    expect(line.attrs.stroke).toBe("currentColor");
  });
});
