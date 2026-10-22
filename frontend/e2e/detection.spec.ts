import { expect, test } from '@playwright/test';

test('genuine rule finding drives automatic coaching, annotations and Continue', async ({page}) => {
  const file = process.env.RANKDLAB_COACHING_REPLAY;
  test.skip(!file, 'Set RANKDLAB_COACHING_REPLAY to a private replay with a genuine finding');
  await page.goto('/register');
  await page.getByLabel('Display name').fill('Detection QA');
  await page.getByLabel('Email address').fill(`detection-${Date.now()}@example.com`);
  await page.getByLabel('Password', {exact:true}).fill('disposable-local-qa-password');
  await page.getByRole('button',{name:'Create account',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Your game. A fresh perspective.'})).toBeVisible();
  await page.goto('/upload');
  await page.getByLabel('Choose replay file').setInputFiles(file!);
  await page.getByRole('button',{name:'Upload & process'}).click();
  await expect(page.getByRole('heading',{name:'Who are you in this match?'})).toBeVisible({timeout:45000});
  const id = page.url().split('/').at(-1);
  const detail = await (await page.request.get(`/api/replays/${id}`)).json();
  const finding = detail.findings.find((f: {source:string}) => f.source === 'rule');
  expect(finding).toBeTruthy();
  const player = detail.metadata.players.find((p: {id:string}) => p.id === finding.player_id);
  await page.getByRole('button',{name:new RegExp(player.name)}).click();
  await page.getByLabel('Replay timeline').fill((finding.time - .5).toFixed(2));
  await page.getByRole('button',{name:'Play replay',exact:true}).click();
  await expect(page.getByText('Paused for review',{exact:true})).toBeVisible();
  await expect(page.locator('.coaching-content h2')).toHaveText(finding.title);
  expect(Number(await page.getByLabel('Replay timeline').inputValue())).toBeCloseTo(finding.time,2);
  const canvas = page.getByRole('img',{name:'3D reconstruction of recorded replay positions'});
  await expect(canvas).toHaveAttribute('data-camera-mode','challenge');
  expect(Number(await canvas.getAttribute('data-annotation-count'))).toBeGreaterThan(2);
  await page.screenshot({path:'../.research/screenshots/genuine-rule-coaching.png',fullPage:true});
  await page.getByRole('button',{name:'Replay context'}).click();
  await expect(page.getByText('Paused for review',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Continue',exact:true}).click();
  await expect.poll(async () => Number(await page.getByLabel('Replay timeline').inputValue())).toBeGreaterThan(finding.time + .1);
  await page.getByRole('button',{name:'Pause replay',exact:true}).click();
  const saved = await (await page.request.get(`/api/replays/${id}`)).json();
  expect(saved.reviewed_ids).toContain(finding.id);
});

