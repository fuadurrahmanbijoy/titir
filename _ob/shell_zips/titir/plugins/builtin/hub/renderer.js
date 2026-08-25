const listEl = document.getElementById("plugin-list");
const emptyEl = document.getElementById("empty-state");
const installBtn = document.getElementById("install-btn");

function render(snapshot) {
  const plugins = snapshot.plugins ?? [];
  listEl.innerHTML = "";
  emptyEl.hidden = plugins.length > 0;

  for (const p of plugins) {
    const li = document.createElement("li");
    li.className = "plugin-row";
    li.innerHTML = `
      <div class="plugin-icon">${p.manifest.icon ?? "🧩"}</div>
      <div class="plugin-meta">
        <div class="plugin-name">${p.manifest.name}</div>
        <div class="plugin-summary">${p.manifest.summary ?? p.manifest.id}</div>
      </div>
      <div class="plugin-actions">
        <button class="icon-btn" data-action="toggle" data-id="${p.manifest.id}">
          ${p.enabled ? "Disable" : "Enable"}
        </button>
        <button class="icon-btn" data-action="uninstall" data-id="${p.manifest.id}">Uninstall</button>
      </div>
    `;
    listEl.appendChild(li);
  }
}

async function refresh() {
  const result = await window.titirHub.getSnapshot();
  if (result.ok) render(result.data);
}

installBtn.addEventListener("click", async () => {
  const picked = await window.titirHub.openFilePicker();
  if (!picked.ok || picked.data.canceled || picked.data.filePaths.length === 0) return;
  const result = await window.titirHub.installPlugin(picked.data.filePaths[0]);
  if (!result.ok) {
    alert(`Install failed: ${result.error.message}`);
  }
});

listEl.addEventListener("click", async (e) => {
  const target = e.target;
  if (!(target instanceof HTMLElement)) return;
  const id = target.dataset.id;
  const action = target.dataset.action;
  if (!id || !action) return;

  if (action === "uninstall") {
    await window.titirHub.uninstallPlugin(id);
  } else if (action === "toggle") {
    const result = await window.titirHub.getSnapshot();
    if (!result.ok) return;
    const record = result.data.plugins.find((p) => p.manifest.id === id);
    if (record) await window.titirHub.setPluginEnabled(id, !record.enabled);
  }
});

window.titirHub.onPluginsChanged((payload) => render(payload.snapshot));
refresh();
