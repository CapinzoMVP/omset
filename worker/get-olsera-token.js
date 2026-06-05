const { chromium } = require('playwright');

function requiredEnv(name) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} belum diisi.`);
  }

  return value;
}

function extractTokenFromText(value) {
  if (!value) {
    return null;
  }

  const bearerMatch = String(value).match(/Bearer\s+([A-Za-z0-9._-]+)/i);
  if (bearerMatch) {
    return bearerMatch[1];
  }

  const tokenMatch = String(value).match(/"token"\s*:\s*"([^"]+)"/i);
  if (tokenMatch) {
    return tokenMatch[1];
  }

  return null;
}

async function readStorageToken(page) {
  return page.evaluate(() => {
    const values = [];

    for (let i = 0; i < localStorage.length; i += 1) {
      values.push(localStorage.getItem(localStorage.key(i)));
    }

    for (let i = 0; i < sessionStorage.length; i += 1) {
      values.push(sessionStorage.getItem(sessionStorage.key(i)));
    }

    return values.filter(Boolean);
  });
}

async function main() {
  const email = requiredEnv('OLSERA_EMAIL');
  const password = requiredEnv('OLSERA_PASSWORD');
  const loginUrl = process.env.OLSERA_LOGIN_URL || 'https://my.olsera.com/login';
  let browser;
  let token = null;

  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    page.on('request', request => {
      const authorization = request.headers().authorization;
      const extractedToken = extractTokenFromText(authorization);

      if (extractedToken) {
        token = extractedToken;
      }
    });

    page.on('response', async response => {
      const authorization = response.request().headers().authorization;
      const extractedToken = extractTokenFromText(authorization);

      if (extractedToken) {
        token = extractedToken;
      }
    });

    await page.goto(loginUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.fill('input[type="email"], input[name="email"]', email);
    await page.fill('input[type="password"], input[name="password"]', password);
    await Promise.all([
      page.waitForLoadState('networkidle', { timeout: 60000 }).catch(() => null),
      page.click('button[type="submit"], button:has-text("Login"), button:has-text("Masuk")')
    ]);

    if (!token) {
      const storageValues = await readStorageToken(page);
      for (const value of storageValues) {
        token = extractTokenFromText(value);
        if (token) {
          break;
        }
      }
    }

    if (!token) {
      throw new Error('Token tidak ditemukan setelah login.');
    }

    process.stdout.write(token);
  } finally {
    if (browser) {
      await browser.close().catch(() => null);
    }
  }
}

main().catch(error => {
  process.stderr.write(`${error.message}\n`);
  process.exit(1);
});
