/**
 * Загружает .env до старта Metro, чтобы EXPO_PUBLIC_* попали в бандл.
 * extra.astroApiUrl — запасной путь для веба, если переменная не попала в клиент.
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

if (!process.env.EXPO_PUBLIC_ASTRO_API_URL) {
  const prodLike =
    process.env.NODE_ENV === 'production' ||
    process.env.EAS_BUILD === 'true' ||
    process.env.CI === 'true';
  if (!prodLike) {
    process.env.EXPO_PUBLIC_ASTRO_API_URL = 'http://127.0.0.1:8765';
  }
}

const astroUrl = process.env.EXPO_PUBLIC_ASTRO_API_URL || 'http://127.0.0.1:8765';

module.exports = {
  ...appJson,
  expo: {
    ...appJson.expo,
    extra: {
      ...(appJson.expo.extra || {}),
      astroApiUrl: astroUrl,
    },
  },
};
