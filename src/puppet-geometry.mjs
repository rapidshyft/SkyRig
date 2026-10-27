/** Derived depth order for cut-out puppets. Depth comes from the evaluated
 * bones of the same pose; nothing is stored in the document or kept between
 * poses. Ordinary figures and older files keep their painter order. */
import {isPuppet,puppetPieceView,puppetViewSector,puppetViewShown,puppetViewMirrored} from './puppet.mjs';
import {projection} from './spatial-projection.mjs';
import {spatialViewInterpolation} from './rig-spatial.mjs';
// Depth dominates; the native drawing order breaks ties at equal depth, so a
// flat pose draws exactly as the figure did before it became a puppet.
export const DEPTH_ORDER_SCALE=65536;
export const depthOrder=(depth,order)=>depth*DEPTH_ORDER_SCALE+order;
/** The bone a joined object follows: the puppet segment whose joint it is
 * attached to. The figure origin and plain joins give null. */
export function puppetBone(parent,object){
  if(!parent||!object?.join||!isPuppet(parent.fig))return null;
  const handle=Number(object.join.target_handle_id??0);
  if(!handle)return null;
  const bone=parent.segments.find(s=>s?.seg.segment_id===handle);
  return bone?.puppetDepth===undefined?null:bone;
}
/** How a joined piece follows its bone: it turns with the bone's projected
 * rotation about the joint it hangs from, scales with the bone's stretch and,
 * when the puppet has perspective, with the depth of that joint. The piece's
 * own angle, length and scale channels stay relative offsets. */
export function puppetPiece(bone,parent,object){
  const camera=projection(parent.obj,parent.root),raw=bone.end.rawPoint;
  const depthScale=camera&&raw?1/Math.max(.05,1-camera.k*raw[2]):1;
  const piece={rotation:bone.rigRotation??0,scale:(bone.spatialFrame?.stretch??1)*depthScale,depth:bone.puppetDepth,heading:puppetHeading(bone,parent)};
  const view=puppetPieceView(object);
  if(view){piece.view=view;if(puppetViewMirrored(view,piece.heading)){piece.mirror=true;piece.axis=bone.angle;}}
  return piece;
}
/** Which way a bone faces on screen: its turn about the vertical axis, reflected
 * for a flipped puppet. A bone seen end-on has no heading and faces front. */
export function puppetHeading(bone,parent){
  const frame=bone.spatialFrame;if(!frame)return 0;
  const v=spatialViewInterpolation(frame);
  return v.strength>0?(parent.obj.image_text_flags?-v.yaw:v.yaw):0;
}
/** Resolved [slot, geometry] pairs in painter order, with each puppet and the
 * pieces joined to its bones sorted back to front where the first of them was.
 * Pieces at equal depth, and the puppet itself at depth zero, keep their
 * authored order. Pieces tagged with a view other than the one their bone
 * shows are left out and reported in `hidden`. Returns the input when no
 * puppet has pieces. */
export function puppetDrawOrder(resolved,frame){
  const bySlot=new Map(resolved),groups=new Map(),position=new Map(resolved.map(([slot],i)=>[slot,i])),views=new Map(),hidden=new Set();
  for(const [slot,g] of resolved){
    const object=frame.objects[slot];if(!g||!object?.join)continue;
    const parentSlot=Number(object.join.target_object_slot),parent=bySlot.get(parentSlot),bone=puppetBone(parent,object);
    if(!bone)continue;
    let group=groups.get(parentSlot);
    if(!group){group=[{slot:parentSlot,depth:0}];groups.set(parentSlot,group);}
    group.push({slot,depth:bone.puppetDepth});
    const view=puppetPieceView(object);
    if(view){const key=`${parentSlot}:${bone.seg.segment_id}`;let tagged=views.get(key);if(!tagged){tagged={bone,parent,pieces:[]};views.set(key,tagged);}tagged.pieces.push({slot,view});}
  }
  if(!groups.size)return resolved;
  for(const {bone,parent,pieces} of views.values()){
    const shown=puppetViewShown(puppetViewSector(puppetHeading(bone,parent)),new Set(pieces.map(p=>p.view)));
    for(const p of pieces)if(p.view!==shown)hidden.add(p.slot);
  }
  const owner=new Map();
  for(const [parentSlot,group] of groups){
    // Equal depth within rounding keeps the authored order.
    group.sort((a,b)=>(Math.abs(a.depth-b.depth)>1e-6?a.depth-b.depth:0)||(position.get(a.slot)-position.get(b.slot)));
    for(const member of group)owner.set(member.slot,group);
  }
  const emitted=new Set(),result=[];
  for(const [slot,g] of resolved){
    if(emitted.has(slot))continue;
    const group=owner.get(slot);
    if(!group){result.push([slot,g]);continue;}
    for(const member of group){emitted.add(member.slot);if(!hidden.has(member.slot))result.push([member.slot,bySlot.get(member.slot)]);}
  }
  if(hidden.size)result.hidden=hidden;
  return result;
}
