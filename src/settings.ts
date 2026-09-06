/**
 * The settings panel's services, as the shell provides them.
 *
 * One place where the panel's needs meet the commands, so the panel holds no
 * knowledge of the IPC layer and a test can drive it with plain objects.
 */

import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";

import type { Settings, SettingsServices } from "./settings-panel";

/** Wire the settings panel to the shell. */
export function createSettingsServices(): SettingsServices {
  return {
    getSettings: () => invoke<Settings>("get_settings"),
    setPublishTarget: ({ repository, remote, branch, baseUrl }) =>
      invoke<Settings>("set_publish_target", { repository, remote, branch, baseUrl }),
    setAssetRoot: (name, root) => invoke<Settings>("set_asset_root", { name, root }),
    async chooseFolder() {
      const chosen = await open({ directory: true, multiple: false });
      return typeof chosen === "string" ? chosen : null;
    },
  };
}

/** Reading and writing the type scale, as the shell provides them. */
export interface TextScaleServices {
  readTextScale(): Promise<number>;
  writeTextScale(steps: number): Promise<void>;
}

/**
 * Wire the type scale to the same per-machine store the panel reads.
 *
 * The panel shows no field for it, so these are separate from
 * `SettingsServices`: the two commands are the whole of the seam.
 */
export function createTextScaleServices(): TextScaleServices {
  return {
    async readTextScale() {
      const settings = await invoke<Settings>("get_settings");
      return settings.text_scale;
    },
    async writeTextScale(steps) {
      await invoke<Settings>("set_text_scale", { steps });
    },
  };
}
