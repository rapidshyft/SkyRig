import {messageError} from './localized-error.mjs';
import {puppetDefinition,puppetConvertible} from './puppet.mjs';
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
};
