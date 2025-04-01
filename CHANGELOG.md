# Change Log

All notable changes to the "QuikBak" extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]
### Changed
- Updated repository URL to https://github.com/cneskey/quikbak
- Repository is now publicly available on GitHub

## [0.0.3] - 2025-03-31

### Security
- Added path sanitization to prevent path traversal attacks
- Implemented input validation for file paths and directory names
- Added protection against null bytes and special characters
- Enhanced security of file operations
- Fixed potential security vulnerabilities identified by Semgrep

### Changed
- Improved error handling and logging
- Added better activation error reporting
- Enhanced test coverage for security features

## [0.0.2] - 2025-03-11

### Fixed
- Resolved dependency issues during packaging with `--no-dependencies` flag
- Updated @vscode/vsce to latest version (3.2.2) for better compatibility
- Added PNPM overrides for problematic dependencies
- Simplified dependencies to only include essential packages

### Changed
- Updated packaging script in package.json to bypass dependency verification
- Improved development documentation with dependency management details

## [0.0.1] - 2024-07-08

### Added
- BAK command for creating backups of files and folders
- ZIP command for compressing files and folders into ZIP archives
- UNZIP command for extracting ZIP files
- Support for folder backup and compression
- Progress indicators for large file operations
- Configurable timestamp formats to avoid overwriting backups
- Settings to customize backup file naming patterns
- Context-aware commands (UNZIP only appears for ZIP files)
- Comprehensive unit and integration tests
- Test coverage for utility functions and folder operations

### Fixed
- Extension activation events now properly specified
- Added MIT license file
- Improved package.json configuration
- Code organization with separate utility module

### Changed
- Shortened command names to BAK, ZIP, and UNZIP for better usability
- Updated documentation with all available features and settings
- Refactored code for better testability