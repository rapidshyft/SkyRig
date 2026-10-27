import test from 'node:test';import assert from 'node:assert/strict';
import {puppetDefinition,puppetConvertible,isPuppet,validatePuppet,puppetToolsAvailable} from '../src/puppet.mjs';
import {emptyDocument,defaultFigure,createObject,createFrame} from '../src/demo.mjs';
import {buildGeometry,evaluatedFrame} from '../src/pivot/geometry.mjs';
import {validateScene} from '../src/pivot/model.mjs';
import {Editor} from '../src/editor.mjs';
import {buildContainerV2,decodeDocument} from '../src/native-container.mjs';
import {movieclipFigure} from '../src/movieclips.mjs';
const rad=d=>d*Math.PI/180;
const near=(a,b,t=.01)=>assert.ok(Math.abs(a-b)<t,`${a} != ${b}`);
function flatDocument(){
 const figure=defaultFigure(1);figure.name='Stick';
 const object=createObject(figure,1,300,260);
 return {...emptyDocument(),figure_types:[figure],keyframes:[createFrame([object])]};
}
const joints=g=>[...g.joints].map(([id,p])=>[id,p.x,p.y]);
test('a puppet definition keeps every joint at its rest and posed position',()=>{
 const d=flatDocument(),figure=d.figure_types[0],object=d.keyframes[0].objects[0];
 object.angles[3]+=rad(40);object.angles[5]-=rad(25);
 const before=joints(buildGeometry(d,d.keyframes[0]).objects.get(0));
 const puppet=puppetDefinition(figure);
 assert.ok(isPuppet(puppet));assert.equal(puppet.segments.length,figure.segments.length*3);
 for(const s of figure.segments)assert.deepEqual(puppet.segments.find(p=>p.segment_id===s.segment_id)._stykRig.spatial.parent,s.parent_id);
 assert.doesNotThrow(()=>validatePuppet(puppet));
 const e=new Editor({demo:false});e.load(d);e.select(1,-1);
 assert.ok(e.canMakePuppet());e.makePuppet();
 assert.ok(isPuppet(e.figure));assert.ok(!e.canMakePuppet());
 const after=joints(e.geometry.objects.get(0)).filter(([id])=>id===0||figure.segments.some(s=>s.segment_id===id));
 assert.equal(after.length,before.length);
 for(let i=0;i<before.length;i++){assert.equal(after[i][0],before[i][0]);near(after[i][1],before[i][1]);near(after[i][2],before[i][2]);}
 validateScene(e.serialize());
});
test('puppet bones turn in depth with the existing articulated controls and undo restores the flat figure',async()=>{
 const d=flatDocument(),e=new Editor({demo:false});e.load(d);e.select(1,-1);
 const flat=e.serialize();e.makePuppet();
 const converted=e.serialize();
 const index=e.figure.segments.findIndex(s=>s.segment_id===1);e.select(1,index);
 const before=e.geometry.objects.get(0).joints.get(1);
 assert.ok(e.getSpatialPose());e.setSpatialPose({pitch:rad(90)});
 const g=e.geometry.objects.get(0),turned=g.joints.get(1);
 near(Math.abs(turned.depthOffset.x),78,.5);
 near(Math.hypot(turned.x-g.root.x,turned.y-g.root.y),0,.5);
 assert.notDeepEqual([turned.x,turned.y],[before.x,before.y]);
 near(e.getSpatialPose().pitch,rad(90),1e-9);
 const fresh=buildGeometry(e.report,e.evaluatedFrame);assert.deepEqual(joints(e.geometry.objects.get(0)),joints(fresh.objects.get(0)));
 e.undo();assert.deepEqual(e.serialize(),converted);e.undo();assert.deepEqual(e.serialize(),flat);
 e.redo();e.redo();
 const decoded=(await decodeDocument(await buildContainerV2(e.serialize(),'styk'),'styk')).document;
 assert.ok(isPuppet(decoded.figure_types[0]));
 assert.deepEqual(joints(buildGeometry(decoded,evaluatedFrame(decoded,0,0,0)).objects.get(0)),joints(e.geometry.objects.get(0)));
});
test('curved segments keep their arcs on a puppet',()=>{
 const d=flatDocument();d.keyframes[0].objects[0].bend_flag=1;d.keyframes[0].objects[0].bends=d.figure_types[0].segments.map(()=>0);d.keyframes[0].objects[0].bends[3]=rad(60);
 const flat=buildGeometry(d,d.keyframes[0]).objects.get(0).segments[3];
 const e=new Editor({demo:false});e.load(d);e.select(1,-1);e.makePuppet();
 const bent=e.geometry.objects.get(0).segments[3];
 // A rigid bone ends at its straight tip; the curve bulges between the joints.
 assert.ok(bent.points.length>2&&Math.abs(bent.bend-rad(60))<1e-9&&Math.abs(flat.bend-rad(60))<1e-9);
 near(bent.points[0].x,flat.points[0].x);near(bent.points[0].y,flat.points[0].y);
 const g=e.geometry.objects.get(0),tip=g.joints.get(4);near(bent.points.at(-1).x,tip.x);near(bent.points.at(-1).y,tip.y);
 near(Math.hypot(tip.x-bent.points[0].x,tip.y-bent.points[0].y),48);
 e.undo();assert.equal(e.geometry.objects.get(0).segments[3].points.length,flat.points.length);
});
test('conversion is offered for plain figures only and old documents stay untouched',()=>{
 const d=flatDocument();
 const clip=movieclipFigure(2,'Clip',{...emptyDocument(),figure_types:[defaultFigure(1)],keyframes:[createFrame([createObject(defaultFigure(1),1,0,0)])]},{duration:1,pivot:{x:0,y:0}});
 assert.equal(puppetConvertible(clip),false);assert.throws(()=>puppetDefinition(clip),/figure/);
 const rig={...d.figure_types[0],segments:d.figure_types[0].segments.map((s,i)=>i===2?{...s,_stykRig:{stretch:{restLength:10,min:0,max:1,width:'keep'}}}:s)};
 assert.equal(puppetConvertible(rig),false);assert.throws(()=>puppetDefinition(rig),/plain figure/);
 const puppet=puppetDefinition(d.figure_types[0]);assert.throws(()=>puppetDefinition(puppet),/already/);
 assert.throws(()=>validatePuppet({...puppet,_styk:{puppet:{version:2}}}),/Invalid/);
 assert.throws(()=>validatePuppet({...d.figure_types[0],_styk:{puppet:{version:1}}}),/bones/);
 assert.doesNotThrow(()=>validateScene(d));
 assert.equal(puppetToolsAvailable({}),true);assert.equal(puppetToolsAvailable({stykDesktop:{}}),false);
});
