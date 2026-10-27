import {t as interfaceText} from './localization.mjs';
import {messageHTML,messageAttributes} from './localization-bindings.mjs';
import {puppetToolsAvailable,PUPPET_VIEWS} from './puppet.mjs';
/** Puppet controls belong to the browser editor's Properties panel. They are a
 * view of ordinary editor commands and add no document state of their own. */
const VIEW_KEYS={front:'puppet.viewFront',threeQuarter:'puppet.viewThreeQuarter',side:'puppet.viewSide',back:'puppet.viewBack'};
export function puppetSection(editor,{builder=false}={}){
 if(builder||!puppetToolsAvailable())return {id:'puppet',hidden:true,rows:[]};
 const view=editor.getPuppetView?.();
 if(view!==undefined){
  const option=(value,key)=>`<option value="${value}" ${value===(view??'')?'selected':''} data-i18n="${key}">${messageHTML(key,{})}</option>`;
  return {id:'puppet',title:interfaceText("puppet.pieceTitle"),titleKey:"puppet.pieceTitle",place:'titled',open:true,rows:[
   {kind:'markup',html:`<div class="spatial-rig"><label class="spatial-choice"><span ${messageAttributes("puppet.view")}>${messageHTML("puppet.view",{})}</span><select class="inline-select" data-puppet-view aria-label="${interfaceText("puppet.view")}" ${messageAttributes("puppet.view",{},'aria-label')}>${option('',"puppet.viewAlways")}${PUPPET_VIEWS.map(v=>option(v,VIEW_KEYS[v])).join('')}</select></label><div class="inspector-meta" data-i18n="puppet.viewHint">${messageHTML("puppet.viewHint",{})}</div></div>`},
  ]};
 }
 const available=editor.canMakePuppet();
 return {id:'puppet',title:interfaceText("puppet.title"),titleKey:"puppet.title",place:'titled',open:true,hidden:!available,rows:[
  {kind:'markup',html:`<div class="inspector-meta" data-i18n="puppet.makeHint">${messageHTML("puppet.makeHint",{})}</div>`},
  {kind:'actions',items:[{action:'make-puppet',icon:'depth',label:interfaceText("puppet.make"),labelKey:"puppet.make",text:true,variant:'outline'}]},
 ]};
}
export function installPuppetControls({editor,root,refresh,guard=f=>f}){
 root.addEventListener('change',guard(e=>{
  const select=e.target.closest('[data-puppet-view]');if(!select)return;
  editor.setPuppetView(select.value||null);refresh();
 }));
}
