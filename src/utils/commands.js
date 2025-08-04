/**
 * Get all registered commands and their shortcuts in the extension
 * @returns {Promise<Object>}
 */
export async function getCommandShortcuts() {
  try {
    const commands = await chrome.commands.getAll();
    const shortcuts = {};

    commands.forEach((command) => {
      shortcuts[command.name] = command.shortcut || "";
    });

    return shortcuts;
  } catch (error) {
    console.error("Failed to get shortcuts:", error);
    return {};
  }
}

/**
 * Format shortcut text for display
 * @param {string} shortcut
 * @returns {string}
 */
export function formatShortcut(shortcut) {
  if (!shortcut) return "";

  return shortcut
    .replace(/Command/g, "⌘")
    .replace(/Ctrl/g, "Ctrl")
    .replace(/Alt/g, "Alt")
    .replace(/Shift/g, "⇧")
    .replace(/MacCtrl/g, "⌃")
    .replace(/\+/g, " + ");
}

export default {
  getCommandShortcuts,
  formatShortcut,
};
