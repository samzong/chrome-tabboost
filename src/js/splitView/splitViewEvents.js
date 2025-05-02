import storageCache from "../../utils/storage-cache.js";
import { getMessage } from "../../utils/i18n.js";

let isDragging = false;
let startX = 0;
let startY = 0;
let leftWidth = 50;

export function setupSplitViewEvents() {
  document.addEventListener("click", handleSplitViewClick);

  setupDividerDrag();
}

function setupDividerDrag() {
  const divider = document.getElementById("tabboost-split-divider");
  if (!divider) return;

  divider.addEventListener("mousedown", startDrag);

  document.addEventListener("mousemove", onDrag, { passive: true });
  document.addEventListener("mouseup", stopDrag);

  divider.addEventListener("touchstart", startDragTouch, { passive: true });
  document.addEventListener("touchmove", onDragTouch, { passive: true });
  document.addEventListener("touchend", stopDrag);
}

function startDrag(e) {
  isDragging = true;
  startX = e.clientX;
  startY = e.clientY;

  const leftView = document.getElementById("tabboost-split-left");
  if (leftView) {
    const computedStyle = window.getComputedStyle(leftView);
    leftWidth = (parseFloat(computedStyle.width) / window.innerWidth) * 100;
  }

  document.body.classList.add("tabboost-dragging");

  e.preventDefault();
}

function startDragTouch(e) {
  if (e.touches.length !== 1) return;

  isDragging = true;
  startX = e.touches[0].clientX;
  startY = e.touches[0].clientY;

  const leftView = document.getElementById("tabboost-split-left");
  if (leftView) {
    const computedStyle = window.getComputedStyle(leftView);
    leftWidth = (parseFloat(computedStyle.width) / window.innerWidth) * 100;
  }

  document.body.classList.add("tabboost-dragging");
}

function onDrag(e) {
  if (!isDragging) return;

  requestAnimationFrame(() => {
    updateSplitPosition(e.clientX, e.clientY);
  });
}

function onDragTouch(e) {
  if (!isDragging || e.touches.length !== 1) return;

  requestAnimationFrame(() => {
    updateSplitPosition(e.touches[0].clientX, e.touches[0].clientY);
  });
}

function updateSplitPosition(clientX, clientY) {
  const container = document.getElementById("tabboost-views-container");
  const leftView = document.getElementById("tabboost-split-left");
  const rightView = document.getElementById("tabboost-split-right");

  if (!container || !leftView || !rightView) return;

  const isHorizontalSplit = window.innerWidth > 768;

  if (isHorizontalSplit) {
    const deltaX = clientX - startX;
    const containerWidth = container.offsetWidth;
    const deltaPercent = (deltaX / containerWidth) * 100;

    let newLeftWidth = leftWidth + deltaPercent;

    newLeftWidth = Math.max(20, Math.min(80, newLeftWidth));

    container.style.setProperty("--left-width", `${newLeftWidth}%`);
    container.style.setProperty("--right-width", `${100 - newLeftWidth}%`);

    leftView.style.width = "var(--left-width)";
    rightView.style.width = "var(--right-width)";
  } else {
    const deltaY = clientY - startY;
    const containerHeight = container.offsetHeight;
    const deltaPercent = (deltaY / containerHeight) * 100;

    let newTopHeight = leftWidth + deltaPercent;

    newTopHeight = Math.max(20, Math.min(80, newTopHeight));

    container.style.setProperty("--top-height", `${newTopHeight}%`);
    container.style.setProperty("--bottom-height", `${100 - newTopHeight}%`);

    leftView.style.height = "var(--top-height)";
    rightView.style.height = "var(--bottom-height)";
  }
}

function stopDrag() {
  if (!isDragging) return;

  isDragging = false;

  document.body.classList.remove("tabboost-dragging");

  const leftView = document.getElementById("tabboost-split-left");
  if (leftView) {
    const computedStyle = window.getComputedStyle(leftView);
    const isHorizontalSplit = window.innerWidth > 768;

    if (isHorizontalSplit) {
      const width = (parseFloat(computedStyle.width) / window.innerWidth) * 100;
      storageCache.set({ splitViewHorizontalRatio: width });
    } else {
      const height =
        (parseFloat(computedStyle.height) / window.innerHeight) * 100;
      storageCache.set({ splitViewVerticalRatio: height });
    }
  }
}

function handleSplitViewClick(event) {
  const target = event.target;

  if (
    target.closest('#tabboost-split-close, [data-action="close-split-view"]')
  ) {
    chrome.runtime.sendMessage({ action: "closeSplitView" });
    return;
  }

  if (target.closest('.tabboost-view-close[data-action="close-left-view"]')) {
    const rightIframe = document.getElementById("tabboost-right-iframe");

    if (rightIframe && rightIframe.src && rightIframe.src !== "about:blank") {
      const rightUrl = rightIframe.src;

      chrome.runtime.sendMessage({ action: "closeSplitView" });

      setTimeout(() => {
        window.location.href = rightUrl;
      }, 100);
    } else {
      chrome.runtime.sendMessage({ action: "closeSplitView" });
    }
    return;
  }

  if (target.closest('.tabboost-view-close[data-action="close-right-view"]')) {
    const rightIframe = document.getElementById("tabboost-right-iframe");
    if (rightIframe) {
      rightIframe.src = "about:blank";

      const rightError = document.getElementById("tabboost-right-error");
      if (rightError) {
        rightError.style.display = "none";
      }

      const leftView = document.getElementById("tabboost-split-left");
      const rightView = document.getElementById("tabboost-split-right");
      const divider = document.getElementById("tabboost-split-divider");

      if (leftView && rightView && divider) {
        leftView.style.width = "100%";
        rightView.style.display = "none";
        divider.style.display = "none";
      }
    }
    return;
  }

  const openTabButton = target.closest(".tabboost-open-in-tab");
  if (openTabButton) {
    const url = openTabButton.dataset.url;
    if (url) {
      window.open(url, "_blank");
    }
    return;
  }

  const addToIgnoreButton = target.closest(".tabboost-add-to-ignore");
  if (addToIgnoreButton) {
    const url = addToIgnoreButton.dataset.url;
    if (url) {
      handleAddToIgnoreList(url);
    }
    return;
  }
}

async function handleAddToIgnoreList(url) {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname;

    chrome.runtime.sendMessage({
      action: "openInNewTab",
      url: url,
    });

    const result = await storageCache.get(["iframeIgnoreList"]);
    let ignoreList = result.iframeIgnoreList || [];

    if (!Array.isArray(ignoreList)) {
      ignoreList = [];
    }

    if (!ignoreList.includes(hostname)) {
      ignoreList.push(hostname);

      await storageCache.set({ iframeIgnoreList: ignoreList });
      alert(getMessage("addedToIgnoreListAlert", hostname));
    } else {
      alert(getMessage("alreadyInIgnoreListAlert", hostname));
    }
  } catch (error) {
    alert(getMessage("addToIgnoreListFailedAlert"));

    window.open(url, "_blank");
  }
}

export function cleanupSplitViewEvents() {
  document.removeEventListener("click", handleSplitViewClick);

  const divider = document.getElementById("tabboost-split-divider");
  if (divider) {
    divider.removeEventListener("mousedown", startDrag);
    divider.removeEventListener("touchstart", startDragTouch);
  }

  document.removeEventListener("mousemove", onDrag);
  document.removeEventListener("mouseup", stopDrag);
  document.removeEventListener("touchmove", onDragTouch);
  document.removeEventListener("touchend", stopDrag);
}

export async function autoAddToIgnoreList(url) {
  try {
    const result = await storageCache.get(["autoAddToIgnoreList"]);
    if (!result.autoAddToIgnoreList) {
      return false;
    }

    const urlObj = new URL(url);
    const hostname = urlObj.hostname;

    const listResult = await storageCache.get(["iframeIgnoreList"]);
    let ignoreList = listResult.iframeIgnoreList || [];

    if (!Array.isArray(ignoreList)) {
      ignoreList = [];
    }

    if (!ignoreList.includes(hostname)) {
      ignoreList.push(hostname);

      await storageCache.set({ iframeIgnoreList: ignoreList });
      return true;
    }

    return false;
  } catch (error) {
    return false;
  }
}
