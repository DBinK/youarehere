const fs = require('fs');
const os = require('os');
const path = require('path');
const vscode = require('vscode');

// A fixed, guessable path: consumers (AI Agents reading this file directly)
// must be able to find it without shelling out to resolve a temp directory.
const STATE_DIR = path.join(os.homedir(), '.youarehere');
const STATE_FILE = path.join(STATE_DIR, 'context.json');
// A second, deliberately tiny interface: just the reference, the dirty flag and
// the timestamp. Written alongside the full state so consumers that only need a
// `path:lines` cite never have to read the whole thing.
const REF_FILE = path.join(STATE_DIR, 'ref.json');

// The skills are installed from the repository, not shipped in the VSIX, so an
// extension update leaves them behind. Both state files carry the extension
// version and both skills compare it against their own `metadata.version`: the
// two are numbered together, so a mismatch means the Agent is following another
// build's instructions. The extension reports the same mismatch, once per
// version, keyed on this field so a newer version is allowed to speak again.
const PROMPTED_VERSION_KEY = 'youarehere.skillCheck.promptedVersion';
const SKILL_NAMES = ['here', 'youarehere'];
// Renamed in 0.3.0. `npx skills update` does not remove retired names, so a
// stale copy keeps auto-triggering next to the skill that replaced it.
const RETIRED_SKILL_NAMES = ['youarehere-full'];

let activeContext = null;
let extensionVersion = null;

function toRange(selection) {
  if (!selection) {
    return null;
  }
  return {
    startLine: selection.start.line + 1,
    startCharacter: selection.start.character + 1,
    endLine: selection.end.line + 1,
    endCharacter: selection.end.character + 1,
  };
}

function toPosition(position) {
  if (!position) {
    return null;
  }
  return {
    line: position.line + 1,
    character: position.character + 1,
  };
}

function getActiveLineText(document, selection) {
  if (!document || !selection) {
    return null;
  }
  return document.lineAt(selection.active.line).text;
}

function getContextRoot() {
  const folders = vscode.workspace.workspaceFolders;
  if (!folders?.length) {
    return null;
  }
  return folders[0];
}

function getState() {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  } catch (_) {
    return null;
  }
}

// `path:start-end` when there is a real selection, `path:line` when the caret is
// merely resting somewhere. The format itself carries that distinction, so
// consumers do not need a rule for "the range is zero-width".
function buildRef(ctx) {
  if (!ctx.file) {
    return null;
  }

  const sel = ctx.selection;
  const hasSelection =
    sel && !(sel.startLine === sel.endLine && sel.startCharacter === sel.endCharacter);

  if (hasSelection) {
    // VS Code ranges are end-exclusive: a selection that stops at column 0 of a
    // later line selects nothing there, so drop that terminal line.
    const endLine =
      sel.endCharacter === 1 && sel.endLine > sel.startLine ? sel.endLine - 1 : sel.endLine;
    return `${ctx.file}:${sel.startLine}-${endLine}`;
  }

  return `${ctx.file}:${ctx.cursor ? ctx.cursor.line : 1}`;
}

function writeJsonAtomic(file, value) {
  const tmp = `${file}.${process.pid}.tmp`;
  try {
    fs.writeFileSync(tmp, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
    fs.renameSync(tmp, file);
  } catch (error) {
    fs.rmSync(tmp, { force: true });
    throw error;
  }
}

function writeState() {
  if (!activeContext) {
    return;
  }

  const ref = {
    ref: buildRef(activeContext),
    isDirty: activeContext.isDirty,
    extensionVersion: activeContext.extensionVersion,
    updatedAt: activeContext.updatedAt,
  };

  // State reporting is best-effort: a read-only home or a path conflict must
  // never take the extension down with an exception escaping activate().
  try {
    fs.mkdirSync(STATE_DIR, { recursive: true });
    // context.json last: it carries the full payload, so readers that treat it
    // as the source of truth never see a torn pair.
    writeJsonAtomic(REF_FILE, ref);
    writeJsonAtomic(STATE_FILE, activeContext);
  } catch (error) {
    console.warn('youarehere: failed to write state file:', error);
  }
}

function removeState() {
  const state = getState();
  if (!activeContext || state?.updatedAt !== activeContext.updatedAt) {
    return;
  }

  for (const file of [STATE_FILE, REF_FILE]) {
    try {
      fs.unlinkSync(file);
    } catch (_) {}
  }
}

function updateActiveContext() {
  const editor = vscode.window.activeTextEditor;
  const document = editor?.document;
  const folder = getContextRoot();
  const workspacePath = folder?.uri.fsPath || null;
  const filePath = document?.uri.scheme === 'file' ? document.uri.fsPath : null;

  activeContext = {
    schema: 'youarehere/v1',
    extensionVersion,
    workspace: workspacePath,
    file: filePath,
    relativeFile: filePath && workspacePath ? path.relative(workspacePath, filePath) : null,
    isDirty: document ? document.isDirty : null,
    cursor: toPosition(editor?.selection.active),
    activeLineText: getActiveLineText(document, editor?.selection),
    selection: toRange(editor?.selection),
    updatedAt: new Date().toISOString(),
  };

  writeState();
}

// Saving clears the dirty flag and edits can flip it without moving the caret,
// so neither the active-editor nor the selection event covers it.
function onDocumentChanged(document) {
  if (document === vscode.window.activeTextEditor?.document) {
    updateActiveContext();
  }
}

// Where `npx skills add` puts skills. `~/.agents/skills` holds the copy every
// other tool directory links to, the rest cover a project-level install. A
// location we do not know about is skipped, never guessed at.
function skillDirs() {
  const dirs = ['.agents', '.claude'].map((dir) => path.join(os.homedir(), dir, 'skills'));
  for (const folder of vscode.workspace.workspaceFolders ?? []) {
    for (const dir of ['.agents', '.claude']) {
      dirs.push(path.join(folder.uri.fsPath, dir, 'skills'));
    }
  }
  return dirs;
}

// Only `metadata.version` is read, so a regex over the frontmatter is enough
// and does not drag in a YAML dependency.
function readSkillVersion(dir, name) {
  try {
    const text = fs.readFileSync(path.join(dir, name, 'SKILL.md'), 'utf8');
    const match = text.match(/^\s+version:\s*"?([^"\n]+?)"?\s*$/m);
    return match ? match[1].trim() : '';
  } catch (_) {
    return null;
  }
}

function findInstalledSkills() {
  const installed = new Map();
  for (const dir of skillDirs()) {
    for (const name of [...SKILL_NAMES, ...RETIRED_SKILL_NAMES]) {
      if (!installed.has(name)) {
        const version = readSkillVersion(dir, name);
        if (version !== null) {
          installed.set(name, version);
        }
      }
    }
  }
  return installed;
}

// The remove step is what a plain update cannot do: `npx skills update` only
// refreshes names the lockfile already carries, so a retired skill survives it
// and keeps auto-triggering.
function skillUpdateCommand(installed) {
  if (!RETIRED_SKILL_NAMES.some((name) => installed.has(name))) {
    return 'npx skills update';
  }
  return `npx skills remove ${[...installed.keys()].join(' ')} && npx skills add DBinK/youarehere -g`;
}

async function reportStaleSkills(context) {
  if (!extensionVersion) {
    return;
  }

  const installed = findInstalledSkills();
  const stale = [...installed].filter(([, version]) => version !== extensionVersion);
  // Nothing installed, nothing out of date, or this version already spoke.
  if (!stale.length || context.globalState.get(PROMPTED_VERSION_KEY) === extensionVersion) {
    return;
  }

  const found = stale.map(([name, version]) => `${name} ${version || '(no version)'}`).join(', ');
  const command = skillUpdateCommand(installed);
  const choice = await vscode.window.showWarningMessage(
    `You Are Here is ${extensionVersion}, but the installed skills are ${found}. Update them: ${command}`,
    'Copy update command',
  );

  if (choice === 'Copy update command') {
    await vscode.env.clipboard.writeText(command);
  }
  // Recorded whether or not the user acted: one prompt per version.
  await context.globalState.update(PROMPTED_VERSION_KEY, extensionVersion);
}

function activate(context) {
  extensionVersion = context.extension?.packageJSON?.version ?? null;

  context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(updateActiveContext));
  context.subscriptions.push(vscode.window.onDidChangeTextEditorSelection(updateActiveContext));
  context.subscriptions.push(vscode.workspace.onDidChangeWorkspaceFolders(updateActiveContext));
  context.subscriptions.push(vscode.workspace.onDidSaveTextDocument(onDocumentChanged));
  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument((event) => onDocumentChanged(event.document)),
  );

  updateActiveContext();

  // Best-effort: a version prompt must never take activation down with it.
  reportStaleSkills(context).catch((error) =>
    console.warn('youarehere: skill version check failed:', error),
  );
}

function deactivate() {
  removeState();
}

module.exports = {
  activate,
  deactivate,
};
