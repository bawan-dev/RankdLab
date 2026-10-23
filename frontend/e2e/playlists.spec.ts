import { expect, test } from '@playwright/test';
import { resolve } from 'node:path';

test('three real formats, mismatch correction, isolated histories and responsive pages', async ({page}) => {
  test.setTimeout(120000);
  const email=`modes-${Date.now()}@example.com`, password='disposable-local-qa-password';
  await page.goto('/register');
  await page.getByLabel('Display name',{exact:true}).fill('Playlist QA');
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password',{exact:true}).fill(password);
  await page.getByRole('button',{name:'Create account',exact:true}).click();
  await page.getByRole('link',{name:'Skip for now'}).click();
  for(const [mode,fixture] of [['1v1','genuine-duel'],['2v2','genuine-doubles'],['3v3','season24-standard']]) {
    await page.goto(`/upload?playlist=${mode==='2v2'?'1v1':mode}`);
    await page.getByLabel('Choose replay file').setInputFiles(resolve(`../.research/${fixture}.replay`));
    await page.getByRole('button',{name:'Upload & process'}).click();
    if(mode==='2v2'){
      await expect(page.getByRole('heading',{name:'This replay belongs to a different mode.'})).toBeVisible({timeout:45000});
      await page.getByRole('button',{name:'Use 2v2 coach'}).click();
    }
    await expect(page.getByRole('heading',{name:'Who are you in this match?'})).toBeVisible({timeout:45000});
    await page.locator('.player-option').first().click();
    await expect(page.getByRole('img',{name:'3D reconstruction of recorded replay positions'})).toBeVisible();
    await page.getByLabel('Replay timeline').fill('20');
    await page.getByText('Review or correct a tactical situation',{exact:true}).click();
    await page.getByRole('button',{name:'Use current moment'}).click();
    await page.getByLabel('Reviewer explanation').fill('QA owner review of genuine recorded data; uncertainty retained.');
    await page.getByRole('button',{name:'Save tactical review',exact:true}).click();
    await expect(page.getByText('Tactical review saved.',{exact:true})).toBeVisible();
    await page.getByRole('button',{name:'Open reviewed situation',exact:true}).click();
    await expect(page.getByText('Paused for review',{exact:true})).toBeVisible();
    await page.getByLabel('Finding usefulness').selectOption('unsure');
    await expect(page.getByText('Feedback saved. This is not an objective review label.')).toBeVisible();
    await page.getByRole('button',{name:'Continue',exact:true}).click();
    await page.getByRole('button',{name:'Pause replay',exact:true}).click();
    await page.getByRole('link',{name:'Match report'}).click();
    await expect(page.getByRole('heading',{name:'Match coaching report'})).toBeVisible();
    await expect(page.locator('.report-context')).toContainText(mode);
    await page.goto(`/coach/${mode}`);
    await expect(page.locator('.replay-row')).toHaveCount(1);
    await expect(page.locator('.history-panel')).toContainText('1 matches');
    await page.screenshot({path:`../.research/screenshots/coach-${mode}-desktop.png`,fullPage:true});
    await page.setViewportSize({width:390,height:844});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
    await page.screenshot({path:`../.research/screenshots/coach-${mode}-mobile.png`,fullPage:true});
    await page.setViewportSize({width:1440,height:1000});
  }
  for(const route of ['dashboard','analytics','settings']){
    await page.goto(`/${route}`);
    await expect(page.locator('main h1')).toBeVisible();
    await page.screenshot({path:`../.research/screenshots/${route}-desktop.png`,fullPage:true});
    await page.setViewportSize({width:390,height:844});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
    await page.screenshot({path:`../.research/screenshots/${route}-mobile.png`,fullPage:true});
    await page.setViewportSize({width:1440,height:1000});
  }
  await page.getByLabel('Display username').fill('Updated QA');
  await page.getByRole('button',{name:'Save goal',exact:true}).click();
  await expect(page.locator('.sidebar-profile strong')).toHaveText('Updated QA');
  await page.getByRole('button',{name:'Sign out',exact:true}).click();
  await page.goto('/login');
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password',{exact:true}).fill(password);
  await page.getByRole('button',{name:'Sign in',exact:true}).click();
  await expect(page.locator('.sidebar-profile strong')).toHaveText('Updated QA');
  await page.keyboard.press('Tab');
  await page.emulateMedia({reducedMotion:'reduce'});
});
