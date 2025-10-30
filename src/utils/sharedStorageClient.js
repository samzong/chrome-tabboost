import { STORAGE_MESSAGE_ACTION } from "./messageChannels.js";

function buildPayload(query) {
  if (typeof query === "string" || Array.isArray(query)) {
    return { keys: query };
  }

  if (query && typeof query === "object") {
    return { defaults: query };
  }

  return {};
}

function resolveWithDefaults(query) {
  if (query && typeof query === "object" && !Array.isArray(query)) {
    return { ...query };
  }
  return {};
}

function directStorageGet(query) {
  return new Promise((resolve, reject) => {
    if (!chrome?.storage?.sync?.get) {
      resolve(resolveWithDefaults(query));
      return;
    }

    const requestArg =
      typeof query === "string" || Array.isArray(query) ? query : query || {};

    chrome.storage.sync.get(requestArg, (items) => {
      const lastError = chrome.runtime?.lastError;
      if (lastError) {
        reject(lastError);
        return;
      }

      if (query && typeof query === "object" && !Array.isArray(query)) {
        resolve({ ...query, ...items });
      } else {
        resolve(items || {});
      }
    });
  });
}

export async function fetchSharedSyncValues(query) {
  if (!chrome?.runtime?.sendMessage) {
    return directStorageGet(query);
  }

  const payload = buildPayload(query);

  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      {
        action: STORAGE_MESSAGE_ACTION,
        payload,
      },
      (response) => {
        const lastError = chrome.runtime?.lastError;
        if (lastError) {
          directStorageGet(query).then(resolve).catch(reject);
          return;
        }

        if (!response || response.success !== true) {
          directStorageGet(query).then(resolve).catch(reject);
          return;
        }

        resolve(response.data || resolveWithDefaults(query));
      }
    );
  });
}

export { STORAGE_MESSAGE_ACTION };
