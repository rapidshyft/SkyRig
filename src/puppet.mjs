import {messageError} from './localized-error.mjs';
/** Cut-out puppets: an ordinary figure whose bones turn in depth. Conversion
 * derives articulated rest bones from the figure's authored rest pose and adds
 * hidden turn/tilt controls per bone. Posing, saving, undo and playback then use
 * the existing articulated rig channels; no second skeleton or pose store. */
import {spatialBone,hasSpatialRig} from './rig-spatial.mjs';
import {isMovieclip} from './movieclips.mjs';
export const PUPPET_VERSION=1;
export const isPuppet=figure=>Boolean(figure?._styk?.puppet);
/** The puppet tools are shown in the browser editor only. Files that contain a
 * puppet still open and play back the same everywhere. */
export const puppetToolsAvailable=(environment=globalThis)=>!environment.stykDesktop;
/** Segments that become bones: everything that is drawn or carries a joint. */
const boneSegment=s=>!s._stykRig;
export function puppetConvertible(figure){
 if(!figure||isMovieclip(figure)||figure._styk?.drawing||figure._styk?.spatialMesh)return false;
 if(isPuppet(figure)||hasSpatialRig(figure))return false;
 if(!figure.segments?.length||figure.segments.some(s=>s._stykRig))return false;
 return true;
}
/** A new definition whose segments are spatial bones at the figure's rest pose.
 * Every existing segment keeps its ID, artwork and channels; two zero-length
 * static controls per bone carry its turn and tilt angles. */
export function puppetDefinition(figure){
 if(!figure||isMovieclip(figure)||figure._styk?.drawing)throw messageError(new Error(''), "errors.puppet.chooseAFigureToMakeA3dPuppet", {});
 if(isPuppet(figure)||hasSpatialRig(figure))throw messageError(new Error(''), "errors.puppet.thisFigureIsAlreadyA3dFigure", {});
 if(figure._styk?.spatialMesh||figure.segments.some(s=>s._stykRig))throw messageError(new Error(''), "errors.puppet.thisFigureUsesRigRelationshipsConvertAPlain", {});
 const segments=figure.segments,byId=new Map(segments.map(s=>[s.segment_id,s])),ends=new Map([[0,[0,0]]]);
 const endOf=id=>{
  let end=ends.get(id);if(end)return end;
  const s=byId.get(id);if(!s)throw messageError(new Error(''), "errors.puppet.theFigureHasAMissingParentOrACycle", {});
  const start=endOf(Number(s.parent_id)),angle=Number(s.angle_rad??0),length=Number(s.length??0);
  end=[start[0]+length*Math.cos(angle),start[1]+length*Math.sin(angle)];ends.set(id,end);return end;
 };
 let nextId=segments.reduce((max,s)=>Math.max(max,Number(s.segment_id)),0);
 const control=(name,suffix)=>({segment_id:++nextId,parent_id:0,length:0,angle_rad:0,thickness:0,bend_rad:0,primitive_code:0,aux_code:1,flags:256,
  segment_type:'line',segment_kind:'line',color_rgb:[0,0,0],transparency:0,visible:false,z_order:nextId,name:`${name} ${suffix}`});
 const converted=[],controls=[];
 for(const s of segments){
  if(!boneSegment(s)){converted.push(structuredClone(s));continue;}
  const parent=Number(s.parent_id),origin=endOf(parent),tip=endOf(s.segment_id),name=s.name||`Part ${s.segment_id}`;
  const turn=control(name,'turn'),pitch=control(name,'tilt');controls.push(turn,pitch);
  converted.push({...structuredClone(s),_stykRig:{spatial:{parent,origin:[origin[0],origin[1],0],tip:[tip[0],tip[1],0],turn:turn.segment_id,pitch:pitch.segment_id}}});
 }
 const result={...figure,segments:[...converted,...controls],_styk:{...figure._styk,puppet:{version:PUPPET_VERSION}}};
 result.segment_count=result.segments.length;
 return result;
}
export function validatePuppet(figure){
 const p=figure._styk?.puppet;
 if(!p||typeof p!=='object'||Array.isArray(p)||Object.keys(p).some(k=>k!=='version')||p.version!==PUPPET_VERSION)throw messageError(new Error(''), "errors.puppet.invalidPuppetSettings", {});
 if(!figure.segments.some(spatialBone))throw messageError(new Error(''), "errors.puppet.aPuppetNeedsArticulatedBones", {});
}
