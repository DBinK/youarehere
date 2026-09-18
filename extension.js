const fs = require('fs');
const os = require('os');
const path = require('path');
const vscode = require('vscode');

// A fixed, guessable path: consumers (AI agents reading this file directly)
// must be able to find it without shelling out to resolve a temp directory.
const STATE_DIR = path.join(os.homedir(), '.youarehere');
const STATE_FILE = path.join(STATE_DIR, 'context.json');

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

function writeState() {
  if (!activeContext) {
    return;
  }

  fs.mkdirSync(STATE_DIR, { recursive: true });
  fs.writeFileSync(STATE_FILE, `${JSON.stringify(activeContext, null, 2)}\n`, { mode: 0o600 });
}

function removeState() {
  const state = getState();
  if (!activeContext || state?.updatedAt !== activeContext.updatedAt) {
    return;
  }

  try {
    fs.unlinkSync(STATE_FILE);
  } catch (_) {}
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
