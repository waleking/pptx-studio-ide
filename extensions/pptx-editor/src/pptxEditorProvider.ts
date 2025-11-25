/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as http from 'http';
import * as crypto from 'crypto';
import { getFileServer, FileServer } from './fileServer';

// OnlyOffice Document Server configuration
const ONLYOFFICE_URL = 'http://localhost:8080';

interface OnlyOfficeCallback {
	status: number;
	url?: string;
	key?: string;
}

/**
 * Provider for PPTX custom editors with OnlyOffice integration
 */
export class PptxEditorProvider implements vscode.CustomReadonlyEditorProvider {

	public static readonly viewType = 'pptxEditor.preview';

	private fileServer: FileServer;

	public static register(context: vscode.ExtensionContext): vscode.Disposable {
		const provider = new PptxEditorProvider(context);
		return vscode.window.registerCustomEditorProvider(
			PptxEditorProvider.viewType,
			provider,
			{
				supportsMultipleEditorsPerDocument: false, // OnlyOffice handles one editor per doc
				webviewOptions: {
					retainContextWhenHidden: true,
				}
			}
		);
	}

	constructor(
		private readonly context: vscode.ExtensionContext
	) {
		this.fileServer = getFileServer();
	}

	/**
	 * Called when a custom document is opened.
	 */
	public async openCustomDocument(uri: vscode.Uri): Promise<vscode.CustomDocument> {
		return { uri, dispose: () => { } };
	}

	/**
	 * Called when the custom editor is opened.
	 * Sets up the webview with OnlyOffice editor.
	 */
	public async resolveCustomEditor(
		document: vscode.CustomDocument,
		webviewPanel: vscode.WebviewPanel,
		_token: vscode.CancellationToken
	): Promise<void> {
		// Start file server if not running
		await this.fileServer.start();

		// Register the file with the server
		const { url: fileUrl, token, callbackUrl } = this.fileServer.registerFile(document.uri);

		// Configure webview options - allow OnlyOffice scripts
		webviewPanel.webview.options = {
			enableScripts: true,
			localResourceRoots: [
				this.context.extensionUri,
				vscode.Uri.joinPath(document.uri, '..'),
			]
		};

		// Set up callback handler for save events
		this.fileServer.onCallback(token, async (data: OnlyOfficeCallback) => {
			await this.handleOnlyOfficeCallback(data, document, webviewPanel);
		});

		// Set up message handling from webview
		webviewPanel.webview.onDidReceiveMessage(
			message => this.handleMessage(message),
			undefined,
			[]
		);

		// Generate document key (unique identifier for OnlyOffice)
		const documentKey = this.generateDocumentKey(document.uri);

		// Set the HTML content with OnlyOffice editor
		webviewPanel.webview.html = this.getHtmlForWebview(
			document.uri,
			fileUrl,
			callbackUrl,
			documentKey
		);

		// Cleanup on panel close
		webviewPanel.onDidDispose(() => {
			this.fileServer.unregisterFile(token);
		});
	}

	/**
	 * Handle OnlyOffice callback events (save, etc.)
	 */
	private async handleOnlyOfficeCallback(
		data: OnlyOfficeCallback,
		document: vscode.CustomDocument,
		webviewPanel: vscode.WebviewPanel
	): Promise<void> {
		// OnlyOffice callback status codes:
		// 0 - no document with the key identifier could be found
		// 1 - document is being edited
		// 2 - document is ready for saving (user closed without changes or with changes saved)
		// 3 - document saving error has occurred
		// 4 - document is closed with no changes
		// 6 - document is being edited, but the current document state is saved
		// 7 - error has occurred while force saving the document

		const status = data.status;
		console.log('OnlyOffice callback status:', status);

		if (status === 2 || status === 6) {
			// Document ready to save or force save
			const downloadUrl = data.url;
			if (downloadUrl) {
				try {
					await this.saveDocument(downloadUrl, document.uri);
					webviewPanel.webview.postMessage({
						type: 'saveComplete',
						success: true
					});
				} catch (err) {
					console.error('Error saving document:', err);
					webviewPanel.webview.postMessage({
						type: 'saveComplete',
						success: false,
						error: String(err)
					});
				}
			}
		}
	}

	/**
	 * Download and save the document from OnlyOffice
	 */
	private async saveDocument(downloadUrl: string, targetUri: vscode.Uri): Promise<void> {
		return new Promise((resolve, reject) => {
			// OnlyOffice provides a download URL for the modified document
			http.get(downloadUrl, (response: http.IncomingMessage) => {
				if (response.statusCode !== 200) {
					reject(new Error(`Failed to download: ${response.statusCode}`));
					return;
				}

				const fileStream = fs.createWriteStream(targetUri.fsPath);
				response.pipe(fileStream);

				fileStream.on('finish', () => {
					fileStream.close();
					vscode.window.showInformationMessage('Presentation saved successfully');
					resolve();
				});

				fileStream.on('error', (err: Error) => {
					fs.unlink(targetUri.fsPath, () => { }); // Delete partial file
					reject(err);
				});
			}).on('error', reject);
		});
	}

	/**
	 * Generate a unique document key for OnlyOffice
	 */
	private generateDocumentKey(uri: vscode.Uri): string {
		const stat = fs.statSync(uri.fsPath);
		const data = `${uri.fsPath}-${stat.mtime.getTime()}`;
		return crypto.createHash('md5').update(data).digest('hex');
	}

	/**
	 * Handle messages from the webview
	 */
	private handleMessage(
		message: { type: string; message?: string }
	): void {
		switch (message.type) {
			case 'ready':
				// Webview is ready
				console.log('PPTX Editor webview ready');
				break;
			case 'error':
				vscode.window.showErrorMessage(`PPTX Editor: ${message.message}`);
				break;
			case 'onlyofficeReady':
				console.log('OnlyOffice editor loaded');
				break;
			case 'onlyofficeError':
				vscode.window.showErrorMessage(`OnlyOffice Error: ${message.message}`);
				break;
		}
	}

	/**
	 * Generate the HTML content for the webview with OnlyOffice editor
	 */
	private getHtmlForWebview(
		documentUri: vscode.Uri,
		fileUrl: string,
		callbackUrl: string,
		documentKey: string
	): string {
		const nonce = this.getNonce();
		const fileName = documentUri.path.split('/').pop() || 'Presentation';

		// OnlyOffice editor configuration
		const editorConfig = {
			document: {
				fileType: 'pptx',
				key: documentKey,
				title: fileName,
				url: fileUrl,
			},
			documentType: 'slide',
			editorConfig: {
				callbackUrl: callbackUrl,
				lang: 'en',
				mode: 'edit',
				customization: {
					autosave: true,
					chat: false,
					comments: false,
					compactHeader: true,
					compactToolbar: false,
					feedback: false,
					forcesave: true,
					help: false,
					hideRightMenu: false,
					hideRulers: false,
					logo: {
						image: '',
						visible: false
					},
					toolbarNoTabs: false,
					uiTheme: 'theme-dark', // Match VS Code dark theme
				},
				user: {
					id: 'vscode-user',
					name: 'VS Code User'
				}
			},
			height: '100%',
			width: '100%',
			type: 'desktop'
		};

		const configJson = JSON.stringify(editorConfig);

		return /* html */`<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<meta http-equiv="Content-Security-Policy" content="
		default-src 'none';
		style-src 'unsafe-inline' ${ONLYOFFICE_URL};
		script-src 'nonce-${nonce}' ${ONLYOFFICE_URL};
		frame-src ${ONLYOFFICE_URL};
		connect-src ${ONLYOFFICE_URL} http://127.0.0.1:* http://*:*;
		img-src ${ONLYOFFICE_URL} data: blob:;
		font-src ${ONLYOFFICE_URL};
		worker-src blob:;
	">
	<title>${this.escapeHtml(fileName)}</title>
	<style>
		* {
			margin: 0;
			padding: 0;
			box-sizing: border-box;
		}
		html, body {
			width: 100%;
			height: 100%;
			overflow: hidden;
			background: var(--vscode-editor-background, #1e1e1e);
		}
		#editor-container {
			width: 100%;
			height: 100%;
		}
		#loading {
			display: flex;
			flex-direction: column;
			align-items: center;
			justify-content: center;
			height: 100%;
			color: var(--vscode-foreground, #cccccc);
			font-family: var(--vscode-font-family, system-ui);
		}
		#loading .spinner {
			width: 40px;
			height: 40px;
			border: 3px solid var(--vscode-foreground, #cccccc);
			border-top-color: transparent;
			border-radius: 50%;
			animation: spin 1s linear infinite;
			margin-bottom: 16px;
		}
		@keyframes spin {
			to { transform: rotate(360deg); }
		}
		#loading.hidden {
			display: none;
		}
		#error {
			display: none;
			flex-direction: column;
			align-items: center;
			justify-content: center;
			height: 100%;
			color: var(--vscode-errorForeground, #f48771);
			font-family: var(--vscode-font-family, system-ui);
			padding: 20px;
			text-align: center;
		}
		#error.visible {
			display: flex;
		}
		#error .icon {
			font-size: 48px;
			margin-bottom: 16px;
		}
	</style>
</head>
<body>
	<div id="loading">
		<div class="spinner"></div>
		<div>Loading OnlyOffice Editor...</div>
		<div style="font-size: 12px; margin-top: 8px; opacity: 0.7;">${this.escapeHtml(fileName)}</div>
	</div>
	<div id="error">
		<div class="icon">⚠️</div>
		<div id="error-message">Failed to load OnlyOffice Editor</div>
		<div style="font-size: 12px; margin-top: 8px;">
			Make sure OnlyOffice Document Server is running at ${ONLYOFFICE_URL}
		</div>
	</div>
	<div id="editor-container"></div>

	<script src="${ONLYOFFICE_URL}/web-apps/apps/api/documents/api.js"></script>
	<script nonce="${nonce}">
		(function() {
			'use strict';

			// @ts-ignore
			const vscode = acquireVsCodeApi();
			const config = ${configJson};

			function showError(message) {
				document.getElementById('loading').classList.add('hidden');
				document.getElementById('error').classList.add('visible');
				document.getElementById('error-message').textContent = message;
				vscode.postMessage({ type: 'onlyofficeError', message: message });
			}

			function initEditor() {
				try {
					if (typeof DocsAPI === 'undefined') {
						showError('OnlyOffice API not loaded. Check if Document Server is running.');
						return;
					}

					// Hide loading indicator
					document.getElementById('loading').classList.add('hidden');

					// Initialize OnlyOffice editor
					new DocsAPI.DocEditor('editor-container', {
						...config,
						events: {
							onAppReady: function() {
								console.log('OnlyOffice App Ready');
								vscode.postMessage({ type: 'onlyofficeReady' });
							},
							onDocumentReady: function() {
								console.log('Document Ready');
							},
							onError: function(event) {
								console.error('OnlyOffice Error:', event);
								showError(event.data?.errorDescription || 'Unknown error occurred');
							},
							onWarning: function(event) {
								console.warn('OnlyOffice Warning:', event);
							},
							onRequestSaveAs: function(event) {
								console.log('Save As requested:', event);
							},
							onDocumentStateChange: function(event) {
								// event.data is true when document is modified
								console.log('Document state changed, modified:', event.data);
							}
						}
					});
				} catch (err) {
					showError('Failed to initialize editor: ' + err.message);
				}
			}

			// Wait for API to load
			if (typeof DocsAPI !== 'undefined') {
				initEditor();
			} else {
				// Retry after a short delay
				setTimeout(function() {
					if (typeof DocsAPI !== 'undefined') {
						initEditor();
					} else {
						showError('OnlyOffice API failed to load. Check if Document Server is running at ${ONLYOFFICE_URL}');
					}
				}, 2000);
			}

			// Notify extension that webview is ready
			vscode.postMessage({ type: 'ready' });
		})();
	</script>
</body>
</html>`;
	}

	/**
	 * Generate a random nonce for CSP
	 */
	private getNonce(): string {
		let text = '';
		const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
		for (let i = 0; i < 32; i++) {
			text += possible.charAt(Math.floor(Math.random() * possible.length));
		}
		return text;
	}

	/**
	 * Escape HTML special characters
	 */
	private escapeHtml(str: string): string {
		return str
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;')
			.replace(/'/g, '&#039;');
	}
}
