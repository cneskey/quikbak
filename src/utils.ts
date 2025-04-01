import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

// Interface for extension configuration
export interface QuikBakConfig {
    namingPattern: string;
    timestampFormat: string;
    includeTimestamp: boolean;
    showProgressNotification: boolean;
    largeFileSizeMB: number;
}

/**
 * Gets the extension configuration
 */
export function getConfig(): QuikBakConfig {
    const config = vscode.workspace.getConfiguration('quikbak');
    return {
        namingPattern: config.get('namingPattern', '{filename}{timestamp}.{ext}'),
        timestampFormat: config.get('timestampFormat', 'YYYY-MM-DD_HHmmss'),
        includeTimestamp: config.get('includeTimestamp', true),
        showProgressNotification: config.get('showProgressNotification', true),
        largeFileSizeMB: config.get('largeFileSizeMB', 5)
    };
}

/**
 * Formats a timestamp using the specified format string
 * @param format The format string with tokens YYYY, MM, DD, HH, mm, ss
 * @param date Optional date to format (defaults to current date/time)
 */
export function formatTimestamp(format: string, date: Date = new Date()): string {
    return format
        .replace('YYYY', date.getFullYear().toString())
        .replace('MM', (date.getMonth() + 1).toString().padStart(2, '0'))
        .replace('DD', date.getDate().toString().padStart(2, '0'))
        .replace('HH', date.getHours().toString().padStart(2, '0'))
        .replace('mm', date.getMinutes().toString().padStart(2, '0'))
        .replace('ss', date.getSeconds().toString().padStart(2, '0'));
}

/**
 * Creates a backup file path based on the source file path and configuration
 * @param filePath The source file path
 * @param config Optional configuration (defaults to getting from workspace)
 */
export function createBackupPath(filePath: string): string {
    const config = getConfig();
    const parsedPath = path.parse(filePath);
    const timestamp = config.includeTimestamp ? '_' + formatTimestamp(config.timestampFormat) : '';

    // Sanitize path components
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

/**
 * Checks if a file operation needs a progress indicator
 * @param filePath The file path to check
 * @param config Optional configuration (defaults to getting from workspace)
 */
export function needsProgressIndicator(filePath: string, config?: QuikBakConfig): boolean {
    try {
        if (!config) {
            config = getConfig();
        }

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

/**
 * Recursively copies a folder and its contents
 * @param sourcePath Source folder path
 * @param targetPath Target folder path
 */
export function processFolder(sourcePath: string, targetPath: string): void {
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

/**
 * Sanitizes a file path to prevent path traversal attacks
 * @param filePath The path to sanitize
 * @returns The sanitized path
 */
export function sanitizePath(filePath: string): string {
    // Remove any null bytes
    filePath = filePath.replace(/\0/g, '');

    // Remove any directory traversal attempts
    filePath = filePath.replace(/\.\./g, '');

    // Remove any absolute path indicators
    filePath = filePath.replace(/^[\/\\]/, '');

    // Remove any drive letters (Windows)
    filePath = filePath.replace(/^[A-Za-z]:[\/\\]/, '');

    // Remove any special characters that could be used for path manipulation
    filePath = filePath.replace(/[<>:"|?*]/g, '');

    return filePath;
}