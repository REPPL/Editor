/**
 * The publish panel.
 *
 * One overlay: the choice Alice makes, the sentence she is owed every time she
 * makes it, the two buttons, the steps as they run, the links the publish
 * produced — the talk first, because that is what a lectern needs — and the
 * versions already published, read from the log in the document folder.
 *
 * The panel builds its contents fresh on each open, so the sentence about what
 * unlisted means is stated at every publish and cannot be turned off.
 */

/** The chord that opens the panel. */
export const PUBLISH_OPEN_CHORD = "C-c C-l";

/** The binding-table action id, for when the table takes this row. */
export const PUBLISH_OPEN_ACTION = "publish-open";

/** The sentence, stated at every publish. */
export const UNLISTED_SENTENCE =
  "Unlisted is not private: anyone holding the link can read it, and a link once sent cannot be recalled.";

/** What phase 1 does with the gated choice, said plainly. */
export const GATED_NOTE =
  "Gated is recorded in the publish log and not enforced in phase 1: until the access policy arrives, a gated document is served exactly as an unlisted one.";

/** A text file the build produced. */
export interface BuiltFile {
  readonly path: string;
  readonly text: string;
}

/** An asset to copy, disk to disk. */
export interface AssetCopy {
  readonly from: string;
  readonly to: string;
}

/** One step of a publish, as the shell reports it. */
export interface PublishStep {
  readonly name: string;
  readonly state: string;
  readonly detail: string;
}

/** What one publish did. */
export interface PublishOutcome {
  readonly id: string;
  readonly token: string;
  readonly hash: string;
  readonly created_version: boolean;
  readonly pushed: boolean;
  readonly stable_link: string;
  readonly deck_link: string;
  readonly version_link: string;
  readonly dry_run: boolean;
  readonly steps: readonly PublishStep[];
  readonly failure: string | null;
}

/** The links one entry of the log carries. */
export interface EntryLinks {
  readonly stable: string;
  readonly deck: string;
  readonly version: string;
}

/** One line of the publish log. */
export interface PublishEntry {
  readonly action: string;
  readonly published: string;
  readonly hash: string;
  readonly variants: readonly string[];
  readonly flag: string;
  readonly created_version: boolean;
  readonly links: Readonly<Record<string, EntryLinks>>;
  readonly seen_at_link?: string;
}

/** What the poll saw at the link. */
export interface DeployCheck {
  readonly answered: boolean;
  readonly hash: string | null;
}

/** What the panel needs from the world outside the page. */
export interface PublishServices {
  /** The document's title and the variant to publish. */
  describe(): Promise<{ title: string; variant: string }>;
  /** Build the version: the text files and the assets to copy. */
  build(variant: string): Promise<{ files: BuiltFile[]; copies: AssetCopy[] }>;
  publish(request: {
    variant: string;
    flag: string;
    files: BuiltFile[];
    copies: AssetCopy[];
  }): Promise<PublishOutcome>;
  publishDryRun(request: {
    variant: string;
    flag: string;
    files: BuiltFile[];
    copies: AssetCopy[];
  }): Promise<PublishOutcome>;
  /** Ask the link whether it is serving this version yet. */
  checkDeploy(url: string, expectedHash: string): Promise<DeployCheck>;
  /** The publish log, newest first. */
  readPublishLog(): Promise<PublishEntry[]>;
  /** Hand a link to the system browser. */
  openLink(url: string): Promise<void>;
  /** Put a link on the clipboard. */
  copyLink(url: string): Promise<void>;
}

/** How long the panel watches for the link to answer. */
export interface PollOptions {
  readonly intervalMs: number;
  readonly limitMs: number;
}

const DEFAULT_POLL: PollOptions = { intervalMs: 3000, limitMs: 5 * 60 * 1000 };

/** The mounted panel. */
export interface PublishPanel {
  readonly element: HTMLElement;
  readonly isOpen: boolean;
  open(): Promise<void>;
  close(): void;
  destroy(): void;
}

/**
 * Build the panel.
 *
 * It is not in the page until it is opened, and it takes the keyboard while it
 * is: `C-g` and Escape close it, under the one cancel rule the reading views
 * share.
 */
export function createPublishPanel(
  services: PublishServices,
  poll: PollOptions = DEFAULT_POLL,
): PublishPanel {
  const element = document.createElement("div");
  element.className = "panel publish-panel";
  element.setAttribute("role", "dialog");
  element.setAttribute("aria-modal", "true");
  element.setAttribute("aria-label", "Publish");
  element.hidden = true;

  let open = false;
  let watching: ReturnType<typeof setInterval> | null = null;
  let steps: HTMLOListElement;
  let links: HTMLElement;
  let versions: HTMLOListElement;
  let flag = "unlisted";
  let variant = "";

  function stopWatching(): void {
    if (watching !== null) {
      clearInterval(watching);
      watching = null;
    }
    element.querySelector(".publish-stop")?.remove();
  }

  function onKeyDown(event: KeyboardEvent): void {
    if (!open) {
      return;
    }
    if (event.key === "Escape" || (event.ctrlKey && event.key === "g")) {
      event.preventDefault();
      event.stopPropagation();
      panel.close();
    }
  }

  function button(label: string, action: () => void, className = ""): HTMLButtonElement {
    const control = document.createElement("button");
    control.type = "button";
    control.textContent = label;
    if (className !== "") {
      control.className = className;
    }
    control.addEventListener("click", action);
    return control;
  }

  /** A link with the two things Alice does with one: open it, copy it. */
  function linkRow(label: string, url: string): HTMLElement {
    const row = document.createElement("div");
    row.className = "publish-link";
    const name = document.createElement("span");
    name.className = "publish-link-label";
    name.textContent = label;
    const address = document.createElement("code");
    address.className = "publish-link-url";
    address.textContent = url;
    row.append(
      name,
      address,
      button("Open", () => void services.openLink(url), "publish-open-link"),
      button("Copy", () => void services.copyLink(url), "publish-copy-link"),
    );
    return row;
  }

  function showSteps(outcome: PublishOutcome): void {
    steps.replaceChildren();
    for (const step of outcome.steps) {
      const item = document.createElement("li");
      item.className = `publish-step publish-step-${step.state}`;
      item.dataset.step = step.name;
      item.dataset.state = step.state;
      item.textContent = `${step.name}: ${step.state} — ${step.detail}`;
      steps.append(item);
    }
    if (outcome.failure !== null && outcome.failure !== undefined) {
      const failure = document.createElement("p");
      failure.className = "publish-failure";
      failure.textContent = `${outcome.failure} The commit is on this machine and the site still serves what it served before.`;
      steps.append(failure);
    }
  }

  function showLinks(outcome: PublishOutcome): void {
    links.replaceChildren();
    if (outcome.dry_run) {
      const note = document.createElement("p");
      note.className = "publish-dry-run";
      note.textContent =
        "Dry run: nothing was written to the repository and nothing left this machine.";
      links.append(note);
      return;
    }
    if (!outcome.pushed && outcome.failure) {
      return;
    }
    // The talk first: it is what the lectern needs.
    links.append(
      linkRow("Deck", outcome.deck_link),
      linkRow("Article", outcome.stable_link),
      linkRow("This version", outcome.version_link),
    );
  }

  function watch(outcome: PublishOutcome): void {
    stopWatching();
    if (outcome.dry_run || !outcome.pushed) {
      return;
    }
    const latest = `${outcome.stable_link}latest.json`;
    const started = Date.now();
    const stop = button("Stop watching", () => stopWatching(), "publish-stop");
    element.append(stop);
    const answer = (): void => {
      void services
        .checkDeploy(latest, outcome.hash)
        .then((check) => {
          if (check.answered) {
            stopWatching();
            const seen = document.createElement("p");
            seen.className = "publish-seen";
            seen.textContent = "The link is answering with this version.";
            links.append(seen);
            return;
          }
          if (Date.now() - started >= poll.limitMs) {
            stopWatching();
            const waiting = document.createElement("p");
            waiting.className = "publish-waiting";
            waiting.textContent =
              "The site has not answered yet. The link is yours to use as soon as it does.";
            links.append(waiting);
          }
        })
        .catch(() => stopWatching());
    };
    watching = setInterval(answer, poll.intervalMs);
    answer();
  }

  async function run(dryRun: boolean): Promise<void> {
    stopWatching();
    steps.replaceChildren();
    links.replaceChildren();
    const request = { variant, flag, ...(await services.build(variant)) };
    try {
      const outcome = dryRun
        ? await services.publishDryRun(request)
        : await services.publish(request);
      showSteps(outcome);
      showLinks(outcome);
      watch(outcome);
      if (!dryRun) {
        await showVersions();
      }
    } catch (error) {
      steps.replaceChildren();
      const refusal = document.createElement("li");
      refusal.className = "publish-step publish-step-failed";
      refusal.dataset.state = "failed";
      refusal.textContent = String(error);
      steps.append(refusal);
    }
  }

  async function showVersions(): Promise<void> {
    versions.replaceChildren();
    let entries: PublishEntry[] = [];
    try {
      entries = await services.readPublishLog();
    } catch (error) {
      const failure = document.createElement("li");
      failure.className = "publish-version publish-step-failed";
      failure.textContent = String(error);
      versions.append(failure);
      return;
    }
    if (entries.length === 0) {
      const none = document.createElement("li");
      none.className = "publish-version publish-version-none";
      none.textContent = "This document has not been published yet.";
      versions.append(none);
      return;
    }
    for (const entry of entries) {
      const item = document.createElement("li");
      item.className = "publish-version";
      item.dataset.hash = entry.hash;
      const line = document.createElement("p");
      line.className = "publish-version-line";
      line.textContent = [
        entry.published,
        entry.hash,
        entry.variants.join(", "),
        entry.flag,
        entry.created_version ? "new version" : "the version already there",
        entry.seen_at_link === undefined
          ? "pushed, not yet seen at the link"
          : `seen at the link ${entry.seen_at_link}`,
      ].join(" · ");
      item.append(line);
      for (const [name, entryLinks] of Object.entries(entry.links)) {
        item.append(
          linkRow(`${name} deck`, entryLinks.deck),
          linkRow(`${name} version`, entryLinks.version),
          linkRow(`${name} stable`, entryLinks.stable),
        );
      }
      versions.append(item);
    }
  }

  /** Build the panel's contents, fresh, every time it opens. */
  async function draw(): Promise<void> {
    const described = await services.describe();
    variant = described.variant;
    flag = "unlisted";

    const heading = document.createElement("h2");
    heading.textContent = "Publish";

    const document_line = document.createElement("p");
    document_line.className = "publish-document";
    document_line.textContent = `${described.title} — ${described.variant}`;

    const choice = document.createElement("fieldset");
    choice.className = "publish-flag";
    const legend = document.createElement("legend");
    legend.textContent = "How this document goes out";
    choice.append(legend);
    for (const [value, label] of [
      ["unlisted", "Unlisted"],
      ["gated", "Gated"],
    ] as const) {
      const wrapper = document.createElement("label");
      const input = document.createElement("input");
      input.type = "radio";
      input.name = "publish-flag";
      input.value = value;
      input.checked = value === "unlisted";
      input.addEventListener("change", () => {
        if (input.checked) {
          flag = value;
        }
      });
      wrapper.append(input, document.createTextNode(` ${label}`));
      choice.append(wrapper);
    }
    const gated = document.createElement("p");
    gated.className = "publish-gated-note";
    gated.textContent = GATED_NOTE;
    choice.append(gated);

    // Beside the choice and behind no disclosure.
    const warning = document.createElement("p");
    warning.className = "publish-warning";
    warning.textContent = UNLISTED_SENTENCE;

    const actions = document.createElement("div");
    actions.className = "publish-actions";
    actions.append(
      button("Publish", () => void run(false), "publish-run"),
      button("Dry run", () => void run(true), "publish-dry"),
      button("Close", () => panel.close(), "publish-close"),
    );

    steps = document.createElement("ol");
    steps.className = "publish-steps";
    links = document.createElement("div");
    links.className = "publish-links";

    const versionsHeading = document.createElement("h3");
    versionsHeading.textContent = "Versions";
    versions = document.createElement("ol");
    versions.className = "publish-versions";

    element.replaceChildren(
      heading,
      document_line,
      choice,
      warning,
      actions,
      steps,
      links,
      versionsHeading,
      versions,
    );
    await showVersions();
  }

  const panel: PublishPanel = {
    element,
    get isOpen(): boolean {
      return open;
    },
    async open(): Promise<void> {
      open = true;
      element.hidden = false;
      await draw();
      element.querySelector<HTMLElement>(".publish-run")?.focus();
    },
    close(): void {
      open = false;
      stopWatching();
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

/**
 * What a panel needs from the application to be reachable.
 *
 * The two extension points the application offers and nothing else: the panel
 * has no keyboard listener of its own, so `C-c C-l` reaches it through the
 * binding table's `publish-open` row like every other chord.
 */
export interface PanelHost {
  registerPanel(name: string, element: HTMLElement): void;
  registerCommand(bindingId: string, run: () => void): void;
}

/** Mount the panel into the application and give it its chord. */
export function mountPublishPanel(host: PanelHost, panel: PublishPanel): void {
  host.registerPanel("publish", panel.element);
  host.registerCommand(PUBLISH_OPEN_ACTION, () => {
    void panel.open();
  });
}
