/**
 * The settings panel.
 *
 * What this machine knows and the document does not: where the production
 * repository is, which remote and branch a publish pushes to, what the site is
 * reached at, and the named folders assets are dropped from. The panel is a
 * form over `get_settings`, `set_publish_target` and `set_asset_root`, and it
 * shows the shell's own refusal wording rather than inventing its own — the
 * checks live in the shell, where a publish can rely on them.
 *
 * Nothing here is ever written into a document folder.
 */

/** The chord that opens the panel. */
export const SETTINGS_OPEN_CHORD = "C-c C-,";

/** The binding-table action id. */
export const SETTINGS_OPEN_ACTION = "open-settings";

/** Where a publish pushes to, and what the site is reached at. */
export interface PublishTarget {
  readonly repository: string;
  readonly remote: string;
  readonly branch: string;
  readonly base_url: string;
  readonly site_dir: string;
}

/** Everything the application knows about this machine. */
export interface Settings {
  readonly schema_version: number;
  readonly publish: PublishTarget;
  readonly asset_roots: Readonly<Record<string, string>>;
}

/** What the panel needs from the shell. */
export interface SettingsServices {
  getSettings(): Promise<Settings>;
  setPublishTarget(target: {
    repository: string;
    remote: string;
    branch: string;
    baseUrl: string;
  }): Promise<Settings>;
  setAssetRoot(name: string, root: string): Promise<Settings>;
  /** Ask the user for a folder; null when they cancel. Absent in a test. */
  chooseFolder?(): Promise<string | null>;
}

/** The mounted panel. */
export interface SettingsPanel {
  readonly element: HTMLElement;
  readonly isOpen: boolean;
  open(): Promise<void>;
  close(): void;
  destroy(): void;
}

/** What a panel needs from the application to be reachable. */
export interface SettingsHost {
  registerPanel(name: string, element: HTMLElement): void;
  registerCommand(bindingId: string, run: () => void): void;
}

function field(
  label: string,
  name: string,
  value: string,
  hint = "",
): { row: HTMLElement; input: HTMLInputElement } {
  const row = document.createElement("label");
  row.className = "settings-field";
  const caption = document.createElement("span");
  caption.className = "settings-label";
  caption.textContent = label;
  const input = document.createElement("input");
  input.type = "text";
  input.name = name;
  input.value = value;
  input.className = `settings-input settings-${name}`;
  row.append(caption, input);
  if (hint !== "") {
    const note = document.createElement("span");
    note.className = "settings-hint";
    note.textContent = hint;
    row.append(note);
  }
  return { row, input };
}

function button(label: string, action: () => void, className: string): HTMLButtonElement {
  const control = document.createElement("button");
  control.type = "button";
  control.textContent = label;
  control.className = className;
  control.addEventListener("click", action);
  return control;
}

/**
 * Build the panel.
 *
 * It is not in the page until it is opened, and it takes the keyboard while it
 * is: `C-g` and Escape close it, under the one cancel rule the overlays share.
 */
export function createSettingsPanel(services: SettingsServices): SettingsPanel {
  const element = document.createElement("div");
  element.className = "panel settings-panel";
  element.setAttribute("role", "dialog");
  element.setAttribute("aria-modal", "true");
  element.setAttribute("aria-label", "Settings");
  element.hidden = true;

  let open = false;
  let status: HTMLElement;

  function say(message: string, failed: boolean): void {
    status.textContent = message;
    status.dataset["state"] = failed ? "failed" : "saved";
  }

  function onKeyDown(event: KeyboardEvent): void {
    if (!open) return;
    if (event.key === "Escape" || (event.ctrlKey && event.key === "g")) {
      event.preventDefault();
      event.stopPropagation();
      panel.close();
    }
  }

  /** Draw the asset roots, each with the folder it names and a Remove. */
  function drawRoots(list: HTMLElement, settings: Settings): void {
    list.replaceChildren();
    const entries = Object.entries(settings.asset_roots);
    if (entries.length === 0) {
      const none = document.createElement("li");
      none.className = "settings-root settings-root-none";
      none.textContent = "No asset root is named yet.";
      list.append(none);
      return;
    }
    for (const [name, root] of entries) {
      const item = document.createElement("li");
      item.className = "settings-root";
      item.dataset["root"] = name;
      const label = document.createElement("span");
      label.className = "settings-root-label";
      label.textContent = name;
      const path = document.createElement("code");
      path.className = "settings-root-where";
      path.textContent = root;
      item.append(
        label,
        path,
        button(
          "Remove",
          () => {
            void services
              .setAssetRoot(name, "")
              .then((next) => {
                drawRoots(list, next);
                say(`Removed ${name}`, false);
              })
              .catch((error: unknown) => {
                say(String(error), true);
              });
          },
          "settings-root-remove",
        ),
      );
      list.append(item);
    }
  }

  /** Build the panel's contents, fresh, every time it opens. */
  async function draw(): Promise<void> {
    let settings: Settings;
    status = document.createElement("p");
    status.className = "settings-status";
    try {
      settings = await services.getSettings();
    } catch (error) {
      const heading = document.createElement("h2");
      heading.textContent = "Settings";
      say(String(error), true);
      element.replaceChildren(heading, status);
      return;
    }

    const heading = document.createElement("h2");
    heading.textContent = "Settings";

    const note = document.createElement("p");
    note.className = "settings-note";
    note.textContent =
      "These are facts about this machine. None of them is written into a document folder.";

    const target = document.createElement("fieldset");
    target.className = "settings-publish";
    const legend = document.createElement("legend");
    legend.textContent = "Where publishing pushes to";
    const repository = field(
      "Production repository",
      "repository",
      settings.publish.repository,
      "The working copy the site is deployed from.",
    );
    const remote = field("Remote", "remote", settings.publish.remote);
    const branch = field("Branch", "branch", settings.publish.branch);
    const baseUrl = field(
      "Base URL",
      "base-url",
      settings.publish.base_url,
      "The site's address, without a trailing slash.",
    );
    target.append(legend, repository.row);
    if (services.chooseFolder) {
      target.append(
        button(
          "Choose folder",
          () => {
            void services.chooseFolder?.().then((chosen) => {
              if (chosen !== null && chosen !== undefined) {
                repository.input.value = chosen;
              }
            });
          },
          "settings-choose-repository",
        ),
      );
    }
    target.append(
      remote.row,
      branch.row,
      baseUrl.row,
      button(
        "Save",
        () => {
          void services
            .setPublishTarget({
              repository: repository.input.value,
              remote: remote.input.value,
              branch: branch.input.value,
              baseUrl: baseUrl.input.value,
            })
            .then((next) => {
              repository.input.value = next.publish.repository;
              baseUrl.input.value = next.publish.base_url;
              say("Saved where publishing pushes to.", false);
            })
            .catch((error: unknown) => {
              say(String(error), true);
            });
        },
        "settings-save-publish",
      ),
    );

    const roots = document.createElement("fieldset");
    roots.className = "settings-roots";
    const rootsLegend = document.createElement("legend");
    rootsLegend.textContent = "Asset roots";
    const list = document.createElement("ul");
    list.className = "settings-root-list";
    drawRoots(list, settings);
    const rootName = field("Name", "root-name", "");
    const rootPath = field("Folder", "root-folder", "");
    roots.append(
      rootsLegend,
      list,
      rootName.row,
      rootPath.row,
      button(
        "Add",
        () => {
          void services
            .setAssetRoot(rootName.input.value, rootPath.input.value)
            .then((next) => {
              drawRoots(list, next);
              rootName.input.value = "";
              rootPath.input.value = "";
              say("Saved the asset root.", false);
            })
            .catch((error: unknown) => {
              say(String(error), true);
            });
        },
        "settings-add-root",
      ),
    );

    element.replaceChildren(
      heading,
      note,
      target,
      roots,
      status,
      button("Close", () => panel.close(), "settings-close"),
    );
  }

  const panel: SettingsPanel = {
    element,
    get isOpen(): boolean {
      return open;
    },
    async open(): Promise<void> {
      open = true;
      element.hidden = false;
      await draw();
      element.querySelector<HTMLElement>(".settings-repository")?.focus();
    },
    close(): void {
      open = false;
      element.hidden = true;
      element.replaceChildren();
    },
    destroy(): void {
      panel.close();
      document.removeEventListener("keydown", onKeyDown, true);
      element.remove();
    },
  };

  document.addEventListener("keydown", onKeyDown, true);
  return panel;
}

/** Mount the panel into the application and give it its chord. */
export function mountSettingsPanel(host: SettingsHost, panel: SettingsPanel): void {
  host.registerPanel("settings", panel.element);
  host.registerCommand(SETTINGS_OPEN_ACTION, () => {
    void panel.open();
  });
}
