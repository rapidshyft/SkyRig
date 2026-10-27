import {t as interfaceText} from './localization.mjs';
import {messageHTML} from './localization-bindings.mjs';
import {puppetToolsAvailable} from './puppet.mjs';
/** Puppet controls belong to the browser editor's Properties panel. They are a
 * view of ordinary editor commands and add no document state of their own. */
export function puppetSection(editor,{builder=false}={}){
 const available=!builder&&puppetToolsAvailable()&&editor.canMakePuppet();
 return {id:'puppet',title:interfaceText("puppet.title"),titleKey:"puppet.title",place:'titled',open:true,hidden:!available,rows:[
  {kind:'markup',html:`<div class="inspector-meta" data-i18n="puppet.makeHint">${messageHTML("puppet.makeHint",{})}</div>`},
  {kind:'actions',items:[{action:'make-puppet',icon:'depth',label:interfaceText("puppet.make"),labelKey:"puppet.make",text:true,variant:'outline'}]},
 ]};
}
