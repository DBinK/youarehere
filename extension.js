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
// used as a pair, so an extension update always leaves them behind. No detection
// is involved — the skills are not optional, so there is nothing to check for.
//
// The reminder is due once per *install*, not once per version: reinstalling the
// same version asks again. VS Code unpacks the extension into a fresh directory
// every time it installs or updates one, so that directory's mtime identifies
// the install, and nothing writes into it afterwards. `globalState` holds the
// install whose reminder the user acted on, which also keeps it to one prompt
// per install across windows; leaving it unset keeps the reminder due, so a
// dialog nobody attended to comes back on the next start.
const PROMPTED_INSTALL_KEY = 'youarehere.skills.promptedInstall';

function installStamp(context) {
  try {
    return String(Math.round(fs.statSync(context.extension.extensionPath).mtimeMs));
  } catch (_) {
    // Extension path unreadable: fall back to the version, which prompts on
    // updates but not on reinstalls of the same one.
    return extensionVersion;
  }
}

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

// Extension `console.log` never reaches `exthost.log` (the default level filters
// it), so debugging lines go to an output channel instead: that content lands in
// `logs/<session>/window*/exthost/output_logging_*/<n>-You Are Here.log`.
let outputChannel = null;

function log(message) {
  if (!outputChannel) {
    outputChannel = vscode.window.createOutputChannel('You Are Here');
  }
  outputChannel.appendLine(`${new Date().toISOString()} ${message}`);
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
    log(`state write failed: ${error}`);
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

// A modal dialog rather than a toast, with buttons that do the work instead of
// describing it: the skills carry the Agent's instructions, so a user who never
// updates them keeps running against a build the extension no longer matches.
// `detail` renders only for modal messages, which is where the commands go.
const CHANGELOG_URL = 'https://github.com/DBinK/youarehere/blob/HEAD/CHANGELOG.md';
const PACKAGE_NAME = 'DBinK/youarehere';

// The dialog follows the editor's display language: VS Code reports `zh-cn` for
// Simplified Chinese, and every other `zh-*` locale reads the Simplified text
// more easily than English, so the check is the prefix.
const MESSAGES = {
  en: {
    installed: (version) =>
      `You Are Here ${version} is installed. Its two skills install separately and must match this version.`,
    detail: (commands, changelog) =>
      `${commands}\n\nUpdate skills now opens a terminal and runs this.\nCopy command puts the same lines on the clipboard without -y.\n\nChangelog: ${changelog}`,
    update: 'Update skills now',
    copy: 'Copy command',
  },
  zh: {
    installed: (version) =>
      `You Are Here ${version} 已安装。skills 版本须与扩展一致，且需单独安装。`,
    detail: (commands, changelog) =>
      `${commands}\n\n「立即更新」在终端中执行上述命令。\n「复制命令」将去除 -y 的命令写入剪贴板，由你选择安装到哪些 Agent。\n\n更新日志：${changelog}`,
    update: '立即更新',
    copy: '复制命令',
  },
};

function messages() {
  return (vscode.env.language ?? '').toLowerCase().startsWith('zh') ? MESSAGES.zh : MESSAGES.en;
}
// Everything this repository ships or ever shipped. A rename adds the old name
// here, so the update action can clean it up: `npx skills update` only refreshes
// names the lockfile already carries and leaves a retired skill behind, still
// auto-triggering next to its replacement.
const SKILL_NAMES = ['here', 'youarehere'];
const RETIRED_SKILL_NAMES = ['youarehere-full'];

// `yes` is what separates the two uses of the same lines: the button runs them
// in a terminal, where an interactive prompt nobody will answer must not appear,
// while the clipboard hands them to a terminal the user is already sitting in —
// there, dropping `-y` lets them see and answer the prompt themselves.
//
// Both lines carry `-g`: the install is global, and `skills remove` defaults to
// the project scope, where a globally installed skill is invisible. Dropping it
// makes the removal find nothing and the retired name survive silently.
//
// The removal runs on every install, first ones included. A user upgrading from
// a version that shipped a since-retired name looks exactly like a fresh install
// here — nothing recorded an install before this release, so the stamp is unset
// for both and the commands cannot tell them apart — and that user is the only
// one with a retired name to lose. `skills remove` ignores names that are not
// installed, so a genuine first install pays one extra no-op line.
function skillCommands({ yes = true } = {}) {
  const flags = `-g${yes ? ' -y' : ''}`;
  const add = `npx skills add ${PACKAGE_NAME} ${flags}`;
  // Two lines rather than one `&&` chain: PowerShell 5.1 has no `&&`, and each
  // sendText is a complete command in any shell.
  const remove = `npx skills remove ${[...SKILL_NAMES, ...RETIRED_SKILL_NAMES].join(' ')} ${flags}`;
  return [remove, add];
}

async function reportSkillVersion(context) {
  if (!extensionVersion) {
    log('no version in package.json, reminder disabled');
    return;
  }

  const stamp = installStamp(context);
  const prompted = context.globalState.get(PROMPTED_INSTALL_KEY);
  const common = `v${extensionVersion}, lang ${vscode.env.language}, install stamp ${stamp}, recorded ${prompted ?? '(none)'}`;
  if (stamp === prompted) {
    log(`${common}: settled, no prompt`);
    return;
  }
  log(`${common}: due`);

  // One sentence covers every case: the version in it is always the one now
  // installed, whether that arrived as a first install, an update or a reinstall
  // of the same version. The commands do not vary with the case: remove first,
  // which drops a retired name any previous version left behind, then add.
  const strings = messages();
  const commands = skillCommands();
  const update = { title: strings.update };
  const copy = { title: strings.copy };
  const lead = strings.installed(extensionVersion);
  const detail = strings.detail(commands.join('\n'), CHANGELOG_URL);

  // No close affordance of our own: VS Code adds a localized cancel button for
  // the slot ESC lands on, and that button is deliberately not an answer — what
  // the user did not attend to is due again on the next start.
  const choice = await vscode.window.showWarningMessage(
    lead,
    { modal: true, detail },
    update,
    copy,
  );

  // Cancel and a dismissed dialog stay due, so nothing is recorded for them.
  if (choice !== update && choice !== copy) {
    log(`reminder not answered (${choice?.title ?? 'dismissed'}), still due`);
    return;
  }

  if (choice === copy) {
    const clipboard = skillCommands({ yes: false }).join('\n');
    await vscode.env.clipboard.writeText(clipboard);
    log(`copied: ${clipboard.replace(/\n/g, ' | ')}`);
  } else {
    const terminal = vscode.window.createTerminal({ name: 'You Are Here' });
    terminal.show();
    for (const command of commands) {
      terminal.sendText(command);
    }
    log(`sent to terminal: ${commands.join(' | ')}`);
  }
  // Acting on the reminder settles this install; the next install asks again.
  await context.globalState.update(PROMPTED_INSTALL_KEY, stamp);
  log(`settled install stamp ${stamp}`);
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
  reportSkillVersion(context).catch((error) => log(`reminder failed: ${error}`));
}

function deactivate() {
  removeState();
  outputChannel?.dispose();
  outputChannel = null;
}

module.exports = {
  activate,
  deactivate,
};
