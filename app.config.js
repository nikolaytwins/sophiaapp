/**
 * Загружает .env до старта Metro, чтобы EXPO_PUBLIC_* попали в бандл.
 */
const path = require('path');
const appJson = require('./app.json');

try {
  require('dotenv').config({ path: path.resolve(__dirname, '.env') });
} catch {
  /* optional */
}
try {
  require('dotenv').config({ path: path.resolve(__dirname, '.env.local'), override: true });
} catch {
  /* optional */
}

module.exports = {
  ...appJson,
  expo: {
    ...appJson.expo,
    extra: {
      ...(appJson.expo.extra || {}),
    },
  },
};
