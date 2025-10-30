import {
  initSplitViewDOM,
  removeSplitViewDOM,
  updateRightViewDOM,
} from "./splitViewDOM.js";
import {
  setupSplitViewEvents,
  cleanupSplitViewEvents,
} from "./splitViewEvents.js";

const state = {
  isActive: false,
  container: null,
  leftUrl: "",
  rightUrl: "",
};

function activate(leftUrl) {
  const initResult = initSplitViewDOM(leftUrl);

  if (!initResult.success) {
    return { success: false, error: initResult.error || initResult.reason };
  }

  setupSplitViewEvents();

  state.isActive = true;
  state.container = initResult.container || null;
  state.leftUrl = leftUrl;

  return { success: true, reused: initResult.reused || false };
}

export function ensureActive(leftUrl) {
  if (state.isActive) {
    return { success: true, reused: true };
  }

  return activate(leftUrl);
}

export function teardown() {
  if (!state.isActive) {
    return { success: true, alreadyInactive: true };
  }

  cleanupSplitViewEvents();

  const removed = removeSplitViewDOM();
  if (!removed) {
    return { success: false, error: "remove-failed" };
  }

  state.isActive = false;
  state.container = null;
  state.leftUrl = "";
  state.rightUrl = "";

  return { success: true };
}

export function updateRightView(url, leftUrl = window.location.href) {
  if (!state.isActive) {
    const activation = activate(leftUrl);
    if (!activation.success) {
      return activation;
    }
  }

  const result = updateRightViewDOM(url);
  if (!result) {
    return { success: false, error: "update-failed" };
  }

  state.rightUrl = url;

  return { success: true };
}

export function getStatus() {
  return {
    isActive: state.isActive,
    leftUrl: state.leftUrl,
    rightUrl: state.rightUrl,
  };
}

export default {
  ensureActive,
  teardown,
  updateRightView,
  getStatus,
};
