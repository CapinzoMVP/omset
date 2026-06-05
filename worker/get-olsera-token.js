const { chromium } = require('playwright');
const fs = require('fs');

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

async function fillFirst(page, selectors, value, label) {
  for (const selector of selectors) {
    const locator = page.locator(selector).first();

    if (await locator.count()) {
      try {
        await locator.waitFor({ state: 'visible', timeout: 5000 });
        await locator.fill(value);
        return selector;
      } catch (error) {
        // Try the next selector; login pages often keep hidden duplicate inputs.
      }
    }
  }

  throw new Error(`Field ${label} tidak ditemukan.`);
}

async function clickFirst(page, selectors) {
  for (const selector of selectors) {
    const locator = page.locator(selector).first();

    if (await locator.count()) {
      try {
        await locator.waitFor({ state: 'visible', timeout: 5000 });
        await locator.click();
        return selector;
      } catch (error) {
        // Try the next selector.
      }
    }
  }

  throw new Error('Tombol login tidak ditemukan.');
}

async function saveDebugArtifacts(page) {
  await fs.promises.mkdir('debug-artifacts', { recursive: true });
  await page.screenshot({ path: 'debug-artifacts/olsera-login.png', fullPage: true }).catch(() => null);
  await fs.promises.writeFile('debug-artifacts/olsera-login.html', await page.content()).catch(() => null);
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
    globalThis.__olseraPage = page;

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

    await fillFirst(page, [
      'input[type="email"]',
      'input[name="email"]',
      'input[name="username"]',
      'input[name="user"]',
      'input[id="email"]',
      'input[id="username"]',
      'input[placeholder*="Email"]',
      'input[placeholder*="email"]',
      'input[placeholder*="Username"]',
      'input[placeholder*="username"]',
      'input[type="text"]'
    ], email, 'email/username');

    await fillFirst(page, [
      'input[type="password"]',
      'input[name="password"]',
      'input[id="password"]',
      'input[placeholder*="Password"]',
      'input[placeholder*="password"]'
    ], password, 'password');

    await Promise.all([
      page.waitForLoadState('networkidle', { timeout: 60000 }).catch(() => null),
      clickFirst(page, [
        'button[type="submit"]',
        'input[type="submit"]',
        'button:has-text("Login")',
        'button:has-text("Masuk")',
        'button:has-text("Sign in")',
        'button:has-text("Log in")'
      ])
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

main().catch(async error => {
  if (globalThis.__olseraPage) {
    await saveDebugArtifacts(globalThis.__olseraPage).catch(() => null);
  }
  process.stderr.write(`${error.message}\n`);
  process.exit(1);
});
