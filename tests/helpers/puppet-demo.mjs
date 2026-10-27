/** A cut-out puppet demo: the starter stick figure with card-shaped pieces
 * joined to its joints, including front and side head drawings. Shared by the
 * puppet browser test and the documentation screenshots. */
import {emptyDocument,defaultFigure,createObject,createFrame} from '../../src/demo.mjs';
const line=(id,parent,length,angle,extra={})=>({segment_id:id,parent_id:parent,length,angle_rad:angle,thickness:2,bend_rad:0,primitive_code:0,aux_code:0,flags:0,
  segment_type:'line',segment_kind:'line',color_rgb:[48,40,36],transparency:0,visible:true,z_order:id,...extra});
/** A closed card: `points` are corners relative to the joint the piece hangs from. */
function card(id,name,points,color,details=[]){
  const segments=[],polyfills=[];
  let parent=0,from=[0,0];
  const add=(to,extra)=>{const dx=to[0]-from[0],dy=to[1]-from[1];segments.push(line(segments.length+1,parent,Math.hypot(dx,dy),Math.atan2(dy,dx),extra));parent=segments.length;from=to;return parent;};
  const corners=points.map(p=>add(p));
  polyfills.push({segment_ids:corners,color_rgb:color,color_alpha:1,z_order:-1});
  for(const detail of details){
    parent=0;from=[0,0];const ids=detail.points.map(p=>add(p,{thickness:0,visible:false}));
    polyfills.push({segment_ids:ids,color_rgb:detail.color,color_alpha:1,z_order:polyfills.length});
  }
  return {figure_type_id:id,name,segment_count:segments.length,segments,polyfills,image_assets:[],text_assets:[]};
}
const rectangle=(length,width)=>[[0,-width/2],[-length,-width/2],[-length,width/2],[0,width/2]];
const polygon=(cx,cy,r,n=10)=>Array.from({length:n},(_,i)=>[cx+r*Math.cos(i/n*2*Math.PI),cy+r*Math.sin(i/n*2*Math.PI)]);
const SKIN=[245,205,170],SHIRT=[62,140,210],SLEEVE=[40,105,170],TROUSER=[90,80,120],SHIN=[70,60,100],INK=[48,40,36];
export function puppetDemoDocument(){
  const figure=defaultFigure(1);figure.name='Puppet';
  for(const s of figure.segments){s.thickness=0;s.visible=false;}
  const body=createObject(figure,1,480,300);
  const pieces=[],types=[figure];
  let nextType=2,nextUid=2;
  const attach=(definition,handle,angle,view)=>{
    types.push(definition);
    const object=createObject(definition,nextUid++,0,0,{join:{target_object_slot:0,target_unique_id:1,target_handle_id:handle}});
    object.angles=object.angles.map(a=>a+angle);
    if(view)object._stykPuppetView=view;
    pieces.push(object);
  };
  const bone=id=>figure.segments.find(s=>s.segment_id===id).angle_rad;
  // Limbs first so the torso and head draw over them while everything is flat.
  attach(card(nextType++,'Right upper arm',rectangle(53,16),SLEEVE),3,bone(3));
  attach(card(nextType++,'Right forearm',rectangle(48,13),SKIN),4,bone(4));
  attach(card(nextType++,'Left upper arm',rectangle(53,16),SLEEVE),5,bone(5));
  attach(card(nextType++,'Left forearm',rectangle(48,13),SKIN),6,bone(6));
  attach(card(nextType++,'Right thigh',rectangle(66,20),TROUSER),7,bone(7));
  attach(card(nextType++,'Right shin',rectangle(63,16),SHIN),8,bone(8));
  attach(card(nextType++,'Left thigh',rectangle(66,20),TROUSER),9,bone(9));
  attach(card(nextType++,'Left shin',rectangle(63,16),SHIN),10,bone(10));
  attach(card(nextType++,'Torso',[[0,-24],[-78,-30],[-78,30],[0,24]],SHIRT),1,bone(1));
  // The head hangs from the top joint of the head segment: two drawings, one per view.
  // Piece x runs along the bone (negative x back toward its start), piece y to
  // the viewer's right of a bone that points up.
  attach(card(nextType++,'Head · front',polygon(-22,0,25),SKIN,[
    {points:polygon(-26,-9,3.5,8),color:INK},{points:polygon(-26,9,3.5,8),color:INK},
    {points:[[-14,-7],[-10,0],[-14,7],[-16,0]],color:[220,120,110]}]),2,bone(2),'front');
  const ring=polygon(-22,0,25,12);
  attach(card(nextType++,'Head · side',[...ring.slice(0,3),[-30,33],[-20,33],...ring.slice(4)],SKIN,[
    {points:polygon(-28,12,3.5,8),color:INK},{points:[[-13,16],[-10,24],[-16,23]],color:[220,120,110]}]),2,bone(2),'side');
  return {...emptyDocument(),figure_types:types,keyframes:[createFrame([body,...pieces])]};
}
