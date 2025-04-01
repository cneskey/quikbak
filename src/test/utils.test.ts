import * as assert from 'assert';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import * as sinon from 'sinon';
import * as vscode from 'vscode';
import {
    formatTimestamp,
    createBackupPath,
    needsProgressIndicator,
    getConfig,
    QuikBakConfig
} from '../utils';

suite('Utils Test Suite', () => {
    const defaultConfig: QuikBakConfig = {
        namingPattern: '{filename}{timestamp}.{ext}',
        timestampFormat: 'YYYY-MM-DD_HHmmss',
        includeTimestamp: true,
        showProgressNotification: true,
        largeFileSizeMB: 5
    };

    let sandbox: sinon.SinonSandbox;

    setup(() => {
        sandbox = sinon.createSandbox();
    });

    teardown(() => {
        sandbox.restore();
    });

    test('formatTimestamp should correctly format date', () => {
        // Create a fixed date for testing
        const testDate = new Date(2024, 5, 15, 14, 30, 45); // June 15, 2024, 14:30:45

        // Test basic format
        assert.strictEqual(
            formatTimestamp('YYYY-MM-DD', testDate),
            '2024-06-15'
        );

        // Test time components
        assert.strictEqual(
            formatTimestamp('HH:mm:ss', testDate),
            '14:30:45'
        );

        // Test full format
        assert.strictEqual(
            formatTimestamp('YYYY-MM-DD_HHmmss', testDate),
            '2024-06-15_143045'
        );

        // Test padding for single digit values
        const singleDigitDate = new Date(2024, 0, 5, 3, 5, 9); // Jan 5, 2024, 3:05:09
        assert.strictEqual(
            formatTimestamp('YYYY-MM-DD_HHmmss', singleDigitDate),
            '2024-01-05_030509'
        );
    });

    test('createBackupPath should correctly format backup paths', () => {
        // Mock the timestamp function to return predictable values
        const timestampStub = sandbox.stub().returns('2024-06-15_143045');
        sandbox.stub(Date.prototype, 'getFullYear').returns(2024);
        sandbox.stub(Date.prototype, 'getMonth').returns(5); // June (0-based)
        sandbox.stub(Date.prototype, 'getDate').returns(15);
        sandbox.stub(Date.prototype, 'getHours').returns(14);
        sandbox.stub(Date.prototype, 'getMinutes').returns(30);
        sandbox.stub(Date.prototype, 'getSeconds').returns(45);

        // Test file paths on different platforms
        const isWindows = os.platform() === 'win32';
        const testFilePath = isWindows ? 'C:\\test\\document.txt' : '/test/document.txt';

        // Test with include timestamp
        const config: QuikBakConfig = {
            ...defaultConfig,
            includeTimestamp: true
        };

        // Mock getConfig to return our test config
        sandbox.stub(vscode.workspace, 'getConfiguration').returns({
            get: (key: string) => config[key as keyof QuikBakConfig]
        } as any);

        let result = createBackupPath(testFilePath);
        let expectedPath: string;

        if (isWindows) {
            expectedPath = 'C:\\test\\document_2024-06-15_143045.txt';
        } else {
            expectedPath = '/test/document_2024-06-15_143045.txt';
        }

        assert.strictEqual(path.normalize(result), path.normalize(expectedPath));

        // Test without timestamp
        config.includeTimestamp = false;
        result = createBackupPath(testFilePath);

        if (isWindows) {
            expectedPath = 'C:\\test\\document.txt';
        } else {
            expectedPath = '/test/document.txt';
        }

        assert.strictEqual(path.normalize(result), path.normalize(expectedPath));

        // Test with different naming pattern
        config.includeTimestamp = true;
        config.namingPattern = '{filename}_bak.{ext}';
        result = createBackupPath(testFilePath);

        if (isWindows) {
            expectedPath = 'C:\\test\\document_bak.txt';
        } else {
            expectedPath = '/test/document_bak.txt';
        }

        assert.strictEqual(path.normalize(result), path.normalize(expectedPath));
    });

    test('needsProgressIndicator should correctly identify large files', () => {
        // Setup a mock file stats
        const smallFileStats = {
            size: 1 * 1024 * 1024, // 1 MB
            isDirectory: () => false
        };

        const largeFileStats = {
            size: 10 * 1024 * 1024, // 10 MB
            isDirectory: () => false
        };

        // Mock fs.statSync
        const statSyncStub = sandbox.stub(fs, 'statSync');

        // Test with small file
        statSyncStub.returns(smallFileStats as any);
        assert.strictEqual(
            needsProgressIndicator('smallfile.txt', defaultConfig),
            false,
            'Small file should not need progress indicator'
        );

        // Test with large file
        statSyncStub.returns(largeFileStats as any);
        assert.strictEqual(
            needsProgressIndicator('largefile.txt', defaultConfig),
            true,
            'Large file should need progress indicator'
        );

        // Test with progress notifications disabled
        const configNoProgress: QuikBakConfig = {
            ...defaultConfig,
            showProgressNotification: false
        };

        assert.strictEqual(
            needsProgressIndicator('largefile.txt', configNoProgress),
            false,
            'Progress should be disabled by configuration'
        );

        // Test with custom size threshold
        const configLowThreshold: QuikBakConfig = {
            ...defaultConfig,
            largeFileSizeMB: 0.5 // 0.5 MB threshold
        };

        statSyncStub.returns(smallFileStats as any); // 1 MB
        assert.strictEqual(
            needsProgressIndicator('smallfile.txt', configLowThreshold),
            true,
            'Should show progress when file exceeds custom threshold'
        );

        // Test error handling
        statSyncStub.throws(new Error('File not found'));
        assert.strictEqual(
            needsProgressIndicator('nonexistent.txt', defaultConfig),
            false,
            'Should handle errors gracefully'
        );
    });

    test('getConfig should get configuration from workspace', () => {
        // Mock vscode.workspace.getConfiguration
        const configStub = sandbox.stub();
        configStub.withArgs('namingPattern').returns('{filename}{timestamp}.{ext}');
        configStub.withArgs('timestampFormat').returns('YYYY-MM-DD_HHmmss');
        configStub.withArgs('includeTimestamp').returns(true);
        configStub.withArgs('showProgressNotification').returns(true);
        configStub.withArgs('largeFileSizeMB').returns(5);

        const getConfigurationStub = sandbox.stub(vscode.workspace, 'getConfiguration')
            .returns({
                get: configStub
            } as any);

        const config = getConfig();

        // Assert that getConfiguration was called with 'quikbak'
        assert.ok(getConfigurationStub.calledWith('quikbak'), 'Should get quikbak configuration');

        // Assert configuration has correct values
        assert.strictEqual(config.namingPattern, '{filename}{timestamp}.{ext}');
        assert.strictEqual(config.timestampFormat, 'YYYY-MM-DD_HHmmss');
        assert.strictEqual(config.includeTimestamp, true);
        assert.strictEqual(config.showProgressNotification, true);
        assert.strictEqual(config.largeFileSizeMB, 5);
    });
});