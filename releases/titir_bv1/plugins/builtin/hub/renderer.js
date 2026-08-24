const app=document.getElementById('app');
let snap=null,theme='dark',busy=false;
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const notify=(msg,error=false)=>{const el=document.getElementById('status');if(!el)return;el.textContent=msg;el.dataset.error=error?'1':'0';clearTimeout(notify.t);notify.t=setTimeout(()=>el.textContent='',5000)};
async function load(){snap=await window.hub.getSnapshot();theme=await window.hub.getTheme();document.documentElement.dataset.theme=theme;render()}
function pluginRows(){const ps=snap.plugins||[];if(!ps.length)return '<div class="empty"><div class="empty-icon">✦</div><b>No plugins installed</b><span>Install your first .titirpkg plugin to get started.</span></div>';
return ps.map(p=>`<article class="row ${p.runtime==='crashed'?'crashed':''}"><div class="sym">${esc(p.icon)}</div><div class="meta"><b>${esc(p.name)}</b><small>${esc(p.id)} · v${esc(p.version)} · ${esc(p.runtime)}</small><span>${esc(p.summary||'No description provided.')}</span>${p.permissions.length?`<div class="chips">${p.permissions.map(x=>`<i>${esc(x)}</i>`).join('')}</div>`:''}</div><div class="actions"><button class="open" data-o="${esc(p.id)}">Open</button><label class="sw" title="${p.enabled?'Disable':'Enable'}"><input data-e="${esc(p.id)}" type="checkbox" ${p.enabled?'checked':''}><i></i></label><button data-u="${esc(p.id)}" class="ghost danger">Uninstall</button></div></article>`).join('')}
function render(){
app.innerHTML=`<main><header><div><div class=e>TiTir</div><h1>Plugin Manager</h1><p>Install, launch, enable, disable, and remove plugins.</p></div><div class=theme><span>Theme</span><button id=theme>${theme==='light'?'☀ Light':'◐ Dark'}</button></div></header>
<section class=dropzone id=dropzone><div class=dropicon>＋</div><div><b>Install a plugin</b><p>Drop a <strong>.titirpkg</strong> file here, or choose one from your computer.</p></div><button id=install class=primary ${busy?'disabled':''}>${busy?'Installing…':'Choose plugin'}</button></section>
<div class=section-head><h2>Installed plugins <small>${snap.plugins.length}</small></h2><button id=refresh class=ghost>Refresh</button></div><section class=list>${pluginRows()}</section><div id=status></div></main>`;
 document.getElementById('theme').onclick=async()=>{theme=theme==='dark'?'light':'dark';await window.hub.setTheme(theme);await load()};
 document.getElementById('refresh').onclick=load;
 document.getElementById('install').onclick=chooseInstall;
 const dz=document.getElementById('dropzone');['dragenter','dragover'].forEach(e=>dz.addEventListener(e,x=>{x.preventDefault();dz.classList.add('drag')}));['dragleave','drop'].forEach(e=>dz.addEventListener(e,x=>{x.preventDefault();dz.classList.remove('drag')}));
 dz.addEventListener('drop',async e=>{const f=e.dataTransfer?.files?.[0];if(f?.path)await installPath(f.path)});
 document.querySelectorAll('[data-e]').forEach(el=>el.onchange=async()=>{await window.hub.enable(el.dataset.e,el.checked);await load()});
 document.querySelectorAll('[data-u]').forEach(el=>el.onclick=async()=>{if(confirm(`Uninstall ${el.dataset.u}?`)){const r=await window.hub.uninstall(el.dataset.u);r.ok?notify('Plugin uninstalled.'):notify(r.error||'Uninstall failed.',true);await load()}});
 document.querySelectorAll('[data-o]').forEach(el=>el.onclick=async()=>{const r=await window.hub.activate(el.dataset.o);if(!r?.ok)notify(r?.error||'Could not open plugin.',true)});
}
async function chooseInstall(){const r=await window.hub.openFile();if(r.canceled||!r.filePaths?.[0])return;await installPath(r.filePaths[0])}
async function installPath(file){if(busy)return;busy=true;render();const r=await window.hub.install(file);busy=false;if(r.ok){notify(`Installed ${r.name||r.pluginId}.`);await load();}else{render();notify(r.error||'Install failed.',true)}}
load();
window.hub.onPluginsChanged(()=>load());
