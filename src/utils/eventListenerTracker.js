const noop = () => {};

function safelyAddEventListener(target, eventType, listener, options) {
  if (!target || typeof target.addEventListener !== "function") {
    return false;
  }

  try {
    target.addEventListener(eventType, listener, options);
    return true;
  } catch (error) {
    console.warn(
      "chrome-tabboost: Failed to add event listener:",
      eventType,
      error
    );
    return false;
  }
}

function safelyRemoveEventListener(target, eventType, listener, options) {
  if (!target || typeof target.removeEventListener !== "function") {
    return;
  }

  try {
    target.removeEventListener(eventType, listener, options);
  } catch (error) {
    console.warn(
      "chrome-tabboost: Failed to remove event listener:",
      eventType,
      error
    );
  }
}

export function createEventListenerTracker() {
  const listeners = [];

  const add = (target, eventType, listener, options) => {
    const entry = { target, eventType, listener, options };
    const added = safelyAddEventListener(target, eventType, listener, options);

    if (!added) {
      return noop;
    }

    listeners.push(entry);

    return () => {
      removeEntry(entry);
    };
  };

  const removeEntry = (entry) => {
    const index = listeners.indexOf(entry);
    if (index === -1) {
      return;
    }

    listeners.splice(index, 1);
    safelyRemoveEventListener(
      entry.target,
      entry.eventType,
      entry.listener,
      entry.options
    );
  };

  const remove = (target, eventType, listener, options) => {
    for (let i = listeners.length - 1; i >= 0; i -= 1) {
      const entry = listeners[i];
      if (
        entry.target === target &&
        entry.eventType === eventType &&
        entry.listener === listener &&
        entry.options === options
      ) {
        removeEntry(entry);
        break;
      }
    }
  };

  const removeAll = () => {
    while (listeners.length > 0) {
      const entry = listeners.pop();
      safelyRemoveEventListener(
        entry.target,
        entry.eventType,
        entry.listener,
        entry.options
      );
    }
  };

  return {
    add,
    remove,
    removeAll,
  };
}

export default createEventListenerTracker;
