/**
 * Utilities for managing tab audio states
 */

/**
 * Toggle mute status of the current tab
 * @returns {Promise<{ success: boolean, muted: boolean }>}
 */
export async function toggleMuteCurrentTab() {
  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    if (!tab) {
      return { success: false, muted: false };
    }

    const newMuteState = !tab.mutedInfo?.muted;
    await chrome.tabs.update(tab.id, { muted: newMuteState });

    return { success: true, muted: newMuteState };
  } catch (error) {
    return { success: false, muted: false };
  }
}

/**
 * Toggle mute status of all tabs playing audio
 * @returns {Promise<{ success: boolean, muted: boolean, count: number }>}
 */
export async function toggleMuteAllAudioTabs() {
  try {
    const audioTabs = await chrome.tabs.query({ audible: true });

    if (audioTabs.length === 0) {
      return { success: true, muted: false, count: 0 };
    }

    const mutedCount = audioTabs.filter((tab) => tab.mutedInfo?.muted).length;
    const shouldMute = mutedCount < audioTabs.length / 2;

    await Promise.all(
      audioTabs.map((tab) => chrome.tabs.update(tab.id, { muted: shouldMute }))
    );

    return {
      success: true,
      muted: shouldMute,
      count: audioTabs.length,
    };
  } catch (error) {
    return { success: false, muted: false, count: 0 };
  }
}

/**
 * Get the count of tabs currently playing audio
 * @returns {Promise<number>}
 */
export async function getAudioTabsCount() {
  try {
    const audioTabs = await chrome.tabs.query({ audible: true });
    return audioTabs.length;
  } catch (error) {
    return 0;
  }
}
