import { createEventListenerTracker } from "../../utils/eventListenerTracker.js";

const tracker = createEventListenerTracker();

export const addSplitViewEventListener = (
  target,
  eventType,
  listener,
  options
) => tracker.add(target, eventType, listener, options);

export const removeSplitViewEventListener = (
  target,
  eventType,
  listener,
  options
) => tracker.remove(target, eventType, listener, options);

export const clearSplitViewEventListeners = () => tracker.removeAll();

export default {
  add: addSplitViewEventListener,
  remove: removeSplitViewEventListener,
  clear: clearSplitViewEventListeners,
};
