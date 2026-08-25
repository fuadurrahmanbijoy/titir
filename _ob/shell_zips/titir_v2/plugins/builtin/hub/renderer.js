"use strict";
// Hub's own renderer. Plain TypeScript/DOM — the "React confined to the
// shell's own nav column" rule (design/shell guide §3 tech-stack note) does
// not extend to a plugin's own page, including the Hub's; this is ordinary
// plugin-author territory (Track Two, §12.2), just written by TiTir itself.
const titirHub = window.titirHub;
const listEl = document.getElementById("plugin-list");
const installBtn = document.getElementById("install-btn");
function render(snapshot) {
    listEl.innerHTML = "";
    if (snapshot.plugins.length === 0) {
        const empty = document.createElement("div");
        empty.className = "empty-state";
        empty.textContent = "No plugins installed yet.";
        listEl.appendChild(empty);
        return;
    }
    const sorted = [...snapshot.plugins].sort((a, b) => a.order - b.order);
    for (const plugin of sorted) {
        const row = document.createElement("div");
        row.className = "plugin-row";
        row.draggable = true;
        row.dataset.id = plugin.id;
        const icon = document.createElement("div");
        icon.className = "icon";
        icon.textContent = plugin.icon ?? "\u{1F9E9}";
        const meta = document.createElement("div");
        meta.className = "meta";
        const name = document.createElement("div");
        name.className = "name";
        name.textContent = plugin.name;
        const summary = document.createElement("div");
        summary.className = "summary";
        const capText = plugin.capabilities.length
            ? ` \u00B7 capabilities: ${plugin.capabilities.join(", ")}`
            : "";
        summary.textContent = `${plugin.summary ?? ""}${capText} \u00B7 ${plugin.state}`;
        meta.appendChild(name);
        meta.appendChild(summary);
        const actions = document.createElement("div");
        actions.className = "actions";
        const toggleLabel = document.createElement("label");
        const toggle = document.createElement("input");
        toggle.type = "checkbox";
        toggle.checked = plugin.enabled;
        toggle.addEventListener("change", async () => {
            await titirHub.setPluginEnabled(plugin.id, toggle.checked);
        });
        toggleLabel.appendChild(toggle);
        toggleLabel.appendChild(document.createTextNode(" Enabled"));
        const uninstallBtn = document.createElement("button");
        uninstallBtn.className = "danger-btn";
        uninstallBtn.textContent = "Uninstall";
        uninstallBtn.addEventListener("click", async () => {
            const confirmed = window.confirm(`Uninstall "${plugin.name}"? This deletes its files.`);
            if (!confirmed)
                return;
            await titirHub.uninstallPlugin(plugin.id);
        });
        actions.appendChild(toggleLabel);
        actions.appendChild(uninstallBtn);
        row.appendChild(icon);
        row.appendChild(meta);
        row.appendChild(actions);
        // Drag-reorder — mirrors PluginList.tsx's behavior on the shell side.
        row.addEventListener("dragstart", (e) => {
            e.dataTransfer?.setData("text/plain", plugin.id);
        });
        row.addEventListener("dragover", (e) => e.preventDefault());
        row.addEventListener("drop", async (e) => {
            e.preventDefault();
            const draggedId = e.dataTransfer?.getData("text/plain");
            if (!draggedId || draggedId === plugin.id)
                return;
            const ids = sorted.map((p) => p.id);
            const from = ids.indexOf(draggedId);
            const to = ids.indexOf(plugin.id);
            if (from === -1 || to === -1)
                return;
            ids.splice(from, 1);
            ids.splice(to, 0, draggedId);
            await titirHub.reorderPlugins(ids);
        });
        listEl.appendChild(row);
    }
}
installBtn.addEventListener("click", async () => {
    const picked = await titirHub.openFile(["openFile"], [{ name: "TiTir Plugin", extensions: ["titirpkg"] }]);
    if (!picked.ok || picked.data.canceled || picked.data.filePaths.length === 0)
        return;
    const result = await titirHub.installPlugin(picked.data.filePaths[0]);
    if (!result.ok) {
        window.alert(`Install failed: ${result.error.message}`);
    }
});
titirHub.onPluginsChanged((event) => render(event.snapshot));
titirHub.getSnapshot().then((result) => {
    if (result.ok)
        render(result.data);
});
