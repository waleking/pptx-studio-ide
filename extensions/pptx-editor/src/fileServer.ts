/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import * as os from 'os';
import * as vscode from 'vscode';

interface ServedFile {
	filePath: string;
	uri: vscode.Uri;
	token: string;
	mimeType: string;
}

interface OnlyOfficeCallback {
	status: number;
	url?: string;
	key?: string;
	users?: string[];
}

/**
 * Local HTTP server for serving files to OnlyOffice Document Server
 */
export class FileServer {
	private server: http.Server | null = null;
	private servedFiles: Map<string, ServedFile> = new Map();
	private port: number = 0;
	private hostIp: string = '127.0.0.1';
	private callbackHandlers: Map<string, (data: OnlyOfficeCallback) => void> = new Map();

	constructor() {
		this.hostIp = this.getHostIp();
	}

	/**
	 * Get the host IP address for Docker containers to reach this server
	 */
	private getHostIp(): string {
		const interfaces = os.networkInterfaces();
		for (const name of Object.keys(interfaces)) {
			const iface = interfaces[name];
			if (iface) {
				for (const info of iface) {
					// Skip internal and non-IPv4 addresses
					if (!info.internal && info.family === 'IPv4') {
						return info.address;
					}
				}
			}
		}
		return '127.0.0.1';
	}

	/**
	 * Start the file server
	 */
	public async start(): Promise<number> {
		if (this.server) {
			return this.port;
		}

		return new Promise((resolve, reject) => {
			this.server = http.createServer((req: http.IncomingMessage, res: http.ServerResponse) => this.handleRequest(req, res));

			// Listen on all interfaces so Docker containers can reach us
			this.server.listen(0, '0.0.0.0', () => {
				const address = this.server!.address();
				if (address && typeof address !== 'string') {
					this.port = address.port;
					console.log(`PPTX Editor file server started on port ${this.port}`);
					resolve(this.port);
				} else {
					reject(new Error('Failed to get server port'));
				}
			});

			this.server.on('error', (err: Error) => {
				console.error('File server error:', err);
				reject(err);
			});
		});
	}

	/**
	 * Stop the file server
	 */
	public stop(): void {
		if (this.server) {
			this.server.close();
			this.server = null;
			this.port = 0;
			this.servedFiles.clear();
			this.callbackHandlers.clear();
		}
	}

	/**
	 * Register a file to be served
	 */
	public registerFile(uri: vscode.Uri): { url: string; token: string; callbackUrl: string } {
		const token = crypto.randomBytes(16).toString('hex');
		const filePath = uri.fsPath;
		const ext = path.extname(filePath).toLowerCase();

		const mimeTypes: { [key: string]: string } = {
			'.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
			'.ppt': 'application/vnd.ms-powerpoint',
			'.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
			'.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
		};

		this.servedFiles.set(token, {
			filePath,
			uri,
			token,
			mimeType: mimeTypes[ext] || 'application/octet-stream'
		});

		return {
			url: `http://${this.hostIp}:${this.port}/file/${token}`,
			token,
			callbackUrl: `http://${this.hostIp}:${this.port}/callback/${token}`
		};
	}

	/**
	 * Unregister a file
	 */
	public unregisterFile(token: string): void {
		this.servedFiles.delete(token);
		this.callbackHandlers.delete(token);
	}

	/**
	 * Register a callback handler for save events
	 */
	public onCallback(token: string, handler: (data: OnlyOfficeCallback) => void): void {
		this.callbackHandlers.set(token, handler);
	}

	/**
	 * Get server port
	 */
	public getPort(): number {
		return this.port;
	}

	/**
	 * Handle incoming HTTP requests
	 */
	private handleRequest(req: http.IncomingMessage, res: http.ServerResponse): void {
		const url = req.url || '/';

		// Enable CORS for OnlyOffice
		res.setHeader('Access-Control-Allow-Origin', '*');
		res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
		res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

		if (req.method === 'OPTIONS') {
			res.writeHead(200);
			res.end();
			return;
		}

		// Route: GET /file/:token - Serve file content
		if (url.startsWith('/file/') && req.method === 'GET') {
			const token = url.substring(6);
			this.serveFile(token, res);
			return;
		}

		// Route: POST /callback/:token - Handle OnlyOffice callback
		if (url.startsWith('/callback/') && req.method === 'POST') {
			const token = url.substring(10);
			this.handleCallback(token, req, res);
			return;
		}

		// Route: GET /health - Health check
		if (url === '/health') {
			res.writeHead(200, { 'Content-Type': 'application/json' });
			res.end(JSON.stringify({ status: 'ok', port: this.port }));
			return;
		}

		// 404 for unknown routes
		res.writeHead(404, { 'Content-Type': 'text/plain' });
		res.end('Not Found');
	}

	/**
	 * Serve a registered file
	 */
	private serveFile(token: string, res: http.ServerResponse): void {
		const fileInfo = this.servedFiles.get(token);

		if (!fileInfo) {
			res.writeHead(404, { 'Content-Type': 'text/plain' });
			res.end('File not found');
			return;
		}

		try {
			const stat = fs.statSync(fileInfo.filePath);
			const fileStream = fs.createReadStream(fileInfo.filePath);

			res.writeHead(200, {
				'Content-Type': fileInfo.mimeType,
				'Content-Length': stat.size,
				'Content-Disposition': `attachment; filename="${path.basename(fileInfo.filePath)}"`,
			});

			fileStream.pipe(res);
			fileStream.on('error', (err: Error) => {
				console.error('Error streaming file:', err);
				if (!res.headersSent) {
					res.writeHead(500);
				}
				res.end('Error reading file');
			});
		} catch (err) {
			console.error('Error serving file:', err);
			res.writeHead(500, { 'Content-Type': 'text/plain' });
			res.end('Error reading file');
		}
	}

	/**
	 * Handle OnlyOffice callback (save events)
	 */
	private handleCallback(token: string, req: http.IncomingMessage, res: http.ServerResponse): void {
		let body = '';

		req.on('data', (chunk: Buffer) => {
			body += chunk.toString();
		});

		req.on('end', () => {
			try {
				const data = JSON.parse(body) as OnlyOfficeCallback;
				console.log('OnlyOffice callback:', data);

				const handler = this.callbackHandlers.get(token);
				if (handler) {
					handler(data);
				}

				// OnlyOffice expects {"error": 0} for success
				res.writeHead(200, { 'Content-Type': 'application/json' });
				res.end(JSON.stringify({ error: 0 }));
			} catch (err) {
				console.error('Error handling callback:', err);
				res.writeHead(500, { 'Content-Type': 'application/json' });
				res.end(JSON.stringify({ error: 1 }));
			}
		});
	}
}

// Singleton instance
let fileServerInstance: FileServer | null = null;

export function getFileServer(): FileServer {
	if (!fileServerInstance) {
		fileServerInstance = new FileServer();
	}
	return fileServerInstance;
}

export function disposeFileServer(): void {
	if (fileServerInstance) {
		fileServerInstance.stop();
		fileServerInstance = null;
	}
}
