import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const artifact = resolve('../.research/screenshots');
mkdirSync(artifact, {recursive:true});

async function register(page: Page) {
  await page.goto('/register');
  await page.getByLabel('Display name').fill('Local QA');
  await page.getByLabel('Email address').fill(`qa-${Date.now()}@example.com`);
  await page.getByLabel('Password', {exact:true}).fill('disposable-local-qa-password');
  await page.getByRole('button', {name:'Create account',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Your game. A fresh perspective.'})).toBeVisible();
}

test('landing is original, labelled and responsive', async ({page}) => {
  await page.goto('/');
  await expect(page.getByRole('heading',{level:1})).toHaveText('See the game.Understandyour decisions.');
  await expect(page.getByText('ILLUSTRATION · NOT A LIVE REPLAY')).toBeVisible();
  await page.screenshot({path:resolve(artifact,'landing-desktop.png'),fullPage:true});
  await page.setViewportSize({width:390,height:844});
  await expect(page.getByRole('link',{name:'Start your review'})).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
  await page.screenshot({path:resolve(artifact,'landing-mobile.png'),fullPage:true});
});

test('real replay upload, playback, coaching, feedback, report and deletion', async ({page}) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await register(page);
  await page.getByRole('link',{name:'Upload replay',exact:true}).first().click();
  await page.getByLabel('Choose replay file').setInputFiles(resolve('../.research/genuine-doubles.replay'));
  await page.getByRole('button',{name:'Upload & process'}).click();
  await expect(page.getByRole('heading',{name:'Who are you in this match?'})).toBeVisible({timeout:45000});
  await page.getByRole('button',{name:/Quantavious1234/}).click();
  const canvas = page.getByRole('img',{name:'3D reconstruction of recorded replay positions'});
  await expect(canvas).toBeVisible();
  await expect(page.locator('.arena-error')).toHaveCount(0);
  await page.getByLabel('Camera angle').selectOption('overhead');
  await page.getByLabel('Replay timeline').fill('20');
  await page.getByRole('button',{name:'Play replay',exact:true}).click();
  await expect.poll(async () => Number(await page.getByLabel('Replay timeline').inputValue())).toBeGreaterThan(20.2);
  await page.getByRole('button',{name:'Pause replay',exact:true}).click();
  await page.getByRole('button',{name:'Add review note'}).click();
  await page.getByLabel('Title',{exact:true}).fill('QA authored coaching moment');
  await page.getByLabel('Observed situation').fill('This is a manually authored review note on genuine replay data.');
  await page.getByLabel('Proposed alternative',{exact:true}).fill('Consider leaving a deeper supporting lane.');
  await page.getByRole('button',{name:'Save review moment'}).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button',{name:/QA authored coaching moment/}).first().click();
  await expect(page.getByText('Paused for review',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Replay context'}).click();
  await expect(page.getByText('Paused for review',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'This detection seems inaccurate'}).click();
  await expect(page.getByRole('button',{name:'Marked inaccurate · undo'})).toBeVisible();
  await page.screenshot({path:resolve(artifact,'coaching-viewer.png'),fullPage:true});
  await page.getByRole('button',{name:'Continue',exact:true}).click();
  await page.getByRole('button',{name:'Pause replay',exact:true}).click();
  await page.getByRole('button',{name:'Save review progress'}).click();
  const savedTime = Number(await page.getByLabel('Replay timeline').inputValue());
  await page.reload();
  await expect(canvas).toBeVisible();
  await expect.poll(async () => Number(await page.getByLabel('Replay timeline').inputValue())).toBeCloseTo(savedTime,0);
  await page.getByRole('link',{name:'Match report'}).click();
  await expect(page.getByRole('heading',{name:'Match coaching report'})).toBeVisible();
  await expect(page.getByRole('heading',{name:'QA authored coaching moment'})).toBeVisible();
  const download = page.waitForEvent('download');
  await page.getByRole('button',{name:'Export JSON'}).click();
  expect((await download).suggestedFilename()).toMatch(/rankdlab-.+\.json/);
  await page.screenshot({path:resolve(artifact,'match-report.png'),fullPage:true});
  await page.getByRole('link',{name:'Back to replay'}).click();
  await expect(canvas).toBeVisible();
  await page.setViewportSize({width:390,height:844});
  await expect.poll(() => page.locator('.sidebar').evaluate(element => element.getBoundingClientRect().right)).toBeLessThanOrEqual(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
  await page.screenshot({path:resolve(artifact,'viewer-mobile.png'),fullPage:true});
  await page.getByRole('button',{name:'Delete replay',exact:true}).click();
  await page.getByRole('button',{name:'Confirm delete replay'}).click();
  await expect(page.getByRole('heading',{name:'Replay library',exact:true})).toBeVisible();
  expect(errors).toEqual([]);
});

test('empty and corrupted uploads have actionable failures', async ({page}) => {
  await register(page);
  await page.goto('/upload');
  await page.getByLabel('Choose replay file').setInputFiles({name:'empty.replay',mimeType:'application/octet-stream',buffer:Buffer.from('')});
  await expect(page.getByRole('alert')).toContainText('empty or too short');
  await page.getByLabel('Choose replay file').setInputFiles({name:'corrupt.replay',mimeType:'application/octet-stream',buffer:Buffer.from('invalid'.repeat(100))});
  await page.getByRole('button',{name:'Upload & process'}).click();
  await expect(page.getByRole('heading',{name:'We couldn’t reconstruct this replay.'})).toBeVisible({timeout:45000});
  await expect(page.getByText(/Use an intact Soccar/)).toBeVisible();
  await page.getByRole('button',{name:'Delete replay',exact:true}).click();
  await page.getByRole('button',{name:'Confirm delete replay'}).click();
  await expect(page.getByRole('heading',{name:'Replay library',exact:true})).toBeVisible();
});
