const pool = require('../config/db');

const TOKEN_SETTING_KEY = 'olsera_token';

async function saveToken(token) {
  await pool.execute(
    `INSERT INTO app_settings (setting_key, setting_value, last_updated)
     VALUES (?, ?, NOW())
     ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), last_updated = NOW()`,
    [TOKEN_SETTING_KEY, token]
  );
}

async function scrapeOlseraToken() {
  let browser;

  try {
    const { chromium } = require('playwright');
    const loginUrl = process.env.OLSERA_LOGIN_URL || 'https://my.olsera.com/login';
    const email = process.env.OLSERA_EMAIL || 'ardiantopreffi@gmail.com';
    const password = process.env.OLSERA_PASSWORD;

    if (!password) {
      throw new Error('OLSERA_PASSWORD belum diisi di .env.');
    }

    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    let bearerToken = null;

    page.on('request', request => {
      const authorization = request.headers().authorization;
      if (authorization && authorization.toLowerCase().startsWith('bearer ')) {
        bearerToken = authorization.replace(/^Bearer\s+/i, '').trim();
      }
    });

    page.on('response', async response => {
      const request = response.request();
      const authorization = request.headers().authorization;
      if (authorization && authorization.toLowerCase().startsWith('bearer ')) {
        bearerToken = authorization.replace(/^Bearer\s+/i, '').trim();
      }
    });

    await page.goto(loginUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.fill('input[type="email"], input[name="email"]', email);
    await page.fill('input[type="password"], input[name="password"]', password);
    await Promise.all([
      page.waitForLoadState('networkidle', { timeout: 60000 }).catch(() => null),
      page.click('button[type="submit"], button:has-text("Login"), button:has-text("Masuk")')
    ]);

    if (!bearerToken) {
      bearerToken = await page.evaluate(() => {
        const candidates = [];

        for (let i = 0; i < localStorage.length; i += 1) {
          const key = localStorage.key(i);
          candidates.push(localStorage.getItem(key));
        }

        for (let i = 0; i < sessionStorage.length; i += 1) {
          const key = sessionStorage.key(i);
          candidates.push(sessionStorage.getItem(key));
        }

        return candidates
          .filter(Boolean)
          .map(value => {
            try {
              return JSON.stringify(JSON.parse(value));
            } catch (error) {
              return value;
            }
          })
          .map(value => value.match(/Bearer\s+([A-Za-z0-9._-]+)/i) || value.match(/"token"\s*:\s*"([^"]+)"/i))
          .find(Boolean)?.[1] || null;
      });
    }

    if (!bearerToken) {
      throw new Error('Token Olsera tidak ditemukan dari network request atau local storage.');
    }

    await saveToken(bearerToken);
    return bearerToken;
  } catch (error) {
    throw new Error(`Scraper login Olsera gagal: ${error.message}`);
  } finally {
    if (browser) {
      await browser.close().catch(() => null);
    }
  }
}

module.exports = {
  scrapeOlseraToken
};
