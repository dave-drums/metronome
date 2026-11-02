import { test, expect } from '@playwright/test';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';

const origin='http://127.0.0.1:4191';
async function ready(page,url) {
  await page.goto(new URL(url,origin).href); await page.locator('.metronome-card').waitFor();
  await page.evaluate(()=>document.fonts.ready);
}
async function compare(testInfo, reference, migrated, name) {
  // Compare content at the same viewport origin. Different host headers otherwise
  // produce fractional raster offsets even when every computed size is identical.
  for (const locator of [reference,migrated]) await locator.evaluate(element=>{
    const rect=element.getBoundingClientRect();
    element.dataset.testOriginalStyle=element.getAttribute('style')||'';
    Object.assign(element.style,{position:'fixed',top:'0',left:'0',width:`${rect.width}px`,transform:'none',margin:'0',zIndex:'2147483647'});
    const backing=document.createElement('div');backing.dataset.visualBacking='true';
    Object.assign(backing.style,{position:'fixed',inset:'0',background:'#f8f9fa',zIndex:'2147483646'});
    element.parentElement.append(backing);
  });
  const options={animations:'disabled',caret:'hide'};
  const a=await reference.screenshot(options),b=await migrated.screenshot(options);
  await testInfo.attach(`${name}-vault`,{body:a,contentType:'image/png'});
  await testInfo.attach(`${name}-react`,{body:b,contentType:'image/png'});
  const source=PNG.sync.read(a),target=PNG.sync.read(b);
  const measure=element=>{
    const base=element.getBoundingClientRect();
    return [element,...element.querySelectorAll('*')].map(e=>{
      const r=e.getBoundingClientRect(),s=getComputedStyle(e);
      return {tag:e.tagName,x:Math.round((r.x-base.x)*100)/100,y:Math.round((r.y-base.y)*100)/100,width:Math.round(r.width*100)/100,height:Math.round(r.height*100)/100,
        font:s.fontFamily.replaceAll('DaveDrumsMetronomeInter, Inter','Inter').replaceAll('DaveDrumsMetronome',''),size:s.fontSize,weight:s.fontWeight,line:s.lineHeight,color:s.color,bg:s.background,padding:s.padding,margin:s.margin};
    });
  };
  const measurements=[await reference.evaluate(measure),await migrated.evaluate(measure)];
  const differences=measurements[0].flatMap((item,index)=>JSON.stringify(item)===JSON.stringify(measurements[1][index])?[]:[{index,source:item,target:measurements[1][index]}]);
  await testInfo.attach(name+'-geometry',{body:JSON.stringify(differences,null,2),contentType:'application/json'});
  expect(differences,`${name} layout and computed styles must match Vault`).toEqual([]);
  expect(target.width).toBe(source.width);expect(target.height).toBe(source.height);
  const diff=new PNG({width:source.width,height:source.height});
  const changed=pixelmatch(source.data,target.data,diff.data,source.width,source.height,{threshold:0.1});
  await testInfo.attach(name+'-diff',{body:PNG.sync.write(diff),contentType:'image/png'});
  for(const locator of [reference,migrated])await locator.evaluate(element=>{element.parentElement.querySelector('[data-visual-backing]').remove();element.setAttribute('style',element.dataset.testOriginalStyle);delete element.dataset.testOriginalStyle});
  expect(changed,`${name} must match the unmodified Vault component`).toBe(0);
}
for(const width of [1280,390,320]) test(`original Vault appearance at ${width}px`,async({browser},testInfo)=>{
  const context=await browser.newContext({viewport:{width,height:1000}});
  const original=await context.newPage(), migrated=await context.newPage();
  await ready(original,'/reference/'); await ready(migrated,'/metronome/');
  await compare(testInfo,original.locator('.metronome-card'),migrated.locator('.metronome-card'),'card');
  for(const [trigger,title]of [
    ['.metronome-card > div:nth-child(3) > button:first-child','Tempo Trainer'],
    ['text=Beats per Bar: 4','Beats per Bar'],['text=Subdivision: 1','Subdivision']
  ]){
    await original.locator(trigger).click();await migrated.locator(trigger).click();
    const a=original.getByRole('heading',{name:title,exact:true}).locator('../..');
    const b=migrated.getByRole('heading',{name:title,exact:true}).locator('../..');
    await compare(testInfo,a,b,title);
    await a.getByRole('button',{name:'×',exact:true}).click();await b.getByRole('button',{name:'×',exact:true}).click();
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
    await expect(page.getByText('Beats per Bar: 4')).toBeVisible();
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
  const original=await context.newPage();await ready(original,'/reference/');
  await compare(testInfo,original.locator('.metronome-card'),page.locator('.metronome-card'),'embedded-card');await original.close();
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
