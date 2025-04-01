import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { processFolder } from '../utils';

suite('Folder Operations Test Suite', () => {
    let tempSourceDir: string;
    let tempTargetDir: string;

    suiteSetup(() => {
        // Create temporary directories for testing
        tempSourceDir = fs.mkdtempSync(path.join(os.tmpdir(), 'quikbak-source-'));
        tempTargetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'quikbak-target-'));

        // Create test files and subdirectories in source
        fs.writeFileSync(path.join(tempSourceDir, 'file1.txt'), 'File 1 content');
        fs.writeFileSync(path.join(tempSourceDir, 'file2.txt'), 'File 2 content');

        // Create a subdirectory
        const subDir = path.join(tempSourceDir, 'subdir');
        fs.mkdirSync(subDir);
        fs.writeFileSync(path.join(subDir, 'subfile1.txt'), 'Subfile 1 content');
        fs.writeFileSync(path.join(subDir, 'subfile2.txt'), 'Subfile 2 content');
    });

    suiteTeardown(() => {
        // Clean up temporary directories
        fs.rmSync(tempSourceDir, { recursive: true, force: true });
        fs.rmSync(tempTargetDir, { recursive: true, force: true });
    });

    test('processFolder should copy all files and preserve structure', () => {
        // Process the folder
        processFolder(tempSourceDir, tempTargetDir);

        // Check that all files and directories were copied
        assert.ok(fs.existsSync(path.join(tempTargetDir, 'file1.txt')), 'Root file 1 should be copied');
        assert.ok(fs.existsSync(path.join(tempTargetDir, 'file2.txt')), 'Root file 2 should be copied');
        assert.ok(fs.existsSync(path.join(tempTargetDir, 'subdir')), 'Subdirectory should be created');
        assert.ok(fs.existsSync(path.join(tempTargetDir, 'subdir', 'subfile1.txt')), 'Subfile 1 should be copied');
        assert.ok(fs.existsSync(path.join(tempTargetDir, 'subdir', 'subfile2.txt')), 'Subfile 2 should be copied');

        // Check contents were correctly copied
        assert.strictEqual(
            fs.readFileSync(path.join(tempTargetDir, 'file1.txt'), 'utf8'),
            'File 1 content',
            'File 1 content should match'
        );

        assert.strictEqual(
            fs.readFileSync(path.join(tempTargetDir, 'subdir', 'subfile1.txt'), 'utf8'),
            'Subfile 1 content',
            'Subfile 1 content should match'
        );
    });

    test('processFolder should handle empty target directory', () => {
        // Create another empty target directory
        const emptyTarget = fs.mkdtempSync(path.join(os.tmpdir(), 'quikbak-empty-'));

        try {
            // Process the folder
            processFolder(tempSourceDir, emptyTarget);

            // Check that all files and directories were copied
            assert.ok(fs.existsSync(path.join(emptyTarget, 'file1.txt')), 'Root file 1 should be copied');
            assert.ok(fs.existsSync(path.join(emptyTarget, 'file2.txt')), 'Root file 2 should be copied');
            assert.ok(fs.existsSync(path.join(emptyTarget, 'subdir')), 'Subdirectory should be created');
        } finally {
            // Clean up
            fs.rmSync(emptyTarget, { recursive: true, force: true });
        }
    });

    test('processFolder should handle existing target directory structure', () => {
        // Create a target with some existing structure
        const existingTarget = fs.mkdtempSync(path.join(os.tmpdir(), 'quikbak-existing-'));
        const existingSubdir = path.join(existingTarget, 'subdir');
        fs.mkdirSync(existingSubdir);
        fs.writeFileSync(path.join(existingTarget, 'existing.txt'), 'Existing content');

        try {
            // Process the folder
            processFolder(tempSourceDir, existingTarget);

            // Check that all files and directories were copied
            assert.ok(fs.existsSync(path.join(existingTarget, 'file1.txt')), 'Root file 1 should be copied');
            assert.ok(fs.existsSync(path.join(existingTarget, 'file2.txt')), 'Root file 2 should be copied');

            // Original files should remain
            assert.ok(fs.existsSync(path.join(existingTarget, 'existing.txt')), 'Existing file should remain');
            assert.strictEqual(
                fs.readFileSync(path.join(existingTarget, 'existing.txt'), 'utf8'),
                'Existing content',
                'Existing file content should not change'
            );
        } finally {
            // Clean up
            fs.rmSync(existingTarget, { recursive: true, force: true });
        }
    });
});