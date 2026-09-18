# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.2.0] - 2026-09-18

### Added

- Added the end-exclusive coordinate rule to the `youarehere-full` skill, so a whole-line selection no longer makes the Agent read one line too many
- Added a failure warning when the state file cannot be written (e.g. a read-only home directory), instead of failing extension activation

### Changed

- Changed the state file writes to atomic write-temp-then-rename, so a reader never sees a half-written `context.json` or `ref.json`
- Changed the `skills/` directory to no longer ship inside the VSIX; skills are installed from the repository with `npx skills add`
- Changed the marketplace listing to lead with `IDE Selection to Your CLI Agent`, with a matching description and keywords, and replaced the extension icon

### Fixed

- Fixed `ref.json` citing one line too many when a selection ends at the start of the following line
- Fixed `isDirty` staying stale after saving the active file
- Fixed leftover `.tmp` files accumulating in `~/.youarehere` when a state write failed midway

## [0.1.0] - 2026-09-18

### Added

- Added the extension that writes the active file, cursor position, and selection to `~/.youarehere/context.json`, so an Agent can tell where you are looking without being told
- Added `~/.youarehere/ref.json`, a single-reference view for Agents that only need a `path:lines` cite
- Added `isDirty` to both files, so a reader can tell when the buffer holds unsaved changes
- Added the `youarehere` and `youarehere-full` skills, installable with `npx skills add DBinK/youarehere -g`
- Added support for VS Code 1.90 and later

### Changed

- Renamed the extension from `active-context-mcp` to `youarehere`, with the publisher changing from `ysd` to `DBinK`
- Moved the state file from `os.tmpdir()/active-context-mcp/active-context.json` to `~/.youarehere/context.json`

### Removed

- Removed the bundled MCP server. Agents read the state file directly through the bundled skills, so an MCP client entry is no longer needed

[Unreleased]: https://github.com/DBinK/youarehere/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/DBinK/youarehere/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/DBinK/youarehere/releases/tag/v0.1.0
