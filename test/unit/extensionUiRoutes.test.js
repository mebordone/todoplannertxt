/* This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. */

const {
  OPTIONS_PAGE,
  TAB_PAGE,
  optionsPageRelativePath,
  tabPageRelativePath,
  extensionPageUrl
} = require("../../lib/extensionUiRoutes");

describe("extensionUiRoutes", () => {
  it("exports path constants", () => {
    expect(OPTIONS_PAGE).toBe("options/options.html");
    expect(TAB_PAGE).toBe("tab/tab.html");
  });

  it("optionsPageRelativePath and tabPageRelativePath return stable paths", () => {
    expect(optionsPageRelativePath()).toBe(OPTIONS_PAGE);
    expect(tabPageRelativePath()).toBe(TAB_PAGE);
  });

  it("extensionPageUrl delegates to getURL with correct path", () => {
    const getURL = jest.fn((p) => "moz-extension://x/" + p);
    expect(extensionPageUrl(getURL, "options")).toBe("moz-extension://x/options/options.html");
    expect(extensionPageUrl(getURL, "tab")).toBe("moz-extension://x/tab/tab.html");
    expect(getURL).toHaveBeenCalledTimes(2);
  });

  it("extensionPageUrl throws on invalid key", () => {
    expect(() => extensionPageUrl((p) => p, "popup")).toThrow(/Invalid extension page key/);
  });
});
