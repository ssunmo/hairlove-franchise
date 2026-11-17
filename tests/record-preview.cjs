// Records actual Chromium screencast frames and their original timestamps.
// Reuses the test request interception: no deployment and no real form submission.
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { execFileSync } = require('node:child_process');
const { chromium } = require('playwright');
const { attachRoutes, ready } = require('./verify.cjs');

async function record(browser, viewport, filename, actions) {
    const context = await browser.newContext({ viewport, deviceScaleFactor: viewport.width < 768 ? 2 : 1, reducedMotion: 'no-preference' });
    const page = await context.newPage();
    const errors = [];
    await attachRoutes(page, errors);
    await ready(page);
    const framesDir = await fs.mkdtemp(path.join(os.tmpdir(), 'hairlove-frames-'));
    const cdp = await context.newCDPSession(page);
    const frames = [];
    const writes = [];
    cdp.on('Page.screencastFrame', event => {
        const file = path.join(framesDir, `${String(frames.length).padStart(6, '0')}.jpg`);
        frames.push({ file, time: event.metadata.timestamp });
        writes.push(fs.writeFile(file, Buffer.from(event.data, 'base64')));
        cdp.send('Page.screencastFrameAck', { sessionId: event.sessionId }).catch(() => {});
    });
    await cdp.send('Page.startScreencast', {
        format: 'jpeg', quality: 87,
        maxWidth: viewport.width, maxHeight: viewport.height, everyNthFrame: 3
    });
    await actions(page);
    await cdp.send('Page.stopScreencast');
    await Promise.all(writes);
    if (errors.length) throw new Error(errors.join('\n'));
    let concat = '';
    frames.forEach((frame, index) => {
        const duration = frames[index + 1] ? frames[index + 1].time - frame.time : 0.1;
        concat += `file '${frame.file}'\nduration ${Math.max(duration, 0.001)}\n`;
    });
    concat += `file '${frames.at(-1).file}'\n`;
    const manifest = path.join(framesDir, 'frames.txt');
    await fs.writeFile(manifest, concat);
    await fs.mkdir(path.dirname(filename), { recursive: true });
    execFileSync('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', manifest, '-vf', 'fps=24,format=yuv420p', '-c:v', 'libx264', '-preset', 'medium', '-crf', '22', '-movflags', '+faststart', filename]);
    console.log(`Recorded ${filename}: ${frames.length} frames, ${(frames.at(-1).time - frames[0].time).toFixed(1)}s`);
    await context.close();
    await fs.rm(framesDir, { recursive: true });
}

(async () => {
    const output = path.resolve(process.env.TEST_OUTPUT || 'test-results');
    const browser = await chromium.launch({ headless: true, chromiumSandbox: true, ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}) });
    try {
        if (process.env.RECORD_MODE !== 'mobile') await record(browser, { width: 1440, height: 900 }, path.join(output, 'desktop-preview.mp4'), async page => {
            await page.waitForTimeout(26500);
            await page.locator('#hero .motion-toggle').click();
            await page.waitForTimeout(2200);
            await page.locator('#hero .motion-toggle').click();
            await page.mouse.move(20, 100);
            await page.waitForTimeout(2200);
            await page.locator('.nav-menu a[href="#pb-products"]').click();
            await page.waitForTimeout(2000);
            await page.locator('.poster-preview').first().evaluate(el => el.scrollIntoView({ block: 'center', behavior: 'smooth' }));
            await page.waitForTimeout(2500);
            await page.locator('.poster-preview').first().click();
            await page.waitForTimeout(2000);
            await page.keyboard.press('Escape');
            await page.waitForTimeout(1000);
        });
        if (process.env.RECORD_MODE !== 'desktop') await record(browser, { width: 390, height: 844 }, path.join(output, 'mobile-preview.mp4'), async page => {
            await page.waitForTimeout(6500);
            await page.locator('#hero .motion-toggle').click();
            await page.waitForTimeout(1800);
            await page.locator('#hero .motion-toggle').click();
            await page.waitForTimeout(1800);
            await page.locator('#mobile-toggle').click();
            await page.waitForTimeout(1000);
            await page.locator('.drawer-link[href="#pb-products"]').click();
            await page.waitForTimeout(2000);
            await page.locator('.poster-preview').first().click();
            await page.waitForTimeout(1800);
            await page.locator('.lightbox-close').click();
            await page.waitForTimeout(1000);
        });
    } finally {
        await browser.close();
    }
})().catch(error => { console.error(error); process.exitCode = 1; });
