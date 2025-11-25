# Phase 1: Fork & Build VS Code

**Completed:** 2025-11-25

## Overview

Successfully forked VS Code and created a custom branded IDE called "PPTX Studio IDE" for editing PowerPoint presentations with AI assistance.

## Prerequisites Verified

| Requirement | Version Installed |
|-------------|-------------------|
| Node.js | v22.21.0 |
| npm | 10.9.2 |
| Python | 3.10.12 |
| GCC | 11.4.0 |
| Yarn | 1.22.22 (installed but not used) |

### System Libraries Installed

```bash
sudo apt-get install -y libxkbfile-dev libsecret-1-dev libkrb5-dev
```

These are required for native module compilation (native-keymap, keytar, kerberos).

## Repository Setup

```bash
# Created project directory
mkdir -p ~/projects

# Cloned VS Code (shallow clone for faster download)
git clone --depth 1 https://github.com/microsoft/vscode.git ~/projects/pptx-studio-ide

# Set up remotes
cd ~/projects/pptx-studio-ide
git remote rename origin upstream
# git remote add origin https://github.com/YOUR_USERNAME/pptx-studio-ide.git
```

## Build Process

### 1. Install Dependencies

VS Code no longer supports Yarn - uses npm instead:

```bash
cd ~/projects/pptx-studio-ide
npm install
```

This installs:
- Root dependencies (~1525 packages)
- Build tools
- All built-in extension dependencies (~50 extensions)
- Remote/server dependencies
- Test dependencies

**Time:** ~24 minutes (includes native module compilation)

### 2. Compile TypeScript

```bash
npm run watch
```

This runs two parallel tasks:
- `watch-client`: Compiles core VS Code (~148 seconds)
- `watch-extensions`: Compiles all extensions (~50 seconds)

Both completed with **0 errors**.

### 3. Launch Dev Build

```bash
./scripts/code.sh
```

## Custom Branding

Modified `product.json` with PPTX Studio branding:

```json
{
  "nameShort": "PPTX Studio",
  "nameLong": "PPTX Studio IDE",
  "applicationName": "pptx-studio",
  "dataFolderName": ".pptx-studio",
  "win32MutexName": "pptxstudio",
  "licenseName": "AGPL-3.0",
  "licenseUrl": "https://github.com/weijing/pptx-studio-ide/blob/main/LICENSE.txt",
  "serverApplicationName": "pptx-studio-server",
  "serverDataFolderName": ".pptx-studio-server",
  "tunnelApplicationName": "pptx-studio-tunnel",
  "win32DirName": "PPTX Studio IDE",
  "win32NameVersion": "PPTX Studio IDE",
  "win32RegValueName": "PPTXStudio",
  "win32AppUserModelId": "PPTXStudio",
  "win32ShellNameShort": "PPTX &Studio",
  "darwinBundleIdentifier": "com.pptxstudio.ide",
  "linuxIconName": "pptx-studio",
  "reportIssueUrl": "https://github.com/weijing/pptx-studio-ide/issues/new",
  "urlProtocol": "pptx-studio"
}
```

### Development Workaround

After changing `applicationName`, the launch script looks for a different Electron binary. Created symlink for development:

```bash
cd ~/projects/pptx-studio-ide/.build/electron
ln -s code-oss pptx-studio
```

## Verification

Confirmed working:
- ✅ Dev build launches successfully
- ✅ Data folder: `~/.pptx-studio-dev/extensions`
- ✅ Extension host starts correctly
- ✅ All built-in extensions load
- ✅ URL protocol registered as `pptx-studio://`

## Project Structure

```
~/projects/pptx-studio-ide/
├── .build/
│   └── electron/           # Electron binaries
│       ├── code-oss        # Original binary
│       └── pptx-studio     # Symlink for dev
├── extensions/             # Built-in extensions (future: pptx-editor here)
├── out/                    # Compiled TypeScript output
├── product.json            # Custom branding (modified)
├── scripts/
│   └── code.sh             # Launch script
└── docs/
    └── PHASE1-SETUP.md     # This file
```

## Development Workflow

1. Keep `npm run watch` running in background for auto-compilation
2. Launch IDE with `./scripts/code.sh`
3. Code changes auto-compile and can be tested with Reload Window (Ctrl+R)

## Notes

- **Licensing**: Using AGPL-3.0 due to OnlyOffice Community Edition dependency
- **Merge Strategy**: All custom code will go in `extensions/` folder to minimize upstream merge conflicts
- **Watch Process**: Runs in background, monitors for file changes

## Next Steps (Phase 2)

1. Create `extensions/pptx-editor/` directory structure
2. Implement `CustomEditorProvider` for .pptx files
3. Set up React webview from existing prototype
4. Configure Extension Host ↔ Webview communication via postMessage
