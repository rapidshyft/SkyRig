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

import {puppetDrawOrder,puppetBone} from '../src/puppet-geometry.mjs';
function piece(id,uid,handle,x=0,y=0){
 const figure={figure_type_id:id,name:'Piece '+handle,segment_count:1,segments:[{segment_id:1,parent_id:0,length:30,angle_rad:0,thickness:12,bend_rad:0,primitive_code:0,aux_code:0,flags:0,segment_type:'line',segment_kind:'line',color_rgb:[200,80,40],transparency:0,visible:true,z_order:1}],polyfills:[],image_assets:[],text_assets:[]};
 return {figure,object:createObject(figure,uid,x,y,{join:{target_object_slot:0,target_unique_id:1,target_handle_id:handle}})};
}
function puppetWithPieces(){
 const d=flatDocument(),right=piece(2,2,3),left=piece(3,3,5);
 d.figure_types.push(right.figure,left.figure);d.keyframes=[createFrame([d.keyframes[0].objects[0],right.object,left.object])];
 const e=new Editor({demo:false});e.load(d);e.select(1,-1);e.makePuppet();
 return e;
}
test('a flat puppet keeps its authored draw order and a turned one sorts parts and pieces by depth',()=>{
 const e=puppetWithPieces();
 const slots=g=>g.orderedObjects.map(o=>o.slot);
 assert.deepEqual(slots(e.geometry),[0,1,2]);
 const flat=e.geometry.objects.get(0).drawables.map(s=>s.seg.segment_id);
 assert.deepEqual(flat,flatDocument().figure_types[0].segments.map(s=>s.segment_id),'equal depth draws in the native order');
 e.select(1,0);e.setSpatialPose({turn:rad(90)});
 const g=e.geometry,body=g.objects.get(0),depthOf=id=>body.segments.find(s=>s.seg.segment_id===id).puppetDepth;
 assert.ok(depthOf(3)<-10&&depthOf(5)>10,'the arms turn to opposite depths');
 assert.ok(depthOf(4)<depthOf(3)&&depthOf(6)>depthOf(5));
 const order=body.drawables.map(s=>s.seg.segment_id);
 assert.ok(order.indexOf(4)<order.indexOf(3)&&order.indexOf(3)<order.indexOf(1)&&order.indexOf(1)<order.indexOf(5)&&order.indexOf(5)<order.indexOf(6),'far parts draw first, near parts last: '+order);
 assert.deepEqual(slots(g),[1,0,2],'the far piece draws behind the puppet and the near piece in front');
 assert.deepEqual(g.drawOrder,[1,0,2]);
 const fresh=buildGeometry(e.report,e.evaluatedFrame);
 assert.deepEqual(slots(fresh),[1,0,2]);assert.deepEqual(fresh.objects.get(0).drawables.map(s=>s.seg.segment_id),order);
 e.setSpatialPose({turn:rad(-90)});assert.deepEqual(slots(e.geometry),[2,0,1]);
 e.undo();e.undo();assert.deepEqual(slots(e.geometry),[0,1,2]);
});
test('pieces follow the bone they are joined to and plain joins keep their place',()=>{
 const e=puppetWithPieces(),g=e.geometry;
 assert.equal(puppetBone(g.objects.get(0),e.frame.objects[1]).seg.segment_id,3);
 assert.equal(puppetBone(g.objects.get(0),{join:{target_object_slot:0,target_handle_id:0}}),null);
 assert.equal(puppetBone(g.objects.get(1),e.frame.objects[2]),null,'a piece is not itself a puppet');
 const resolved=[[0,g.objects.get(0)],[1,g.objects.get(1)],[2,g.objects.get(2)]];
 assert.deepEqual(puppetDrawOrder(resolved,e.frame).map(([slot])=>slot),[0,1,2]);
 const other={...e.frame,objects:e.frame.objects.map(o=>({...o,join:null}))};
 assert.equal(puppetDrawOrder(resolved,other),resolved,'no puppet pieces: the authored order is returned as is');
});
test('pieces turn with the projected bone and scale with its stretch, for figures and movieclips alike',()=>{
 const e=puppetWithPieces();
 const inner={...emptyDocument(),figure_types:[defaultFigure(1)],keyframes:[createFrame([createObject(defaultFigure(1),1,0,0)])]};
 const clip=movieclipFigure(4,'Clip piece',inner,{duration:1,pivot:{x:0,y:0}});
 e.load({...e.serialize(),figure_types:[...e.report.figure_types,clip],keyframes:[createFrame([...e.frame.objects.map(o=>structuredClone(o)),createObject(clip,4,0,0,{join:{target_object_slot:0,target_unique_id:1,target_handle_id:4},_stykMovieclip:{mode:'single',offset:0}})])]});
 e.select(1,0);
 const before=e.geometry.objects.get(1);near(before.piece.rotation,0,1e-9);near(before.piece.scale,1,1e-9);
 e.setSpatialPose({turn:rad(90)});
 const g=e.geometry,body=g.objects.get(0),arm=body.segments.find(s=>s.seg.segment_id===3),forearm=body.segments.find(s=>s.seg.segment_id===4);
 assert.ok(Math.abs(arm.rigRotation)>.1,'the turned arm projects at a different angle than its channel');
 const pieceFigure=g.objects.get(1);
 near(pieceFigure.piece.rotation,arm.rigRotation,1e-9);
 near(pieceFigure.segments[0].angle,e.frame.objects[1].angles[0]+arm.rigRotation,1e-9);
 assert.deepEqual([pieceFigure.root.x,pieceFigure.root.y],[arm.end.x,arm.end.y],'a piece hangs from the joint of its bone');
 const pieceClip=g.objects.get(3);
 near(pieceClip.piece.rotation,forearm.rigRotation,1e-9);near(pieceClip.segments[0].angle,forearm.rigRotation,1e-9);
 e.select(1,2);e.setSpatialProportions({length:1.5});
 near(e.geometry.objects.get(1).piece.scale,1.5,1e-6);near(e.geometry.objects.get(1).segments[0].length,45,1e-6);
 const fresh=buildGeometry(e.report,e.evaluatedFrame);
 for(const slot of [1,3])assert.deepEqual(fresh.objects.get(slot).segments[0].points,e.geometry.objects.get(slot).segments[0].points);
});
import {spatialPerspectiveAvailable} from '../src/spatial-projection.mjs';
test('perspective is off by default and scales pieces by the depth of their joint when enabled',()=>{
 const e=puppetWithPieces();e.select(1,0);
 const flat=e.geometry.objects.get(1).segments[0].points.map(p=>[p.x,p.y]);
 assert.ok(spatialPerspectiveAvailable(e.frame.objects,e.object,e.report.figure_types),'a puppet with joined pieces offers perspective');
 near(e.getSpatialCamera().strength,0,1e-12);
 e.setSpatialPose({turn:rad(90)});
 const orthographic=e.geometry.objects.get(1);near(orthographic.piece.scale,1,1e-9);
 e.setSpatialCamera({strength:.8,distance:600});validateScene(e.serialize());
 const g=e.geometry,arm=g.objects.get(0).segments.find(s=>s.seg.segment_id===3),piece=g.objects.get(1);
 assert.ok(arm.end.rawPoint&&arm.end.rawPoint[2]<-10,'the far arm has a projected joint behind the figure plane');
 near(piece.piece.scale,1/(1-.8*arm.end.rawPoint[2]/600),1e-9);
 assert.ok(piece.piece.scale<1,'a far piece shrinks');assert.ok(g.objects.get(2).piece.scale>1,'a near piece grows');
 near(piece.segments[0].length,30*piece.piece.scale,1e-6);
 assert.deepEqual([piece.root.x,piece.root.y],[arm.end.x,arm.end.y]);
 e.setSpatialCamera({strength:0});e.setSpatialPose({turn:0});
 assert.deepEqual(e.geometry.objects.get(1).segments[0].points.map(p=>[p.x,p.y]),flat,'perspective off restores the flat drawing exactly');
 // Stretching a piece under perspective reaches the pointer, not a scaled copy of it.
 e.setSpatialPose({turn:rad(90)});e.setSpatialCamera({strength:.8,distance:600});
 const near1=e.geometry.objects.get(2);e.select(3,0);
 const target={x:near1.root.x+60,y:near1.root.y};e.poseJoint(target.x,target.y,{stretch:true,snap:false});
 const posed=e.geometry.objects.get(2).segments[0].end;near(posed.x,target.x,.01);near(posed.y,target.y,.01);
});
test('plain joins to other 3D figures keep the perspective restriction',()=>{
 const d=flatDocument(),e=new Editor({demo:false});
 const figure=puppetDefinition(d.figure_types[0]);delete figure._styk.puppet;
 const extra=piece(2,2,3);
 e.load({...d,figure_types:[figure,extra.figure],keyframes:[createFrame([createObject(figure,1,300,260),extra.object])]});e.select(1,0);
 assert.equal(spatialPerspectiveAvailable(e.frame.objects,e.object,e.report.figure_types),false);
 assert.throws(()=>e.setSpatialCamera({strength:.5}),/single spatial figure/);
});
