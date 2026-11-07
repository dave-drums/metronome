import { test, expect } from '@playwright/test';
const origin='http://127.0.0.1:4191';
async function ready(page,url) {
  await page.goto(new URL(url,origin).href); await page.locator('.metronome-card').waitFor();
  await page.evaluate(()=>document.fonts.ready);
}
async function checkTheme(page) {
  const card=page.locator('.metronome-card');
  await expect(card).toHaveCSS('background-image',/linear-gradient/);
  await expect(card).toHaveCSS('color','rgb(237, 242, 245)');
  await expect(card).toHaveCSS('font-family', /DM Sans/);
  await expect(page.getByLabel('Tempo in beats per minute')).toHaveCSS('font-family', /Inter/);
  await expect(page.getByLabel('Start metronome')).toHaveCSS('background-image',/linear-gradient/);
  await expect(page.getByLabel('Start metronome')).toHaveCSS('color','rgb(17, 21, 23)');
  await expect(page.getByLabel('Start metronome')).toHaveCSS('border-radius','10px');
  const bounds=await card.boundingBox();
  expect(bounds.x).toBeGreaterThanOrEqual(0);
  expect(bounds.x+bounds.width).toBeLessThanOrEqual(page.viewportSize().width+1);
}
for(const width of [1280,600,390,320]) test(`shared Dave Drums interface at ${width}px`,async({browser},testInfo)=>{
  const context=await browser.newContext({viewport:{width,height:1000}});
  const page=await context.newPage();await ready(page,'/metronome/');await checkTheme(page);
  await testInfo.attach('shared-tool-card',{body:await page.locator('.metronome-card').screenshot(),contentType:'image/png'});
  await page.getByText('Beats: 4',{exact:true}).click();
  await page.getByRole('button',{name:'16',exact:true}).click();
  expect(await page.locator('.beat-circle').count()).toBe(16);
  for(const beat of await page.locator('.beat-circle').all()) {
    const box=await beat.boundingBox();expect(box.width).toBeGreaterThanOrEqual(24);
    expect(box.x+box.width).toBeLessThanOrEqual(width);
  }
  for(const trigger of [page.getByText('Beats: 16',{exact:true}),page.getByText('Subdivision: 1',{exact:true})]) {
    await trigger.click();
    const popup=page.getByRole('dialog');await expect(popup).toBeVisible();
    const box=await popup.boundingBox();expect(box.x).toBeGreaterThanOrEqual(0);expect(box.x+box.width).toBeLessThanOrEqual(width);
    await expect(popup.getByLabel('Close')).toBeFocused();
    await page.keyboard.press('Escape');await expect(popup).toHaveCount(0);await expect(trigger).toBeFocused();
  }
  await context.close();
});

function traceAudio() {
  window.audioEvents=[];
  const original=AudioBufferSourceNode.prototype.start;
  AudioBufferSourceNode.prototype.start=function(time,...args){
    const samples=this.buffer?.getChannelData(0);let fingerprint=2166136261;
    if(samples)for(const sample of samples)fingerprint=Math.imul(fingerprint^Math.round(sample*1e6),16777619);
    window.audioEvents.push({time,duration:this.buffer?.duration, samples:this.buffer?.length,fingerprint});
    return original.call(this,time,...args);
  };
}

test('real audio scheduling matches Vault at eight subdivisions',async({browser})=>{
  const schedules=[];
  for(const url of ['/reference/','/metronome/']){
    const context=await browser.newContext();await context.addInitScript(traceAudio);const page=await context.newPage();
    await ready(page,url);await expect.poll(()=>page.evaluate(()=>performance.getEntriesByType('resource').filter(e=>e.name.endsWith('.mp3')).length)).toBe(3);
    await page.locator('input[type=text]').fill('300');await page.locator('input[type=text]').blur();
    await page.getByText('Subdivision: 1',{exact:true}).click();await page.getByText('32nd',{exact:true}).click();
    await page.getByRole('button',{name:'▶ Start',exact:true}).or(page.getByLabel('Start metronome')).click();
    await expect.poll(()=>page.evaluate(()=>audioEvents.length)).toBeGreaterThan(16);
    const events=await page.evaluate(()=>audioEvents.slice(0,16));
    schedules.push(events.map((event,index)=>({time:event.time-events[0].time,samples:event.samples})));
    for(let i=1;i<events.length;i++)expect(events[i].time-events[i-1].time).toBeCloseTo(0.025,8);
    await context.close();
  }
  for(let i=0;i<16;i++){expect(schedules[1][i].time).toBeCloseTo(schedules[0][i].time,8);expect(schedules[1][i].samples).toBe(schedules[0][i].samples);}
});

test('standalone reload resets state and all three original sounds play offline',async({browser})=>{
  const context=await browser.newContext();await context.addInitScript(traceAudio);const page=await context.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await ready(page,'/metronome/');
  await page.evaluate(()=>localStorage.setItem('vuex','existing Vue preferences'));
  await page.locator('input[type=text]').fill('177');await page.locator('input[type=text]').blur();
  const scope=await page.evaluate(async()=>{const r=await navigator.serviceWorker.ready;return r.scope});
  expect(new URL(scope).pathname).toBe('/metronome/');
  for(const sound of ['low','normal','high']) expect(await page.evaluate(async name=>!!await caches.match(`/metronome/assets/metronome-${name}.mp3`,{ignoreSearch:true}),sound)).toBe(true);
  await context.setOffline(true);
  for(let reload=0;reload<2;reload++){
    const responses=[];const listener=r=>{if(r.url().endsWith('.mp3'))responses.push(r.fromServiceWorker())};page.on('response',listener);
    await page.reload();await page.locator('.metronome-card').waitFor();
    await expect(page.getByLabel('Tempo in beats per minute')).toHaveValue('120');
    await expect(page.getByText('Beats: 4')).toBeVisible();
    await page.getByText('Subdivision: 1',{exact:true}).click();await page.getByText('Eighth',{exact:true}).click();
    await page.getByLabel('Start metronome').click();
    await expect.poll(()=>page.evaluate(()=>new Set(audioEvents.filter(e=>e.duration>0.005).map(e=>e.fingerprint)).size)).toBe(3);
    expect(responses.length).toBe(3);expect(responses.every(Boolean)).toBe(true);
    expect(await page.evaluate(()=>localStorage.getItem('vuex'))).toBe('existing Vue preferences');
    await page.getByLabel('Stop metronome').click();page.off('response',listener);
  }
  expect(errors).toEqual([]);await context.close();
});

test('embed loads independently, isolates CSS and shortcuts, resets and cleans up',async({browser},testInfo)=>{
  const context=await browser.newContext({viewport:{width:390,height:1000}});await context.addInitScript(traceAudio);
  const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('https://dave-drums.github.io/metronome/**',async route=>{
    const url=new URL(route.request().url());const response=await page.request.get(origin+url.pathname);await route.fulfill({response});
  });
  await page.goto(origin+'/host');
  await page.evaluate(async()=>{
    localStorage.setItem('vuex','host preferences');
    const mod=await import('https://dave-drums.github.io/metronome/embed/metronome.js');window.mountMetronome=mod.mountMetronome;
    window.metronome=await mountMetronome('#metronome-app');
  });
  await checkTheme(page);
  expect(await page.locator('#outside').evaluate(e=>getComputedStyle(e).backgroundColor)).toBe('rgb(255, 0, 0)');
  await page.locator('#outside').focus();await page.keyboard.press('ArrowUp');await expect(page.getByLabel('Tempo in beats per minute')).toHaveValue('120');
  await page.locator('.metronome-surface').focus();await page.keyboard.press('ArrowUp');await expect(page.getByLabel('Tempo in beats per minute')).toHaveValue('121');
  await page.getByLabel('Start metronome').click();await expect.poll(()=>page.evaluate(()=>audioEvents.filter(e=>e.duration>0.005).length)).toBeGreaterThan(1);
  await page.evaluate(()=>metronome.unmount());expect(await page.locator('#metronome-app').evaluate(e=>e.shadowRoot.childNodes.length)).toBe(0);
  const count=await page.evaluate(()=>audioEvents.length);await page.waitForTimeout(350);expect(await page.evaluate(()=>audioEvents.length)).toBe(count);
  await page.evaluate(async()=>{window.metronome=await mountMetronome('#metronome-app')});await expect(page.getByLabel('Tempo in beats per minute')).toHaveValue('120');
  expect(await page.evaluate(()=>localStorage.getItem('vuex'))).toBe('host preferences');
  expect(await page.locator('html').getAttribute('color-scheme')).toBe('host');
  expect(await page.evaluate(async()=>(await navigator.serviceWorker.getRegistrations()).length)).toBe(0);
  expect(errors).toEqual([]);await context.close();
});
