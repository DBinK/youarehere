const fs = require('fs');
const os = require('os');
const path = require('path');
const vscode = require('vscode');

// A fixed, guessable path: consumers (AI agents reading this file directly)
// must be able to find it without shelling out to resolve a temp directory.
const STATE_DIR = path.join(os.homedir(), '.youarehere');
const STATE_FILE = path.join(STATE_DIR, 'context.json');
// A second, deliberately tiny interface: just the reference, the dirty flag and
// the timestamp. Written alongside the full state so consumers that only need a
// `path:lines` cite never have to read the whole thing.
const REF_FILE = path.join(STATE_DIR, 'ref.json');

let activeContext = null;

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
    return `${ctx.file}:${sel.startLine}-${sel.endLine}`;
  }

  return `${ctx.file}:${ctx.cursor ? ctx.cursor.line : 1}`;
}

function writeState() {
  if (!activeContext) {
    return;
  }

  fs.mkdirSync(STATE_DIR, { recursive: true });
  fs.writeFileSync(STATE_FILE, `${JSON.stringify(activeContext, null, 2)}\n`, { mode: 0o600 });

  const ref = {
    ref: buildRef(activeContext),
    isDirty: activeContext.isDirty,
    updatedAt: activeContext.updatedAt,
  };
  fs.writeFileSync(REF_FILE, `${JSON.stringify(ref, null, 2)}\n`, { mode: 0o600 });
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
  };

  writeState();
}

function activate(context) {
  context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(updateActiveContext));
  context.subscriptions.push(vscode.window.onDidChangeTextEditorSelection(updateActiveContext));
  context.subscriptions.push(vscode.workspace.onDidChangeWorkspaceFolders(updateActiveContext));

  updateActiveContext();
}

function deactivate() {
  removeState();
}

module.exports = {
  activate,
  deactivate,
};
