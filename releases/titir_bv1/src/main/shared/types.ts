export type Theme='dark'|'light';
export interface PluginManifest{id:string;name:string;version:string;entry:string;preload:string;icon?:string;summary?:string;permissions?:string[];minShellVersion?:string}
export interface PluginInfo{manifest:PluginManifest;dir:string;enabled:boolean;order:number;runtime:'registered'|'mounted'|'visible'|'hidden'|'crashed'}
export interface RegistrySnapshot{plugins:Array<{id:string;name:string;version:string;icon:string;summary:string;permissions:string[];enabled:boolean;order:number;runtime:PluginInfo['runtime']}>;activePluginId:string|null;theme:Theme}
export interface ShellConfig{window:{width:number;height:number;x:number|null;y:number|null};activePluginId:string|null;theme:Theme;plugins:Array<{id:string;enabled:boolean;order:number}>}
