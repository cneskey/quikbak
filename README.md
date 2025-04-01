# QuikBak - VS Code File Backup Extension

A simple VS Code extension that provides convenient right-click context menu options for backing up files and folders directly from the file explorer.

## Features

QuikBak adds three concise context menu options to the file explorer:

1. **BAK** - Creates a backup of the selected file or folder
2. **ZIP** - Compresses the selected file or folder into a ZIP archive
3. **UNZIP** - Extracts the contents of a selected ZIP file (only appears for .zip files)

<!-- Image removed for local development -->

## Why QuikBak?

QuikBak simplifies the file backup workflow by eliminating the need to:
1. Right-click a file in VS Code
2. Select "Reveal in Finder/Explorer"
3. Right-click the file in Finder/Explorer
4. Select "Copy" or "Compress"
5. Return to VS Code

With QuikBak, these operations are just one right-click away.

## Requirements

- VS Code version 1.96.0 or higher
- Works on all platforms supported by VS Code

## Extension Settings

This extension offers several customization options:

* `quikbak.namingPattern`: Pattern for backup file naming
  * Available placeholders: `{filename}`, `{ext}`, `{timestamp}`, `{date}`
  * Default: `{filename}{timestamp}.{ext}`

* `quikbak.timestampFormat`: Format for timestamps in backup filenames
  * Uses tokens: `YYYY` (year), `MM` (month), `DD` (day), `HH` (hour), `mm` (minute), `ss` (second)
  * Default: `YYYY-MM-DD_HHmmss`

* `quikbak.includeTimestamp`: Whether to include a timestamp in backup file names
  * Default: `true`

* `quikbak.showProgressNotification`: Show progress notification for large file operations
  * Default: `true`

* `quikbak.largeFileSizeMB`: File size in MB that triggers progress indicators
  * Default: `5`

## Key Features

### File Backups
- Creates backups with configurable naming patterns
- Includes timestamps to prevent overwriting previous backups
- Supports backing up individual files or entire folders

### Compression
- Compress files or entire directories with a single click
- Preserves folder structure when compressing directories
- Adds timestamps to ZIP filenames to avoid conflicts

### Extraction
- Extract ZIP files directly from the explorer context menu
- Creates a folder with the same name as the ZIP file
- Preserves directory structure during extraction

### User Experience
- Progress indicators for large file operations
- Concise menu options for quick access
- Contextual appearance (UNZIP only shows for ZIP files)

## Known Issues

None currently reported.

## Release Notes

### 0.0.1

Initial release of QuikBak with:
- BAK: Create file and folder backups with timestamps
- ZIP: Compress files and folders to ZIP archives
- UNZIP: Extract ZIP files with progress indicators
- Configuration options for naming patterns and timestamps
- Progress indicators for large operations

## Development

### Building the extension

1. Clone the repository
   ```bash
   git clone https://github.com/cneskey/quikbak.git
   cd quikbak
   ```
2. Run `pnpm install` to install dependencies
3. Run `pnpm run compile` to compile the TypeScript code

### Debugging the extension

1. Open the project in VS Code
2. Press F5 to launch a new VS Code window with the extension loaded
3. Create a test file in the new window
4. Right-click on a file or folder in the explorer to use the commands

### Running Tests

The extension includes comprehensive unit and integration tests:

```bash
# Run the tests
pnpm test

# Run the tests with coverage report
pnpm test -- --coverage
```

Tests are organized into several categories:
- **Utils Tests**: Test the core utility functions
- **Folder Operation Tests**: Verify folder backup functionality
- **Extension Tests**: Integration tests for the extension as a whole

### Packaging

```bash
pnpm run package
```

This will create a .vsix file that can be installed in VS Code using "Install from VSIX..." command.

#### Dependency Management

The extension uses the `--no-dependencies` flag with vsce during packaging to avoid dependency verification issues. This is configured in the package.json:

```json
"scripts": {
  "package": "pnpm vscode:prepublish && npx @vscode/vsce package --no-dependencies"
}
```

If you encounter dependency issues when packaging, the extension includes PNPM overrides to handle problematic dependencies:

```json
"pnpm": {
  "overrides": {
    "jackspeak": "2.3.5"
  }
}
```

Dependencies are kept minimal, with only `zip-lib` as a runtime dependency to ensure compatibility and reduce conflicts.

## License

MIT

---

## Repository

The source code for this extension is available on GitHub: [https://github.com/cneskey/quikbak](https://github.com/cneskey/quikbak)

Issues and contributions are welcome!

---

**Enjoy!**
