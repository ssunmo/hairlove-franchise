// Browser requests for the production origin are fulfilled ONLY from this checkout.
// All form POSTs are mocked; no inquiry reaches Web3Forms or sends an email.
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const output = path.resolve(process.env.TEST_OUTPUT || path.join(root, 'test-results'));
const origin = 'https://franchise.hairlove.kr';
const viewports = [
    { width: 360, height: 844 },
    { width: 390, height: 844 },
    { width: 768, height: 1024 },
    { width: 1100, height: 900 },
    { width: 1440, height: 900 }
];

async function attachRoutes(page, errors, formMode = { value: 'success', requests: [] }) {
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/*', async route => {
        const request = route.request();
        const url = new URL(request.url());
        if (url.origin === origin) {
            const filename = path.resolve(root, '.' + decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname));
            assert(filename.startsWith(root + path.sep));
            await route.fulfill({ path: filename });
        } else if (url.hostname === 'api.web3forms.com') {
            formMode.requests.push(JSON.parse(request.postData()));
            if (formMode.value === 'offline') return route.abort('failed');
            await route.fulfill({
                status: formMode.value === 'success' ? 200 : 500,
                contentType: 'application/json',
                body: JSON.stringify({ success: formMode.value === 'success' })
            });
        } else if (request.method() === 'GET' && ['fonts.googleapis.com', 'fonts.gstatic.com', 'cdnjs.cloudflare.com'].includes(url.hostname)) {
            await route.continue();
        } else {
            errors.push(`Unexpected outbound request blocked: ${request.method()} ${url.origin}`);
            await route.abort();
        }
    });
}

async function ready(page) {
    await page.goto(origin + '/');
    await page.evaluate(() => document.fonts.ready);
    await page.waitForFunction(() => document.querySelector('.hero-image').complete && document.querySelector('.hero-image').naturalWidth > 0);
}

const playState = (page, selector) => page.locator(selector).evaluate(el => getComputedStyle(el).animationPlayState);
const animationTime = (page, selector) => page.locator(selector).evaluate(el => el.getAnimations()[0]?.currentTime ?? 0);
async function waitState(page, selector, state) {
    await page.waitForFunction(({ selector, state }) => getComputedStyle(document.querySelector(selector)).animationPlayState === state, { selector, state });
}
async function scrollTo(page, selector) {
    await page.locator(selector).first().evaluate(el => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
    await page.waitForTimeout(900);
}

async function checkLayout(page, width) {
    const geometry = await page.evaluate(() => {
        const rect = selector => document.querySelector(selector).getBoundingClientRect().toJSON();
        const title = document.querySelector('.hero-title');
        const range = document.createRange();
        range.selectNodeContents(title);
        return {
            viewport: innerWidth,
            bodyWidth: document.body.scrollWidth,
            title: rect('.hero-title'),
            titleRuns: [...range.getClientRects()].map(r => r.toJSON()),
            ctas: [...document.querySelectorAll('.hero-buttons a')].map(el => el.getBoundingClientRect().toJSON()),
            header: rect('#main-header'),
            image: document.querySelector('.hero-image').currentSrc,
            animationDuration: getComputedStyle(document.querySelector('.hero-camera')).animationDuration,
            playbackControls: document.querySelectorAll('.motion-toggle').length
        };
    });
    assert(geometry.bodyWidth <= width, `Horizontal overflow at ${width}: ${geometry.bodyWidth}`);
    for (const rect of [...geometry.titleRuns, ...geometry.ctas]) {
        assert(rect.left >= -0.5 && rect.right <= width + 0.5, `Clipped title/button at ${width}: ${JSON.stringify(rect)}`);
    }
    const overlaps = (a, b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
    assert(!overlaps(...geometry.ctas), 'Hero CTAs overlap');
    assert(geometry.title.top >= geometry.header.bottom, 'Header covers hero title');
    assert.equal(geometry.animationDuration, '24s');
    assert.equal(geometry.playbackControls, 0, 'Playback controls must be removed');
    assert.equal(await page.getByRole('button', { name: /움직임|모션|재생|정지/ }).count(), 0);
    return geometry;
}

async function checkMotion(page) {
    const hero = '.hero-camera';
    const layers = ['.hero-camera', '.hero-daylight'];
    await waitState(page, hero, 'running');
    const start = await animationTime(page, hero);
    const titleBefore = await page.locator('.hero-title').boundingBox();
    const transformsBefore = await page.locator('#hero [data-motion]').evaluateAll(els => els.map(el => getComputedStyle(el).transform));
    await page.waitForTimeout(700);
    assert(await animationTime(page, hero) > start + 200, 'Hero animation did not advance');
    const transformsAfter = await page.locator('#hero [data-motion]').evaluateAll(els => els.map(el => getComputedStyle(el).transform));
    assert(transformsBefore.every((value, index) => value !== transformsAfter[index]), 'One of the ambient layers is static');
    assert.deepEqual(await page.locator('.hero-title').boundingBox(), titleBefore, 'Hero text must stay still');
    for (const selector of layers) await waitState(page, selector, 'running');

    await page.mouse.move(1, 1);
    await page.locator('.poster-preview').first().evaluate(el => scrollTo({
        top: Math.max(document.querySelector('#hero').offsetHeight + 1, el.getBoundingClientRect().top + scrollY - 110), behavior: 'instant'
    }));
    await page.waitForTimeout(900);
    for (const selector of layers) await waitState(page, selector, 'paused');
    const frozen = await animationTime(page, hero);
    await page.waitForTimeout(350);
    assert(Math.abs(await animationTime(page, hero) - frozen) < 30, 'Offscreen scene did not freeze');
    await waitState(page, '.product-reflection', 'running');
    assert.equal(await page.locator('.poster-preview img').first().evaluate(el => getComputedStyle(el).transform), 'none', 'Product text must stay still');
    await page.locator('.poster-preview').first().hover();
    await waitState(page, '.product-reflection', 'paused');
    await page.mouse.move(1, 1);
    await waitState(page, '.product-reflection', 'running');
    await page.locator('.poster-preview').first().focus();
    await waitState(page, '.product-reflection', 'paused');
    await page.locator('.poster-preview').first().evaluate(el => el.blur());
    await waitState(page, '.product-reflection', 'running');

    await scrollTo(page, '#hero');
    for (const selector of layers) await waitState(page, selector, 'running');
    // Synthetic visibility event verifies the tab-background handler separately
    // from the real IntersectionObserver viewport checks above.
    await page.evaluate(() => {
        Object.defineProperty(document, 'hidden', { configurable: true, value: true });
        document.dispatchEvent(new Event('visibilitychange'));
    });
    for (const selector of layers) await waitState(page, selector, 'paused');
    await page.evaluate(() => {
        delete document.hidden;
        document.dispatchEvent(new Event('visibilitychange'));
    });
    await waitState(page, hero, 'running');

    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.waitForFunction(() => document.documentElement.classList.contains('motion-paused'));
    for (const selector of layers) {
        assert.equal(await page.locator(selector).evaluate(el => getComputedStyle(el).animationName), 'none');
    }
    assert.equal(await page.locator('.hero-daylight').evaluate(el => getComputedStyle(el).display), 'none');
    assert.equal(await page.locator('html').evaluate(el => getComputedStyle(el).scrollBehavior), 'auto');
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await waitState(page, hero, 'running');
}

async function checkExistingFeatures(page, width) {
    await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
    if (width <= 768) {
        const toggle = page.locator('#mobile-toggle');
        await toggle.click();
        assert.equal(await toggle.getAttribute('aria-expanded'), 'true');
        await page.keyboard.press('Escape');
        assert.equal(await toggle.getAttribute('aria-expanded'), 'false');
        await toggle.click();
        await page.locator('.drawer-link[href="#pb-products"]').click();
        assert.equal(await toggle.getAttribute('aria-expanded'), 'false');
        assert(await page.locator('#mobile-drawer').evaluate(el => el.inert));
        assert(!await page.locator('body').evaluate(el => el.classList.contains('no-scroll')));
    } else {
        await page.locator('.nav-menu a[href="#pb-products"]').click();
    }
    await page.waitForTimeout(1100);
    assert.equal(new URL(page.url()).hash, '#pb-products');
    const faq = page.locator('.faq-question');
    await faq.nth(0).click();
    assert.equal(await faq.nth(0).getAttribute('aria-expanded'), 'true');
    await faq.nth(1).click();
    assert.equal(await faq.nth(0).getAttribute('aria-expanded'), 'false');
    assert.equal(await faq.nth(1).getAttribute('aria-expanded'), 'true');
    await faq.nth(1).click();
    assert.equal(await faq.nth(1).getAttribute('aria-expanded'), 'false');

    assert.equal(await page.locator('.zoom-overlay, .fa-magnifying-glass-plus').count(), 0);
    for (const index of [0, 1]) {
        const poster = page.locator('.poster-preview').nth(index);
        await poster.evaluate(el => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
        await page.waitForFunction(index => {
            const img = document.querySelectorAll('.poster-preview img')[index];
            return img.complete && img.naturalWidth > 0;
        }, index);
        assert.equal((await poster.textContent()).trim(), '', 'Poster must have no visible button label');
        if (width <= 768) await poster.locator('img').tap();
        else await poster.locator('img').click();
        assert(await page.locator('#lightbox').isVisible());
        await page.waitForFunction(() => document.querySelector('#lightbox-img').naturalWidth > 0);
        assert.equal(await page.locator('#lightbox-img').getAttribute('src'), await poster.getAttribute('data-lightbox'));
        assert(await page.locator('body').evaluate(el => el.classList.contains('no-scroll')));
        assert(await page.locator('html').evaluate(el => el.classList.contains('overlay-open')));
        await page.keyboard.press('Tab');
        assert(await page.locator('.lightbox-close').evaluate(el => el === document.activeElement));
        await page.keyboard.press('Shift+Tab');
        assert(await page.locator('.lightbox-close').evaluate(el => el === document.activeElement));
        if (index === 0) await page.keyboard.press('Escape');
        else await page.locator('.lightbox-close').click();
        assert(!await page.locator('#lightbox').isVisible());
        assert(await poster.evaluate(el => el === document.activeElement));
        assert(!await page.locator('body').evaluate(el => el.classList.contains('no-scroll')));

        // Keyboard users can open the image without a separate visible control.
        await page.keyboard.press(index === 0 ? 'Enter' : 'Space');
        assert(await page.locator('#lightbox').isVisible());
        await page.locator('#lightbox').click({ position: { x: 5, y: 5 } });
        assert(!await page.locator('#lightbox').isVisible());
        assert(await poster.evaluate(el => el === document.activeElement));
        assert(!await page.locator('body').evaluate(el => el.classList.contains('no-scroll')));
    }

    for (const details of await page.locator('.product-details, .brand-more').all()) {
        await details.locator('summary').click();
        assert(await details.evaluate(el => el.open));
        assert(await page.evaluate(() => document.body.scrollWidth <= innerWidth), `Expanded product/story content overflows at ${width}`);
        await details.locator('summary').click();
        assert(!await details.evaluate(el => el.open));
    }

    // Walk the real page to trigger lazy images and check every visible section.
    for (const selector of ['#brand-story', '#pb-products', '#competitiveness', '#franchise-cost', '#inquiry', 'footer']) {
        await scrollTo(page, selector);
        assert(await page.evaluate(() => document.body.scrollWidth <= innerWidth), `Overflow in ${selector} at ${width}`);
    }
    const images = await page.locator('img:not(#lightbox-img)').evaluateAll(imgs => imgs.map(img => ({ src: img.getAttribute('src'), loaded: img.complete && img.naturalWidth > 0 })));
    assert(images.every(img => img.loaded), `Images failed to load: ${JSON.stringify(images)}`);
    return images;
}

async function checkForm(page, mode) {
    await scrollTo(page, '#inquiry');
    await page.locator('.btn-submit').click();
    assert.equal(mode.requests.length, 0, 'Empty form was submitted');
    await page.locator('#username').fill('화면 검증');
    await page.locator('#userphone').fill('01012345678');
    assert.equal(await page.locator('#userphone').inputValue(), '010-1234-5678');
    await page.locator('#location').fill('모의 테스트 지역');
    await page.locator('.btn-submit').click();
    assert.equal(mode.requests.length, 0, 'Privacy consent was not enforced');
    await page.locator('#privacy').check();
    await page.locator('#budget').selectOption('2000-3000');
    await page.locator('#message').fill('자동 검증: 외부 전송 없는 모의 응답');
    await page.locator('.btn-submit').click();
    await page.waitForFunction(() => document.querySelector('#success-modal').classList.contains('open'));
    assert.equal(mode.requests.length, 1);
    assert.equal(mode.requests[0].phone, '010-1234-5678');
    assert.equal(mode.requests[0].budget, '2,000만원 ~ 3,000만원');
    assert.equal(await page.locator('#username').inputValue(), '');
    await page.locator('#modal-close-btn').click();
    assert(!await page.locator('body').evaluate(el => el.classList.contains('no-scroll')));

    for (const failure of ['error', 'offline']) {
        mode.value = failure;
        await page.locator('#username').fill('모의 오류 테스트');
        await page.locator('#userphone').fill('01012345678');
        await page.locator('#location').fill('테스트');
        await page.locator('#privacy').check();
        const dialogPromise = page.waitForEvent('dialog').then(async dialog => {
            assert(dialog.message().includes('오류'));
            await dialog.dismiss();
        });
        await page.locator('.btn-submit').click();
        await dialogPromise;
        assert(await page.locator('.btn-submit').isEnabled());
        assert.equal(await page.locator('#username').inputValue(), '모의 오류 테스트');
    }
}

async function run() {
    await fs.mkdir(output, { recursive: true });
    const executablePath = process.env.CHROMIUM_PATH;
    const browser = await chromium.launch({ headless: true, chromiumSandbox: true, ...(executablePath ? { executablePath } : {}) });
    const report = { source: root, browser: await browser.version(), staticResponses: 'intercepted from checkout', realFormRequests: 0, results: [] };
    try {
        for (const viewport of viewports) {
            const errors = [];
            const context = await browser.newContext({ viewport, hasTouch: viewport.width <= 768, deviceScaleFactor: 1, reducedMotion: 'no-preference' });
            // Returning users may have paused the previous version. The removed
            // preference must never disable the new scene permanently.
            await context.addInitScript(() => localStorage.setItem('hairlove-motion-paused', 'true'));
            const page = await context.newPage();
            const mode = { value: 'success', requests: [] };
            await attachRoutes(page, errors, mode);
            await ready(page);
            const geometry = await checkLayout(page, viewport.width);
            await page.screenshot({ path: path.join(output, `hero-${viewport.width}.png`) });
            await checkMotion(page);
            const images = await checkExistingFeatures(page, viewport.width);
            await checkForm(page, mode);
            assert.deepEqual(errors, []);
            report.results.push({ viewport, geometry, images, checks: ['layout', 'responsive image loading', 'no playback controls', 'portrait and daylight motion with stationary title', 'legacy pause setting ignored', 'offscreen pause/resume', 'product reflection hover/focus pause', 'stationary product text', 'simulated hidden tab', 'dynamic reduced motion', 'navigation', 'FAQ', 'image click/tap opens original poster without visible zoom label', 'keyboard enlargement, focus trap and return', 'Escape, close button and backdrop dismissal', 'product and story details', 'required/consent validation', 'mocked form success/error/offline'], mockedFormRequests: mode.requests.length });
            await context.close();

            // Also check reduced motion from the first render, without JavaScript toggling it.
            const reduced = await browser.newContext({ viewport, reducedMotion: 'reduce' });
            const reducedPage = await reduced.newPage();
            await attachRoutes(reducedPage, errors);
            await ready(reducedPage);
            assert(await reducedPage.locator('[data-motion]').evaluateAll(els => els.every(el => getComputedStyle(el).animationName === 'none')));
            assert.equal(await reducedPage.locator('.motion-toggle').count(), 0);
            assert(await reducedPage.locator('.scroll-reveal').evaluateAll(els => els.every(el => getComputedStyle(el).opacity === '1')));
            assert.deepEqual(errors, []);
            await reduced.close();
            console.log(`PASS ${viewport.width}px — layout, motion, existing features, mocked form, reduced motion`);
        }

        // Content must remain visible if scripts fail or are disabled.
        const noJs = await browser.newContext({ viewport: { width: 390, height: 844 }, javaScriptEnabled: false });
        const page = await noJs.newPage();
        const errors = [];
        await attachRoutes(page, errors);
        await page.goto(origin + '/');
        assert(await page.locator('.scroll-reveal').evaluateAll(els => els.every(el => getComputedStyle(el).opacity === '1')));
        assert.equal(await playState(page, '.hero-camera'), 'paused');
        await noJs.close();
        report.noJavaScript = 'Visible content; image motion stays paused';
        await fs.writeFile(path.join(output, 'verification.json'), JSON.stringify(report, null, 2) + '\n');
        console.log(`PASS no-JavaScript fallback; report: ${output}/verification.json`);
    } finally {
        await browser.close();
    }
}

if (require.main === module) {
    run().catch(error => { console.error(error); process.exitCode = 1; });
}
module.exports = { attachRoutes, ready };
