const{contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('hub',{
 getSnapshot:()=>ipcRenderer.invoke('titir:getSnapshot'),
 install:packagePath=>ipcRenderer.invoke('titir:installPlugin',{packagePath}),
 uninstall:pluginId=>ipcRenderer.invoke('titir:uninstallPlugin',{pluginId}),
 enable:(pluginId,enabled)=>ipcRenderer.invoke('titir:setPluginEnabled',{pluginId,enabled}),
 activate:pluginId=>ipcRenderer.invoke('titir:activatePlugin',{pluginId}),
 openFile:()=>ipcRenderer.invoke('dialog:openFile',{properties:['openFile'],filters:[{name:'TiTir Plugin Package',extensions:['titirpkg']}]}),
 getTheme:()=>ipcRenderer.invoke('titir:getTheme'),
 setTheme:theme=>ipcRenderer.invoke('titir:setTheme',{theme}),
 onPluginsChanged:cb=>{const h=(_,p)=>cb(p);ipcRenderer.on('titir:pluginsChanged',h);return()=>ipcRenderer.removeListener('titir:pluginsChanged',h)}
});
