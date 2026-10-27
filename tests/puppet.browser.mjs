// 3D cut-out puppets in the browser editor: Make 3D puppet, view drawings
// picked by a bone's turn, depth order and optional perspective. Screenshots
// go to artifacts/puppet, or STYK_PUPPET_SHOTS (docs/3d holds the published set).
import {chromium} from './support/playwright.mjs';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {puppetDemoDocument} from './helpers/puppet-demo.mjs';
const out=process.env.STYK_PUPPET_SHOTS??'artifacts/puppet';await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto(process.env.STYK_URL??'http://127.0.0.1:47851');await page.waitForFunction(()=>window.styk?.ready);
 // The document is built here and handed over, so the test also runs against the built site.
 await page.evaluate(doc=>{
  for(const d of document.querySelectorAll('dialog[open]'))d.close();
  styk.editor.load(doc);styk.editor.select(1,-1);styk.state.onion=false;styk.state.settings.autosaveSeconds=0;styk.fit();
 },puppetDemoDocument());
 // Documentation shots: hide joint markers and zoom on the puppet.
 await page.getByRole('button',{name:'Joints',exact:true}).click();
 await page.evaluate(()=>{const r=document.getElementById('viewport').getBoundingClientRect(),v=styk.state.view;v.scale=1.8;v.x=r.width/2-480*v.scale;v.y=r.height/2-300*v.scale;window.dispatchEvent(new Event('resize'));});
 const settle=()=>page.waitForTimeout(350);
 const state=()=>page.evaluate(()=>{const e=styk.editor,g=e.geometry;return {puppet:Boolean(e.figure?._styk?.puppet),order:g.orderedObjects.map(o=>o.slot),hidden:[...(g.hiddenSlots??[])],undo:e._undo.length};});
 const shot=name=>page.screenshot({path:`${out}/${name}.png`});
 // 1. Make 3D puppet from the Properties panel.
 const make=page.getByRole('button',{name:'Make 3D puppet',exact:true});await make.scrollIntoViewIfNeeded();await settle();await shot('01-make-puppet');
 const flat=await page.evaluate(()=>styk.editor.serialize());
 await make.click();await settle();
 let s=await state();assert.equal(s.puppet,true,'the figure became a puppet');assert.deepEqual(s.hidden,[11],'facing front, the side head drawing is hidden');
 assert.equal(await make.count(),0,'the conversion is offered once');
 await page.evaluate(()=>styk.editor.undo());assert.deepEqual(await page.evaluate(()=>styk.editor.serialize()),flat,'one Undo restores the flat figure exactly');
 await page.evaluate(()=>styk.editor.redo());await settle();
 // 2. The view of a piece is chosen in its own Properties section.
 await page.evaluate(()=>styk.editor.select(11,0));await settle();
 const view=page.locator('select[data-puppet-view]');await view.scrollIntoViewIfNeeded();
 assert.equal(await view.inputValue(),'front');
 await view.selectOption('side');await settle();
 assert.equal(await page.evaluate(()=>styk.editor.frame.objects[10]._stykPuppetView),'side');
 await view.selectOption('front');await settle();await shot('02-piece-view');
 await page.evaluate(()=>styk.editor.select(11,-1));
 // 3. Turn the whole puppet: the side drawing takes over and far pieces draw first.
 // Select the puppet first: the Body index is looked up on the selected figure.
 const turn=degrees=>page.evaluate(d=>{const e=styk.editor;e.select(1,-1);e.select(1,e.figure.segments.findIndex(s=>s.name==='Body'));if(!e.setSpatialPose({turn:d*Math.PI/180},{wholeFigure:true}))throw new Error('turn not applied');e.select(1,-1);},degrees);
 await turn(80);await settle();s=await state();
 assert.deepEqual(s.hidden,[10],'turned to the side, the front head drawing is hidden');
 const slotOf=name=>page.evaluate(n=>styk.editor.frame.objects.find(o=>styk.editor.report.figure_types.find(f=>f.figure_type_id===o.figure_type_id).name===n).object_slot,name);
 // A positive turn faces the viewer's right, so the right arm swings behind.
 const far=await slotOf('Right upper arm'),near=await slotOf('Left upper arm'),torso=await slotOf('Torso');
 assert.ok(s.order.indexOf(far)<s.order.indexOf(torso)&&s.order.indexOf(torso)<s.order.indexOf(near),`far arm, torso, near arm: ${s.order}`);
 await shot('03-side-view');
 await turn(-80);await settle();s=await state();
 assert.deepEqual(s.hidden,[10]);assert.ok(s.order.indexOf(near)<s.order.indexOf(torso)&&s.order.indexOf(torso)<s.order.indexOf(far),'turned the other way, the order reverses');
 assert.equal(await page.evaluate(()=>styk.editor.geometry.objects.get(11).piece.mirror),true,'the side drawing is mirrored for the far side');
 await shot('04-mirrored-side');
 // 4. Perspective from the Properties slider, off by default.
 await turn(30);
 await page.evaluate(()=>{const e=styk.editor;e.select(1,e.figure.segments.findIndex(s=>s.segment_id===3));e.setSpatialPose({pitch:70*Math.PI/180});e.select(1,-1);});await settle();
 assert.equal(await page.evaluate(()=>styk.editor.getSpatialCamera().strength),0);
 const forearm=await slotOf('Right forearm');
 const before=await page.evaluate(slot=>styk.editor.geometry.objects.get(slot).piece.scale,forearm);assert.ok(Math.abs(before-1)<1e-9,'no perspective: pieces keep their size');
 await page.locator('[data-section-toggle=spatial-perspective]').click();
 const camera=page.getByRole('slider',{name:'Perspective',exact:true});await camera.scrollIntoViewIfNeeded();await camera.focus();await camera.press('End');await settle();
 assert.equal(await page.evaluate(()=>styk.editor.getSpatialCamera().strength),1);
 const after=await page.evaluate(slot=>styk.editor.geometry.objects.get(slot).piece.scale,forearm);assert.ok(after>1.05,`a forearm reaching toward the camera grows: ${after}`);
 await shot('05-perspective');
 await page.evaluate(()=>{const r=document.getElementById('inspector');if(r.scrollWidth>r.clientWidth+1)throw new Error('Properties panel overflows');});
 assert.deepEqual(errors,[]);
 await writeFile(`${out}/browser.json`,JSON.stringify({passed:true,order:s.order,hidden:s.hidden},null,2));
 console.log('Puppet UI: conversion and undo, piece view selector, depth order and mirroring at both turns, perspective slider, layout and console checks passed.');
}finally{await browser.close();}
