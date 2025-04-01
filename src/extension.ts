// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as zl from 'zip-lib';
import {
	getConfig,
	formatTimestamp,
	createBackupPath,
	needsProgressIndicator,
	processFolder,
	sanitizePath
} from './utils';

// Interface for extension configuration
interface QuikBakConfig {
	namingPattern: string;
	timestampFormat: string;
	includeTimestamp: boolean;
	showProgressNotification: boolean;
	largeFileSizeMB: number;
}

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	try {
		console.log('QuikBak extension activating...');

		// Show notification on activation
		vscode.window.showInformationMessage('QuikBak activated');

		// Test zip-lib import
		console.log('Testing zip-lib import:', typeof zl);
		if (!zl) {
			throw new Error('zip-lib module not found');
		}

		// Helper function to get configuration
		function getConfig(): QuikBakConfig {
			const config = vscode.workspace.getConfiguration('quikbak');
			return {
				namingPattern: config.get('namingPattern', '{filename}{timestamp}.{ext}'),
				timestampFormat: config.get('timestampFormat', 'YYYY-MM-DD_HHmmss'),
				includeTimestamp: config.get('includeTimestamp', true),
				showProgressNotification: config.get('showProgressNotification', true),
				largeFileSizeMB: config.get('largeFileSizeMB', 5)
			};
		}

		// Helper function to format timestamp based on user settings
		function formatTimestamp(format: string): string {
			const now = new Date();

			// Replace tokens in the format string
			return format
				.replace('YYYY', now.getFullYear().toString())
				.replace('MM', (now.getMonth() + 1).toString().padStart(2, '0'))
				.replace('DD', now.getDate().toString().padStart(2, '0'))
				.replace('HH', now.getHours().toString().padStart(2, '0'))
				.replace('mm', now.getMinutes().toString().padStart(2, '0'))
				.replace('ss', now.getSeconds().toString().padStart(2, '0'));
		}

		// Helper function to generate backup file path
		function createBackupPath(filePath: string): string {
			const config = getConfig();
			const parsedPath = path.parse(filePath);
			const timestamp = config.includeTimestamp ? '_' + formatTimestamp(config.timestampFormat) : '';

			// Sanitize the path components
			const sanitizedDir = sanitizePath(parsedPath.dir);
			const sanitizedName = sanitizePath(parsedPath.name);
			const sanitizedExt = sanitizePath(parsedPath.ext.substring(1));

			// Replace placeholders in the naming pattern
			return path.join(sanitizedDir,
				config.namingPattern
					.replace('{filename}', sanitizedName)
					.replace('{timestamp}', timestamp)
					.replace('{ext}', sanitizedExt)
					.replace('{date}', formatTimestamp('YYYY-MM-DD'))
			);
		}

		// Helper function to check if file operation needs progress indicator
		function needsProgressIndicator(filePath: string): boolean {
			try {
				const config = getConfig();
				if (!config.showProgressNotification) {
					return false;
				}

				const stats = fs.statSync(filePath);
				const fileSizeMB = stats.size / (1024 * 1024);
				return fileSizeMB >= config.largeFileSizeMB;
			} catch (error) {
				return false;
			}
		}

		// Helper function to process folders (create directory structure)
		function processFolder(sourcePath: string, targetPath: string): void {
			// Sanitize paths
			const sanitizedSourcePath = sanitizePath(sourcePath);
			const sanitizedTargetPath = sanitizePath(targetPath);

			// Ensure the target directory exists
			if (!fs.existsSync(sanitizedTargetPath)) {
				fs.mkdirSync(sanitizedTargetPath, { recursive: true });
			}

			// Read directory contents
			const items = fs.readdirSync(sanitizedSourcePath);

			// Process each item
			for (const item of items) {
				const sanitizedItem = sanitizePath(item);
				const sourceItemPath = path.join(sanitizedSourcePath, sanitizedItem);
				const targetItemPath = path.join(sanitizedTargetPath, sanitizedItem);

				const stats = fs.statSync(sourceItemPath);

				if (stats.isDirectory()) {
					// Recursively process subdirectories
					processFolder(sourceItemPath, targetItemPath);
				} else {
					// Copy files
					fs.copyFileSync(sourceItemPath, targetItemPath);
				}
			}
		}

		// Basic command for creating backups
		const createBackupCmd = vscode.commands.registerCommand('quikbak.createBackup', async (fileUri) => {
			console.log('createBackup command called with:', fileUri);
			let filePath: string | undefined;

			// First check if we have a fileUri parameter (from explorer context menu)
			if (fileUri && fileUri.fsPath) {
				filePath = sanitizePath(fileUri.fsPath);
			}
			// Fall back to active text editor if available
			else if (vscode.window.activeTextEditor) {
				filePath = sanitizePath(vscode.window.activeTextEditor.document.fileName);
			}

			if (filePath) {
				const stats = fs.statSync(filePath);
				const isDirectory = stats.isDirectory();

				// Handle directory backup
				if (isDirectory) {
					const dirName = sanitizePath(path.basename(filePath));
					const parentDir = sanitizePath(path.dirname(filePath));
					const timestamp = formatTimestamp('YYYY-MM-DD_HHmmss');
					const backupPath = path.join(parentDir, `${dirName}_${timestamp}`);

					if (needsProgressIndicator(filePath)) {
						vscode.window.withProgress({
							location: vscode.ProgressLocation.Notification,
							title: `Backing up folder: ${dirName}`,
							cancellable: false
						}, async (progress) => {
							progress.report({ increment: 0 });

							try {
								processFolder(filePath!, backupPath);
								progress.report({ increment: 100 });
								vscode.window.showInformationMessage(`Folder backup created: ${path.basename(backupPath)}`);
							} catch (error) {
								vscode.window.showErrorMessage(`Failed to backup folder: ${error}`);
							}

							return Promise.resolve();
						});
					} else {
						try {
							processFolder(filePath, backupPath);
							vscode.window.showInformationMessage(`Folder backup created: ${path.basename(backupPath)}`);
						} catch (error) {
							vscode.window.showErrorMessage(`Failed to backup folder: ${error}`);
						}
					}
				}
				// Handle file backup
				else {
					const backupPath = createBackupPath(filePath);

					if (needsProgressIndicator(filePath)) {
						vscode.window.withProgress({
							location: vscode.ProgressLocation.Notification,
							title: `Backing up: ${path.basename(filePath)}`,
							cancellable: false
						}, async (progress) => {
							progress.report({ increment: 0 });

							try {
								fs.copyFileSync(filePath!, backupPath);
								progress.report({ increment: 100 });
								vscode.window.showInformationMessage(`Backup created: ${path.basename(backupPath)}`);
							} catch (error) {
								vscode.window.showErrorMessage(`Failed to create backup: ${error}`);
							}

							return Promise.resolve();
						});
					} else {
						try {
							fs.copyFileSync(filePath, backupPath);
							vscode.window.showInformationMessage(`Backup created: ${path.basename(backupPath)}`);
						} catch (error) {
							vscode.window.showErrorMessage(`Failed to create backup: ${error}`);
						}
					}
				}
			} else {
				vscode.window.showInformationMessage('No file selected to backup');
			}
		});

		// Command for compressing files/folders
		const compressFileCmd = vscode.commands.registerCommand('quikbak.compressFile', async (fileUri) => {
			console.log('compressFile command called with:', fileUri);
			let filePath: string | undefined;

			// First check if we have a fileUri parameter (from explorer context menu)
			if (fileUri && fileUri.fsPath) {
				filePath = sanitizePath(fileUri.fsPath);
			}
			// Fall back to active text editor if available
			else if (vscode.window.activeTextEditor) {
				filePath = sanitizePath(vscode.window.activeTextEditor.document.fileName);
			}

			if (filePath) {
				try {
					const stats = fs.statSync(filePath);
					const isDirectory = stats.isDirectory();

					const baseName = sanitizePath(path.basename(filePath));
					const dirName = sanitizePath(path.dirname(filePath));
					const timestamp = getConfig().includeTimestamp ?
						'_' + formatTimestamp(getConfig().timestampFormat) : '';
					const zipPath = path.join(dirName, `${path.parse(baseName).name}${timestamp}.zip`);

					if (needsProgressIndicator(filePath)) {
						vscode.window.withProgress({
							location: vscode.ProgressLocation.Notification,
							title: `Compressing ${isDirectory ? 'folder' : 'file'}: ${baseName}`,
							cancellable: false
						}, async (progress) => {
							progress.report({ increment: 0, message: 'Starting compression...' });

							try {
								if (isDirectory) {
									await zl.archiveFolder(filePath!, zipPath);
								} else {
									await zl.archiveFile(filePath!, zipPath);
								}

								progress.report({ increment: 100, message: 'Compression complete' });
								vscode.window.showInformationMessage(`${isDirectory ? 'Folder' : 'File'} compressed: ${path.basename(zipPath)}`);
							} catch (error) {
								vscode.window.showErrorMessage(`Failed to compress ${isDirectory ? 'folder' : 'file'}: ${error}`);
							}

							return Promise.resolve();
						});
					} else {
						if (isDirectory) {
							await zl.archiveFolder(filePath, zipPath);
						} else {
							await zl.archiveFile(filePath, zipPath);
						}
						vscode.window.showInformationMessage(`${isDirectory ? 'Folder' : 'File'} compressed: ${path.basename(zipPath)}`);
					}
				} catch (error) {
					vscode.window.showErrorMessage(`Failed to compress: ${error}`);
				}
			} else {
				vscode.window.showInformationMessage('No file selected to compress');
			}
		});

		// Command for decompressing zip files
		const decompressFileCmd = vscode.commands.registerCommand('quikbak.decompressFile', async (fileUri) => {
			let filePath: string | undefined;

			// First check if we have a fileUri parameter (from explorer context menu)
			if (fileUri && fileUri.fsPath) {
				filePath = sanitizePath(fileUri.fsPath);
			}
			// Fall back to active text editor if available
			else if (vscode.window.activeTextEditor) {
				filePath = sanitizePath(vscode.window.activeTextEditor.document.fileName);
			}

			if (filePath && filePath.toLowerCase().endsWith('.zip')) {
				try {
					const baseName = sanitizePath(path.basename(filePath, '.zip'));
					const dirName = sanitizePath(path.dirname(filePath));
					const extractPath = path.join(dirName, baseName);

					// Create extraction directory if it doesn't exist
					if (!fs.existsSync(extractPath)) {
						fs.mkdirSync(extractPath, { recursive: true });
					}

					if (needsProgressIndicator(filePath)) {
						vscode.window.withProgress({
							location: vscode.ProgressLocation.Notification,
							title: `Extracting: ${path.basename(filePath)}`,
							cancellable: false
						}, async (progress) => {
							progress.report({ increment: 0, message: 'Starting extraction...' });

							try {
								await zl.extract(filePath!, extractPath);
								progress.report({ increment: 100, message: 'Extraction complete' });
								vscode.window.showInformationMessage(`Extracted to: ${path.basename(extractPath)}`);
							} catch (error) {
								vscode.window.showErrorMessage(`Failed to extract: ${error}`);
							}

							return Promise.resolve();
						});
					} else {
						await zl.extract(filePath, extractPath);
						vscode.window.showInformationMessage(`Extracted to: ${path.basename(extractPath)}`);
					}
				} catch (error) {
					vscode.window.showErrorMessage(`Failed to extract: ${error}`);
				}
			} else {
				vscode.window.showInformationMessage('No zip file selected to extract');
			}
		});

		// Add a special command that should show up in the command palette
		const testCommand = vscode.commands.registerCommand('quikbak.test', () => {
			vscode.window.showInformationMessage('QuikBak Test Command Successfully Executed!');
		});

		// Add commands to subscriptions
		context.subscriptions.push(createBackupCmd);
		context.subscriptions.push(compressFileCmd);
		context.subscriptions.push(decompressFileCmd);
		context.subscriptions.push(testCommand);

		console.log('QuikBak extension activated successfully');
	} catch (error) {
		console.error('Error activating QuikBak extension:', error);
		vscode.window.showErrorMessage(`QuikBak activation failed: ${error}`);
		throw error;
	}
}

// This method is called when your extension is deactivated
export function deactivate() {
	console.log('QuikBak extension deactivated');
}
