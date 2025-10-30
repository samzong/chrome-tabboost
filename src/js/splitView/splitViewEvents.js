import storageCache from "../../utils/storage-cache.js";
import * as i18n from "../../utils/i18n.js";
import {
  addSplitViewEventListener,
  clearSplitViewEventListeners,
} from "./splitViewEventTracker.js";

let isDragging = false;
let startX = 0;
let startY = 0;
let leftWidth = 50;
let listenersBound = false;

export function setupSplitViewEvents() {
  if (listenersBound) {
    return;
  }

  listenersBound = true;
  addSplitViewEventListener(document, "click", handleSplitViewClick, true);
  addSplitViewEventListener(document, "mousemove", onDrag);
  addSplitViewEventListener(document, "mouseup", stopDrag);
  addSplitViewEventListener(document, "touchmove", onDragTouch, {
    passive: false,
  });
  addSplitViewEventListener(document, "touchend", stopDrag);

  bindDividerListeners();
}

function bindDividerListeners() {
  const divider = document.getElementById("tabboost-split-divider");
  if (!divider) {
    return;
  }

  addSplitViewEventListener(divider, "mousedown", startDrag);
  addSplitViewEventListener(divider, "touchstart", startDragTouch, {
    passive: false,
  });
}

function setupDividerDrag() {
  
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
  const divider = document.getElementById("tabboost-split-divider");

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
    
    if (divider) {
      divider.style.left = `${newLeftWidth}%`;
      if (!divider.style.transform || !divider.style.transform.includes('translateX')) {
        divider.style.transform = 'translateX(-50%)';
      }
    }
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
    
    if (divider) {
      divider.style.top = `${newTopHeight}%`;
      if (!divider.style.transform || !divider.style.transform.includes('translateY')) {
        divider.style.transform = 'translateY(-50%)';
      }
    }
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

  if (target.closest('#tabboost-split-close, [data-action="close-split-view"]')) {
    chrome.runtime.sendMessage({ action: "closeSplitView" });
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
}

export function cleanupSplitViewEvents() {
  if (!listenersBound) {
    return;
  }

  listenersBound = false;
  isDragging = false;
  document.body.classList.remove("tabboost-dragging");
  clearSplitViewEventListeners();
}
