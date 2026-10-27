/** Derived depth order for cut-out puppets. Depth comes from the evaluated
 * bones of the same pose; nothing is stored in the document or kept between
 * poses. Ordinary figures and older files keep their painter order. */
import {isPuppet} from './puppet.mjs';
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
 * rotation about the joint it hangs from and scales with the bone's stretch.
 * The piece's own angle, length and scale channels stay relative offsets. */
export function puppetPiece(bone){
  return {rotation:bone.rigRotation??0,scale:bone.spatialFrame?.stretch??1,depth:bone.puppetDepth};
}
/** Resolved [slot, geometry] pairs in painter order, with each puppet and the
 * pieces joined to its bones sorted back to front where the first of them was.
 * Pieces at equal depth, and the puppet itself at depth zero, keep their
 * authored order. Returns the input when no puppet has pieces. */
export function puppetDrawOrder(resolved,frame){
  const bySlot=new Map(resolved),groups=new Map(),position=new Map(resolved.map(([slot],i)=>[slot,i]));
  for(const [slot,g] of resolved){
    const object=frame.objects[slot];if(!g||!object?.join)continue;
    const parentSlot=Number(object.join.target_object_slot),bone=puppetBone(bySlot.get(parentSlot),object);
    if(!bone)continue;
    let group=groups.get(parentSlot);
    if(!group){group=[{slot:parentSlot,depth:0}];groups.set(parentSlot,group);}
    group.push({slot,depth:bone.puppetDepth});
  }
  if(!groups.size)return resolved;
  const owner=new Map();
  for(const [parentSlot,group] of groups){
    group.sort((a,b)=>(a.depth-b.depth)||(position.get(a.slot)-position.get(b.slot)));
    for(const member of group)owner.set(member.slot,group);
  }
  const emitted=new Set(),result=[];
  for(const [slot,g] of resolved){
    if(emitted.has(slot))continue;
    const group=owner.get(slot);
    if(!group){result.push([slot,g]);continue;}
    for(const member of group){emitted.add(member.slot);result.push([member.slot,bySlot.get(member.slot)]);}
  }
  return result;
}
