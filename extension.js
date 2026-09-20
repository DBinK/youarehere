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

// The skills install from the repository, not from the VSIX, and the two are
// used as a pair, so an extension update always leaves them behind. Every
// version says so once: the first run points at the install command, later
// versions at the update command. No detection is involved — the skills are not
// optional, so there is nothing to check for. `globalState` carries the version
// that already spoke, which also keeps it to one prompt per version across
// windows.
const PROMPTED_VERSION_KEY = 'youarehere.skills.promptedVersion';
const INSTALL_COMMAND = 'npx skills add DBinK/youarehere -g';
const UPDATE_COMMAND = 'npx skills update';

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
    updatedAt: activeContext.updatedAt,
    extensionVersion: activeContext.extensionVersion,
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
    workspace: workspacePath,
    file: filePath,
    relativeFile: filePath && workspacePath ? path.relative(workspacePath, filePath) : null,
    isDirty: document ? document.isDirty : null,
    cursor: toPosition(editor?.selection.active),
    activeLineText: getActiveLineText(document, editor?.selection),
    selection: toRange(editor?.selection),
    updatedAt: new Date().toISOString(),
    extensionVersion,
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

async function reportSkillVersion(context) {
  if (!extensionVersion) {
    return;
  }

  const prompted = context.globalState.get(PROMPTED_VERSION_KEY);
  if (prompted === extensionVersion) {
    return;
  }

  // First run installs, every later version updates.
  const command = prompted ? UPDATE_COMMAND : INSTALL_COMMAND;
  const lead = prompted
    ? `You Are Here updated to ${extensionVersion}. The bundled skills install separately, so bring them to the same version:`
    : `You Are Here ${extensionVersion} is installed. Its two skills install once from the repository:`;
  const choice = await vscode.window.showWarningMessage(`${lead} ${command}`, 'Copy command');

  if (choice === 'Copy command') {
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
  reportSkillVersion(context).catch((error) =>
    console.warn('youarehere: skill version prompt failed:', error),
  );
}

function deactivate() {
  removeState();
}

module.exports = {
  activate,
  deactivate,
};
