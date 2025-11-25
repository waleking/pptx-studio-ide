# Phase 3: OnlyOffice Document Server Integration

**Status**: ✅ Completed
**Date**: November 25, 2024

## Overview

Integrated OnlyOffice Document Server to enable WYSIWYG editing of PowerPoint presentations directly within PPTX Studio IDE.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     PPTX Studio IDE                              │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                    Extension Host                            ││
│  │  ┌───────────────────┐    ┌───────────────────────────────┐ ││
│  │  │  PptxEditorProvider│    │       FileServer              │ ││
│  │  │  - resolveCustom  │    │  - HTTP server (port random)  │ ││
│  │  │  - handleCallback │────│  - Serves .pptx files         │ ││
│  │  │  - saveDocument   │    │  - Handles OnlyOffice callbacks│ ││
│  │  └───────────────────┘    └───────────────────────────────┘ ││
│  └─────────────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                       Webview                                ││
│  │  ┌─────────────────────────────────────────────────────────┐││
│  │  │         OnlyOffice DocEditor (iframe)                   │││
│  │  │    - Full WYSIWYG presentation editing                  │││
│  │  │    - Slide creation, transitions, animations            │││
│  │  │    - Dark theme matching VS Code                        │││
│  │  └─────────────────────────────────────────────────────────┘││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ HTTP
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              OnlyOffice Document Server (Docker)                 │
│              http://localhost:8080                               │
│  - Renders and processes .pptx files                            │
│  - Handles collaborative editing                                 │
│  - Provides callback for document save                          │
└─────────────────────────────────────────────────────────────────┘
```

## Components

### 1. FileServer (`fileServer.ts`)

Local HTTP server that bridges the VS Code extension with OnlyOffice:

```typescript
export class FileServer {
    // Serves files to OnlyOffice Document Server
    // Handles save callbacks from OnlyOffice
    // Uses host IP for Docker container accessibility
}
```

**Features**:
- Dynamic port allocation (random available port)
- CORS headers for cross-origin requests
- File registration with secure tokens
- Callback handling for save events
- Host IP detection for Docker networking

### 2. PptxEditorProvider Updates

Enhanced to integrate with OnlyOffice:

```typescript
// OnlyOffice editor configuration
const editorConfig = {
    document: {
        fileType: 'pptx',
        key: documentKey,  // Unique key for each file version
        title: fileName,
        url: fileUrl,      // Served by FileServer
    },
    documentType: 'slide',
    editorConfig: {
        callbackUrl: callbackUrl,
        mode: 'edit',
        customization: {
            uiTheme: 'theme-dark',  // Match VS Code
            autosave: true,
            forcesave: true,
        }
    }
};
```

### 3. Webview Integration

The webview embeds OnlyOffice using their JavaScript API:

```html
<script src="http://localhost:8080/web-apps/apps/api/documents/api.js"></script>
<script>
    new DocsAPI.DocEditor('editor-container', config);
</script>
```

## OnlyOffice Callback Flow

```
1. User opens .pptx file
2. Extension starts FileServer
3. FileServer registers file with unique token
4. Webview loads OnlyOffice API
5. OnlyOffice fetches file via FileServer URL
6. User edits presentation
7. On save/close:
   - OnlyOffice sends callback to FileServer
   - Callback includes download URL for modified file
   - Extension downloads and saves to original location
```

### Callback Status Codes

| Status | Description | Action |
|--------|-------------|--------|
| 1 | Document being edited | None |
| 2 | Ready for saving | Download and save |
| 4 | Closed without changes | None |
| 6 | Force save triggered | Download and save |

## Docker Networking

OnlyOffice runs in Docker and needs to access the FileServer on the host:

```typescript
// FileServer listens on 0.0.0.0 (all interfaces)
this.server.listen(0, '0.0.0.0', () => {...});

// URLs use host IP instead of 127.0.0.1
url: `http://${this.hostIp}:${this.port}/file/${token}`
```

## Content Security Policy

Configured to allow OnlyOffice resources:

```
default-src 'none';
style-src 'unsafe-inline' http://localhost:8080;
script-src 'nonce-xxx' http://localhost:8080;
frame-src http://localhost:8080;
connect-src http://localhost:8080 http://*:*;
img-src http://localhost:8080 data: blob:;
font-src http://localhost:8080;
worker-src blob:;
```

## Prerequisites

### OnlyOffice Document Server

**First-time setup** - Create and start the container:
```bash
docker run -i -t -d -p 8080:80 \
    --name onlyoffice-test \
    onlyoffice/documentserver:latest
```

**Restart existing container** (if already created):
```bash
# Check if container exists
docker ps -a | grep onlyoffice

# Start existing container
docker start onlyoffice-test
```

**Verify it's running**:
```bash
# Check container status
docker ps | grep onlyoffice

# Check healthcheck endpoint
curl http://localhost:8080/healthcheck
# Returns: true
```

## Extension Configuration

### package.json Key Settings

The custom editor extension requires specific configuration to work properly:

```json
{
  "publisher": "vscode",
  "extensionKind": ["ui", "workspace"],
  "activationEvents": [],
  "capabilities": {
    "virtualWorkspaces": true,
    "untrustedWorkspaces": {
      "supported": true
    }
  },
  "contributes": {
    "customEditors": [{
      "viewType": "pptxEditor.preview",
      "displayName": "PPTX Preview",
      "priority": "default",
      "selector": [{ "filenamePattern": "*.pptx" }]
    }]
  }
}
```

**Important Configuration Notes**:
- `publisher`: Must be `"vscode"` for built-in extensions
- `capabilities.untrustedWorkspaces.supported`: Must be `true` or extension will be disabled
- `capabilities.virtualWorkspaces`: Should be `true` for broader compatibility
- `priority`: Use `"default"` (not `"builtin"` which is undocumented/internal)

## Files Created/Modified

| File | Change |
|------|--------|
| `src/fileServer.ts` | New - HTTP server for OnlyOffice integration |
| `src/pptxEditorProvider.ts` | Updated - OnlyOffice webview integration |
| `src/extension.ts` | Updated - FileServer cleanup on deactivate |
| `package.json` | Custom editor config, @types/node dependency |
| `package.nls.json` | Localization strings for display names |
| `tsconfig.json` | Added skipLibCheck for Node.js types |
| `.npmrc` | npm configuration for extension build |

## Testing

### Recommended Testing Procedure

Due to a [known VS Code timing issue](https://github.com/microsoft/vscode/issues/117145), custom editors may not activate if a file is opened while extensions are still loading.

**Correct way to test:**

1. Start OnlyOffice Document Server (Docker)
2. Launch PPTX Studio IDE **without opening a file**:
   ```bash
   cd ~/projects/pptx-studio-ide && ./scripts/code.sh --disable-gpu
   ```
3. Wait ~5 seconds for extensions to fully activate
4. Use **File → Open File** (Ctrl+O) to open a .pptx file
5. The custom PPTX editor should load with OnlyOffice

**Why not open via command line?**
Opening a file directly via command line (`./scripts/code.sh file.pptx`) may cause VS Code to try opening the file before extensions are activated, resulting in a binary file error.

### Verify Extension is Working

1. Check Developer Console (Help → Toggle Developer Tools) for `[PPTX Editor]` messages
2. Check Extensions View (Ctrl+Shift+X → search `@builtin pptx`) - should show as enabled
3. When opening a .pptx file, you should see the OnlyOffice loading spinner, then the editor

## Known Limitations

1. **Single Editor**: Only one editor per document (OnlyOffice limitation)
2. **Network Required**: OnlyOffice server must be accessible
3. **Docker Networking**: File server uses host IP for Docker access
4. **Save Delay**: Autosave has a delay before triggering callback
5. **Startup Timing**: Files must be opened after extensions activate (see Testing section)
6. **GPU Issues**: May need `--disable-gpu` flag on some systems

## Troubleshooting

### Extension appears disabled
- Ensure `untrustedWorkspaces.supported` is `true` in package.json
- Ensure `virtualWorkspaces` is `true` in package.json

### Binary file error when opening .pptx
- Don't open files via command line argument
- Open VS Code first, then use File → Open File
- Wait for extensions to fully load before opening files

### OnlyOffice not loading
- Verify Docker container is running: `docker ps | grep onlyoffice`
- Check healthcheck: `curl http://localhost:8080/healthcheck`
- Check browser console for CORS or CSP errors

### Webview sandbox warning
- The "allow-scripts and allow-same-origin" warning is expected and can be ignored
- This is required for OnlyOffice iframe to function

## Future Improvements

- [ ] JWT authentication for OnlyOffice
- [ ] Offline editing support
- [ ] Real-time collaboration indicators
- [ ] Custom toolbar integration with VS Code
- [ ] Slide navigator panel
- [ ] Fix command-line file opening timing issue

## Configuration

OnlyOffice URL can be configured (currently hardcoded):
```typescript
const ONLYOFFICE_URL = 'http://localhost:8080';
```

Future: Add VS Code settings for:
- OnlyOffice server URL
- JWT secret (for production)
- Autosave interval
- UI theme preference

## References

- [VS Code Custom Editor API](https://code.visualstudio.com/api/extension-guides/custom-editors)
- [VS Code Activation Events](https://code.visualstudio.com/api/references/activation-events)
- [GitHub Issue #117145 - Custom editor timing](https://github.com/microsoft/vscode/issues/117145)
- [OnlyOffice Document Server API](https://api.onlyoffice.com/editors/basic)
