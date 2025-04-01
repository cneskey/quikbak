import * as assert from 'assert';
import * as vscode from 'vscode';
import * as sinon from 'sinon';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
// import * as myExtension from '../../extension';

suite('Extension Test Suite', () => {
	const sandbox = sinon.createSandbox();
	let tempDir: string;

	suiteSetup(async () => {
		vscode.window.showInformationMessage('Starting extension tests');

		// Create a temporary directory for test files
		tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'quikbak-tests-'));

		// Create a test file
		const testFilePath = path.join(tempDir, 'test.txt');
		fs.writeFileSync(testFilePath, 'This is a test file for QuikBak');

		// Create a test folder with files
		const testFolderPath = path.join(tempDir, 'test-folder');
		fs.mkdirSync(testFolderPath);
		fs.writeFileSync(path.join(testFolderPath, 'file1.txt'), 'File 1 content');
		fs.writeFileSync(path.join(testFolderPath, 'file2.txt'), 'File 2 content');

		// Wait for the extension to activate
		await vscode.extensions.getExtension('corey.quikbak')?.activate();
	});

	suiteTeardown(() => {
		// Clean up the temporary directory
		fs.rmSync(tempDir, { recursive: true, force: true });
	});

	setup(() => {
		sandbox.stub(vscode.window, 'showInformationMessage').resolves();
		sandbox.stub(vscode.window, 'showErrorMessage').resolves();
	});

	teardown(() => {
		sandbox.restore();
	});

	test('Extension should be registered correctly', () => {
		// Check if the extension is available
		const extension = vscode.extensions.getExtension('corey.quikbak');
		assert.ok(extension, 'Extension should be registered');

		// Check if commands are registered
		return Promise.all([
			vscode.commands.getCommands(true).then(commands => {
				// Check for our commands
				const quikBakCommands = commands.filter(cmd => cmd.startsWith('quikbak.'));
				assert.ok(quikBakCommands.includes('quikbak.createBackup'), 'createBackup command should be registered');
				assert.ok(quikBakCommands.includes('quikbak.compressFile'), 'compressFile command should be registered');
				assert.ok(quikBakCommands.includes('quikbak.decompressFile'), 'decompressFile command should be registered');
				assert.ok(quikBakCommands.includes('quikbak.test'), 'test command should be registered');
			})
		]);
	});

	test('Test command should show notification', async () => {
		// Reset the stub to track calls
		const showInfoStub = sandbox.stub(vscode.window, 'showInformationMessage').resolves();

		// Execute the test command
		await vscode.commands.executeCommand('quikbak.test');

		// Check if the information message was shown
		assert.strictEqual(showInfoStub.calledOnce, true, 'showInformationMessage should be called once');
		assert.strictEqual(
			showInfoStub.firstCall.args[0],
			'QuikBak Test Command Successfully Executed!',
			'Should show correct message'
		);
	});

	test('Extension settings should be registered', async () => {
		// Get extension's configuration properties
		const config = vscode.workspace.getConfiguration('quikbak');

		// Check if settings exist
		assert.notStrictEqual(config.get('namingPattern'), undefined, 'namingPattern setting should exist');
		assert.notStrictEqual(config.get('timestampFormat'), undefined, 'timestampFormat setting should exist');
		assert.notStrictEqual(config.get('includeTimestamp'), undefined, 'includeTimestamp setting should exist');
		assert.notStrictEqual(config.get('showProgressNotification'), undefined, 'showProgressNotification setting should exist');
		assert.notStrictEqual(config.get('largeFileSizeMB'), undefined, 'largeFileSizeMB setting should exist');
	});

	// Integration test for backup command (mocked file operations)
	test('Create backup command should create backup files', async () => {
		// Create a stub for the file system operations
		const copyFileSyncStub = sandbox.stub(fs, 'copyFileSync');

		// Create a URI for our test file
		const testFilePath = path.join(tempDir, 'test.txt');
		const fileUri = vscode.Uri.file(testFilePath);

		// Execute the command with the file URI
		await vscode.commands.executeCommand('quikbak.createBackup', fileUri);

		// Check if the file copy operation was called
		assert.strictEqual(copyFileSyncStub.calledOnce, true, 'copyFileSync should be called once');
		assert.strictEqual(
			copyFileSyncStub.firstCall.args[0],
			testFilePath,
			'Source path should be test file'
		);

		// The destination path is harder to check exactly due to timestamps
		// But we can check that it contains our file name
		const destPath = String(copyFileSyncStub.firstCall.args[1]);
		assert.ok(
			destPath.includes('test'),
			'Destination path should include the file name'
		);
	});
});
