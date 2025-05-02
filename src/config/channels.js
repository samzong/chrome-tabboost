/**
 * Release channel configuration
 * Support multi-channel release strategy
 */

const CHANNELS = {
  DEV: {
    name: "development",
    displayName: "Development",
    updateUrl: null,
    badgeColor: "#666666",
    debug: true,
  },

  BETA: {
    name: "beta",
    displayName: "Beta",
    updateUrl: "https://updates.example.com/beta.xml",
    badgeColor: "#FFA500",
    debug: true,
  },

  TRUSTED_TESTERS: {
    name: "trusted-testers",
    displayName: "Trusted Testers",
    updateUrl: null, // Chrome Web Store automatically handles
    badgeColor: "#0000FF",
    debug: false,
  },

  PROD: {
    name: "production",
    displayName: "Production",
    updateUrl: null, // Chrome Web Store automatically handles
    badgeColor: null, // No badge
    debug: false,
  },
};

/**
 * Get current build channel
 * @returns {object} Current channel configuration
 */
function getCurrentChannel() {
  const channelName = process.env.BUILD_CHANNEL || "DEV";

  if (!CHANNELS[channelName]) {
    console.warn(
      `Unknown channel "${channelName}", using development environment configuration`
    );
    return CHANNELS.DEV;
  }

  return CHANNELS[channelName];
}

module.exports = {
  CHANNELS,
  getCurrentChannel,
};
