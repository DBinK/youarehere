# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed

- Fixed `ref.json` citing one line too many when a selection ends at the start of the following line
- Fixed `isDirty` staying stale after saving the active file

## [0.1.0] - 2026-09-18

### Added

- Added the extension that writes the active file, cursor position, and selection to `~/.youarehere/context.json`, so an Agent can tell where you are looking without being told
- Added `~/.youarehere/ref.json`, a single-reference view for Agents that only need a `path:lines` cite
- Added `isDirty` to both files, so a reader can tell when the buffer holds unsaved changes
- Added the `youarehere` and `youarehere-full` skills, installable with `npx skills add DBinK/youarehere -g`
- Added support for VS Code 1.90 and later

[Unreleased]: https://github.com/DBinK/youarehere/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/DBinK/youarehere/releases/tag/v0.1.0
