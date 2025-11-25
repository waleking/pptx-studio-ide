/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

(function () {
	'use strict';

	// Get VS Code API
	// @ts-ignore
	const vscode = acquireVsCodeApi();

	// State management
	let state = {
		fileName: '',
		fileSize: 0,
		uri: '',
		loaded: false
	};

	// DOM elements
	const elements = {
		fileSize: document.getElementById('fileSize'),
		statusMessage: document.getElementById('statusMessage'),
		status: document.getElementById('status'),
		placeholder: document.getElementById('placeholder')
	};

	/**
	 * Format file size for display
	 */
	function formatFileSize(bytes) {
		if (bytes === 0) { return '0 Bytes'; }
		const k = 1024;
		const sizes = ['Bytes', 'KB', 'MB', 'GB'];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
	}

	/**
	 * Update status message
	 */
	function setStatus(message) {
		if (elements.status) {
			elements.status.textContent = message;
		}
	}

	/**
	 * Update the UI with file info
	 */
	function updateFileInfo(info) {
		state.fileName = info.fileName;
		state.fileSize = info.fileSize;
		state.uri = info.uri;

		if (elements.fileSize) {
			elements.fileSize.textContent = formatFileSize(info.fileSize);
		}

		if (elements.statusMessage) {
			elements.statusMessage.textContent = `File: ${info.fileName} (${formatFileSize(info.fileSize)})`;
		}

		setStatus('File loaded');
		state.loaded = true;

		// Save state
		vscode.setState(state);
	}

	/**
	 * Handle file content received from extension
	 */
	function handleFileContent(data) {
		console.log('File ready:', data.fileName, 'Size:', data.fileSize);
		setStatus('Ready for OnlyOffice integration');

		// In Phase 3, this will initialize OnlyOffice with the content
		// For now, just update the status
		if (elements.statusMessage) {
			elements.statusMessage.innerHTML = `
				<strong>${data.fileName}</strong><br>
				File size: ${formatFileSize(data.fileSize || state.fileSize)}<br>
				<small>${data.message || 'Ready'}</small>
			`;
		}
	}

	/**
	 * Handle error messages
	 */
	function handleError(message) {
		console.error('PPTX Editor Error:', message);
		setStatus('Error: ' + message);

		if (elements.statusMessage) {
			elements.statusMessage.textContent = 'Error: ' + message;
		}

		document.body.classList.add('error');
	}

	/**
	 * Handle messages from the extension host
	 */
	function handleMessage(event) {
		const message = event.data;

		switch (message.type) {
			case 'fileInfo':
				updateFileInfo(message);
				// Request file content after getting info
				vscode.postMessage({ type: 'getFileContent' });
				break;

			case 'fileContent':
				handleFileContent(message);
				break;

			case 'fileChanged':
				setStatus('File changed - Reloading...');
				vscode.postMessage({ type: 'getFileContent' });
				break;

			case 'error':
				handleError(message.message);
				break;
		}
	}

	/**
	 * Initialize the webview
	 */
	function initialize() {
		// Restore state if available
		const previousState = vscode.getState();
		if (previousState) {
			state = previousState;
			if (state.loaded) {
				updateFileInfo({
					fileName: state.fileName,
					fileSize: state.fileSize,
					uri: state.uri
				});
			}
		}

		// Listen for messages from extension
		window.addEventListener('message', handleMessage);

		// Tell extension we're ready
		vscode.postMessage({ type: 'ready' });
		setStatus('Initializing...');
	}

	// Initialize when DOM is ready
	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', initialize);
	} else {
		initialize();
	}
})();
