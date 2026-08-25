import type { Result, RegistrySnapshot, PluginsChangedEvent, PluginCrashedEvent } from "../main/shared/types";

export {};

declare global {
  interface Window {
    titirShell: {
      getSnapshot: () => Promise<Result<RegistrySnapshot>>;
      showPlugin: (pluginId: string) => Promise<Result<void>>;
      relaunchPlugin: (pluginId: string) => Promise<Result<{ debounced: boolean }>>;
      onPluginsChanged: (cb: (event: PluginsChangedEvent) => void) => () => void;
      onPluginCrashed: (cb: (event: PluginCrashedEvent) => void) => () => void;
      window: {
        minimize: () => Promise<Result<void>>;
        maximize: () => Promise<Result<void>>;
        close: () => Promise<Result<void>>;
      };
    };
  }
}
