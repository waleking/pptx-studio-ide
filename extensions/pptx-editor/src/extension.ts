/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { PptxEditorProvider } from './pptxEditorProvider';
import { disposeFileServer } from './fileServer';

// Log immediately when module is loaded
console.log('[PPTX Editor] Module loaded');

export function activate(context: vscode.ExtensionContext) {
	console.log('[PPTX Editor] Activating extension...');

	// Register the custom editor provider for .pptx files
	const registration = PptxEditorProvider.register(context);
	context.subscriptions.push(registration);

	console.log('[PPTX Editor] Custom editor provider registered for viewType:', PptxEditorProvider.viewType);

	// Dispose file server when extension is deactivated
	context.subscriptions.push({
		dispose: () => {
			disposeFileServer();
		}
	});
}

export function deactivate() {
	disposeFileServer();
}
