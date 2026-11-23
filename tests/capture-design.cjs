// Review captures use the same checkout routing and form mocks as npm test.
const fs = require('node:fs/promises');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const { attachRoutes, ready } = require('./verify.cjs');

(async () => {
    const output = path.resolve(process.env.TEST_OUTPUT || 'test-results');
    await fs.mkdir(output, { recursive: true });
    const browser = await chromium.launch({ headless: true, chromiumSandbox: true,
        ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}) });
    try {
        for (const width of [390, 1440]) {
            const page = await browser.newPage({ viewport: { width, height: width === 390 ? 844 : 900 } });
            const errors = [];
            await attachRoutes(page, errors);
            await ready(page);
            for (const [name, selector] of [['hero', '#hero'], ['products', '#pb-products'], ['essence', '.product-item.reverse'], ['story', '#brand-story'], ['franchise', '#competitiveness'], ['cost', '#franchise-cost'], ['faq', '#faq'], ['inquiry', '#inquiry'], ['form', '.inquiry-form-box'], ['footer', 'footer']]) {
                await page.locator(selector).evaluate(el => scrollTo({ top: Math.max(0, el.getBoundingClientRect().top + scrollY - document.querySelector('#main-header').offsetHeight), behavior: 'instant' }));
                await page.waitForTimeout(850);
                assert(await page.evaluate(() => document.body.scrollWidth <= innerWidth), `Overflow in ${selector} at ${width}`);
                await page.screenshot({ path: path.join(output, `${name}-${width}.png`) });
            }
            await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
            await page.waitForTimeout(150);
            await page.screenshot({ path: path.join(output, `full-${width}.png`), fullPage: true });
            await page.locator('.poster-preview img').first().click();
            await page.locator('#lightbox-img').evaluate(img => img.decode());
            await page.screenshot({ path: path.join(output, `lightbox-${width}.png`) });
            await page.keyboard.press('Escape');
            assert.deepEqual(errors, []);
            console.log(`Captured ${width}px: all sections and full page, no overflow or script errors`);
            await page.close();
        }
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
