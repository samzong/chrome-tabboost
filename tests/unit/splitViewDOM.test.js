import { initSplitViewDOM, removeSplitViewDOM } from "../../src/js/splitView/splitViewDOM.js";

describe("splitViewDOM lifecycle", () => {
  beforeAll(() => {
    window.scrollTo = jest.fn();
  });

  beforeEach(() => {
    document.body.innerHTML = `
      <main id="app">
        <h1>TabBoost Fixture</h1>
        <p>Original page content</p>
      </main>
    `;
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("creates split view container and relocates original content", () => {
    const result = initSplitViewDOM(window.location.href);

    expect(result.success).toBe(true);

    const container = document.getElementById("tabboost-split-view-container");
    expect(container).not.toBeNull();

    const contentRoot = container.querySelector("#tabboost-original-content-root");
    expect(contentRoot).not.toBeNull();
    expect(contentRoot?.textContent).toContain("Original page content");

    const relocated = document.querySelector("#app");
    expect(relocated).not.toBeNull();
    expect(relocated?.closest("#tabboost-original-content-root")).not.toBeNull();
  });

  it("restores original content when split view is removed", () => {
    initSplitViewDOM(window.location.href);

    const removalResult = removeSplitViewDOM();
    expect(removalResult).toBe(true);

    expect(document.getElementById("tabboost-split-view-container")).toBeNull();

    const restored = document.querySelector("#app");
    expect(restored).not.toBeNull();
    expect(restored?.parentElement).toBe(document.body);
  });
});
