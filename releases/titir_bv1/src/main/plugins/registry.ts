import fs from 'node:fs';
import path from 'node:path';
import {EventEmitter} from 'node:events';
import type {ConfigStore} from '../store/config-store';
import type {PluginInfo,PluginManifest,RegistrySnapshot,Theme} from '../shared/types';
const fallback='□';
export class Registry extends EventEmitter{
  private m=new Map<string,PluginInfo>();
  private hub:PluginInfo;
  constructor(private store:ConfigStore,private root:string,hub:PluginInfo){super();this.hub=hub;this.hydrate()}
  hydrate(){const c=this.store.get();this.m.clear();for(const s of c.plugins){const dir=path.join(this.root,s.id);try{const manifest=JSON.parse(fs.readFileSync(path.join(dir,'manifest.json'),'utf8')) as PluginManifest;if(manifest.id!==s.id||manifest.id==='titir.hub')continue;this.m.set(s.id,{manifest,dir,enabled:s.enabled,order:s.order,runtime:'registered'})}catch{}}}
  all(){return [...this.m.values()].sort((a,b)=>a.order-b.order)}
  get(id:string){return id==='titir.hub'?this.hub:this.m.get(id)}
  register(p:PluginInfo){if(p.manifest.id==='titir.hub')return;this.m.set(p.manifest.id,p);this.persist();this.emit('changed','installed')}
  remove(id:string){if(this.m.delete(id)){this.persist();this.emit('changed','uninstalled')}}
  setEnabled(id:string,e:boolean){const p=this.m.get(id);if(!p)return false;p.enabled=e;this.persist();this.emit('changed','enabled-changed');return true}
  reorder(ids:string[]){ids.forEach((id,i)=>{const p=this.m.get(id);if(p)p.order=i});this.persist();this.emit('changed','reordered')}
  setRuntime(id:string,r:PluginInfo['runtime']){const p=this.get(id);if(p)p.runtime=r}
  snapshot(active:string|null,theme:Theme):RegistrySnapshot{return{activePluginId:active,theme,plugins:this.all().map(p=>({id:p.manifest.id,name:p.manifest.name,version:p.manifest.version,icon:p.manifest.icon||fallback,summary:p.manifest.summary||'',permissions:p.manifest.permissions||[],enabled:p.enabled,order:p.order,runtime:p.runtime}))}}
  private persist(){this.store.setPlugins(this.all().map(p=>({id:p.manifest.id,enabled:p.enabled,order:p.order})))}
}
