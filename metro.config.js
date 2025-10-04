// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

const { withNativeWind } = require('nativewind/metro');

/** @type {import('expo/metro-config').MetroConfig} */

const config = getDefaultConfig(__dirname);

// Add resolver configuration for better module resolution
config.resolver = {
  ...config.resolver,
  alias: {
    // Add any necessary aliases here if needed
    crypto: 'react-native-crypto',
  },
};

module.exports = withNativeWind(config, { input: './global.css' });
