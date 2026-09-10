/**
 * The development harness, driven by three environment variables.
 *
 * All are read by the shell (`src-tauri/src/devharness.rs`) and all are unset
 * on an ordinary launch, so this module does nothing at all unless a run asks
 * for it. `EDITOR_OPEN_FOLDER` opens a document folder and its first chapter
 * without the dialog; `EDITOR_KEY_LOG` appends every key-log observation to a
 * file as one JSON object per line, so a script that presses real keys through
 * macOS can read back what the page saw; `EDITOR_PRESENT_ON_OPEN` presses
 * Present on that first chapter.
 *
 * The line carries the buffer's first line as well as the chord, because a
 * stray character macOS composed out of an Option chord shows up in the text
 * and nowhere else.
 *
 * The third switch exists for the same reason as the second: a script cannot
 * press `C-c C-p`. Without it a run that asked for `EDITOR_PRESENT_LOG` gets
 * an empty file and no way to tell an engine that failed to start from a
 * window that was never opened — which is exactly the ambiguity
 * `iss-2609061132369973` had to be settled through.
 */

import { invoke } from "@tauri-apps/api/core";

import type { App } from "./app";
import { documentText } from "./editor";
import { inShell, presentChapter } from "./doctree";
import type { KeyObservation } from "./keyspike";

/** What the shell says the environment asked for. */
interface HarnessSettings {
  readonly open_folder: string | null;
  readonly key_log: boolean;
  readonly present_on_open: boolean;
}

/** One line of the key log, as the harness writes it. */
export interface HarnessRecord extends KeyObservation {
  /** Milliseconds since the epoch, so a run can be read in order. */
  readonly at: number;
  /** The buffer's first line once the event has been dispatched. */
  readonly line: string;
  /** The open chapter, so a run reads `strays` against the right baseline. */
  readonly chapter: string | null;
  /** Which characters from {@link OPTION_CHARACTERS} the buffer now holds. */
  readonly strays: string;
}

/**
 * The characters a US keyboard produces from the Option chords the checklist
 * presses.
 *
 * Option is Meta, so none of these may appear in the buffer as a result of a
 * chord. A chapter may already carry one — a backtick in Markdown is prose,
 * not a stray accent — so every line names the open chapter too, and a stray
 * is a character that appears while the chapter stays the same.
 */
const OPTION_CHARACTERS = "ƒ∫∂∑¥¨¬√˙ß©≈´ˆ˜`¯˘€ﬁ•";

/** Which of those characters the text holds, in one string. */
function straysIn(text: string): string {
  const found = new Set<string>();
  for (const character of OPTION_CHARACTERS) {
    if (text.includes(character)) found.add(character);
  }
  return [...found].join("");
}

/** Write one line, dropping the failure: a broken log must not break the app. */
async function append(line: unknown): Promise<void> {
  try {
    await invoke("dev_log_key", { line: JSON.stringify(line) });
  } catch (error) {
    console.warn(`key log: ${String(error)}`);
  }
}

/**
 * Start whichever half of the harness the environment asked for.
 *
 * The ready line is written last, after the folder and its first chapter are
 * loaded, so a script can poll the file and know the window is up and holding a
 * document rather than merely running.
 */
export async function startDevHarness(app: App): Promise<void> {
  if (!inShell()) return;
  let settings: HarnessSettings;
  try {
    settings = await invoke<HarnessSettings>("dev_harness");
  } catch (error) {
    console.warn(`development harness: ${String(error)}`);
    return;
  }
  if (!settings.key_log && !settings.present_on_open && settings.open_folder === null)
    return;

  if (settings.key_log) {
    app.keyLog.observe((observation) => {
      const text = documentText(app.view);
      const record: HarnessRecord = {
        ...observation,
        at: Date.now(),
        line: text.split("\n")[0] ?? "",
        chapter: app.chapterPath,
        strays: straysIn(text),
      };
      void append(record);
    });
  }

  let chapter: string | null = null;
  if (settings.open_folder !== null) {
    await app.openFolder(settings.open_folder);
    const first = app.chapters[0];
    if (first) {
      await app.openChapter(first);
      chapter = first.path;
    }
    app.view.focus();
  }

  // Present, as the chord would: the buffer's text, the open chapter, and one
  // window. There is nothing to present until a chapter is open, so a run that
  // asked for this without naming a folder gets nothing and is told why.
  if (settings.present_on_open) {
    if (chapter === null) {
      console.warn("EDITOR_PRESENT_ON_OPEN: no chapter is open to present");
    } else {
      try {
        await presentChapter(documentText(app.view), chapter);
      } catch (error) {
        console.warn(`EDITOR_PRESENT_ON_OPEN: ${String(error)}`);
      }
    }
  }

  if (settings.key_log) {
    const text = documentText(app.view);
    await append({
      at: Date.now(),
      event: "ready",
      folder: settings.open_folder,
      chapter,
      line: text.split("\n")[0] ?? "",
      strays: straysIn(text),
    });
  }
}
