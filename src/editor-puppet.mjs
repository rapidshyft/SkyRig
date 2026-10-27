import {messageError} from './localized-error.mjs';
import {puppetDefinition,puppetConvertible,PUPPET_VIEWS,puppetPieceView} from './puppet.mjs';
import {isPuppet} from './puppet.mjs';
/** Puppet commands are definition edits through the ordinary topology history. */
export const editorPuppetMethods={
 canMakePuppet(figureTypeId=this.figure?.figure_type_id){
  return puppetConvertible(this.report.figure_types.find(f=>f.figure_type_id===figureTypeId));
 },
 /** Turn an ordinary figure into a cut-out puppet whose bones turn in depth.
  * Every instance keeps its current pose; one Undo restores the flat figure. */
 makePuppet(figureTypeId=this.figure?.figure_type_id){
  const figure=this.report.figure_types.find(f=>f.figure_type_id===figureTypeId);
  if(!figure)throw messageError(new Error(''), "errors.puppet.chooseAFigureToMakeA3dPuppet", {});
  const definition=puppetDefinition(figure);
  return this.replaceFigureDefinition(figureTypeId,definition,{label:'Make 3D puppet'});
 },
 /** The bone of the selected object when it is a piece of a cut-out puppet. */
 puppetPieceBone(object=this.object){
  if(!object?.join)return null;
  const parent=this.selectionFrame.objects[object.join.target_object_slot],figure=this.report.figure_types.find(f=>f.figure_type_id===parent?.figure_type_id);
  if(!isPuppet(figure))return null;
  return figure.segments.find(s=>s.segment_id===object.join.target_handle_id&&s._stykRig?.spatial?.origin)??null;
 },
 getPuppetView(){return this.puppetPieceBone()?puppetPieceView(this.object)??null:undefined;},
 /** Tag the selected piece with the view it draws (or null to always show it)
  * on every frame it appears in; one undo step. */
 setPuppetView(view){
  if(!this.puppetPieceBone())throw messageError(new Error(''), "errors.puppet.selectAPieceJoinedToA3dPuppet", {});
  if(view!==null&&!PUPPET_VIEWS.includes(view))throw messageError(new Error(''), "errors.puppet.chooseAViewForThePiece", {});
  if((puppetPieceView(this.object)??null)===view)return false;
  if(this._drag)this.commitDrag();
  this._editMovieclipPoses('Set piece view',object=>{if(view)object._stykPuppetView=view;else delete object._stykPuppetView;});
  return true;
 },
};
