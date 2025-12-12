# PPTX Studio IDE - Getting Started

A VS Code-based IDE specialized for editing PowerPoint presentations with OnlyOffice integration.

## Prerequisites

### Required Software

| Software | Version | Purpose |
|----------|---------|---------|
| **Node.js** | v22.x | JavaScript runtime |
| **npm** | v10.x | Package manager (comes with Node.js) |
| **Python** | 3.10+ | Build tools |
| **GCC/G++** | 11+ | Native module compilation |
| **Git** | 2.x | Version control |
| **Docker** | 20.x+ | OnlyOffice Document Server |

### System Libraries (Linux/Ubuntu)

```bash
# Build essentials
sudo apt-get install -y build-essential g++ libx11-dev libxkbfile-dev libsecret-1-dev libkrb5-dev

# Additional dependencies
sudo apt-get install -y python3 python-is-python3 pkg-config
```

### System Libraries (macOS)

```bash
# Install Xcode Command Line Tools
xcode-select --install

# Install Homebrew packages
brew install python pkg-config
```

### System Libraries (Windows)

```powershell
# Install Visual Studio Build Tools
# Download from: https://visualstudio.microsoft.com/visual-cpp-build-tools/

# Or use npm to install build tools
npm install --global windows-build-tools
```

---

## Quick Start

### Step 1: Clone the Repository

```bash
git clone https://github.com/waleking/pptx-studio-ide.git
cd pptx-studio-ide
```

### Step 2: Start OnlyOffice Document Server

OnlyOffice provides the WYSIWYG PowerPoint editing capability.

```bash
# Pull and start OnlyOffice (first time - takes a few minutes)
docker run -d -p 8080:80 --name onlyoffice-pptx onlyoffice/documentserver

# Wait for OnlyOffice to initialize (~30-60 seconds)
# Check if ready:
curl http://localhost:8080/healthcheck
```

**Managing OnlyOffice:**
```bash
# Check if running
docker ps | grep onlyoffice

# Stop
docker stop onlyoffice-pptx

# Start (after stopping)
docker start onlyoffice-pptx

# View logs
docker logs onlyoffice-pptx

# Remove completely
docker rm -f onlyoffice-pptx
```

### Step 3: Install Dependencies

```bash
# Install Node.js dependencies (takes 5-10 minutes)
npm install
```

### Step 4: Build the Project

```bash
# Full build (takes 10-20 minutes on first run)
npm run build

# Or compile only the pptx-editor extension
npx gulp compile-extension:pptx-editor
```

### Step 5: Run PPTX Studio IDE

```bash
# Start the development version
./scripts/code.sh

# On Windows:
# .\scripts\code.bat
```

---

## Testing the PPTX Editor

### Important: Known Timing Issue

Due to a VS Code timing issue ([GitHub #117145](https://github.com/microsoft/vscode/issues/117145)), opening a `.pptx` file directly may not work on first launch.

**Recommended procedure:**
1. Start PPTX Studio IDE first (without opening a file)
2. Wait 2-3 seconds for extensions to load
3. Use **File > Open File** to open a `.pptx` file

### Verify Extension is Active

1. Open the Extensions view (`Ctrl+Shift+X`)
2. Search for "PPTX"
3. Confirm "PPTX Editor" is installed and enabled

### Test with a Sample File

```bash
# Create a test directory with a sample pptx
mkdir -p ~/pptx-test
# Copy any .pptx file to ~/pptx-test/

# Open in PPTX Studio IDE
./scripts/code.sh ~/pptx-test/sample.pptx
```

---

## Project Structure

```
pptx-studio-ide/
├── extensions/
│   └── pptx-editor/           # Our custom PPTX editor extension
│       ├── src/
│       │   ├── extension.ts           # Extension entry point
│       │   ├── pptxEditorProvider.ts  # Custom editor provider
│       │   └── fileServer.ts          # HTTP server for OnlyOffice
│       ├── media/
│       │   ├── main.css               # Webview styles
│       │   └── main.js                # Webview scripts
│       └── package.json               # Extension manifest
├── docs/
│   ├── PHASE1-SETUP.md        # Fork & build documentation
│   ├── PHASE2-EXTENSION.md    # Extension development docs
│   ├── PHASE3-ONLYOFFICE.md   # OnlyOffice integration docs
│   ├── DISTRIBUTION-STRATEGY.md # Future distribution plans
│   └── GIT-CLONE-DEPTH.md     # Git shallow/full clone guide
├── src/                       # VS Code core source
└── ...                        # Other VS Code directories
```

---

## Troubleshooting

### Extension Not Showing

**Symptom**: PPTX Editor extension is disabled or not visible

**Solutions**:
1. Check the extension is built: `ls extensions/pptx-editor/out/`
2. Rebuild: `npx gulp compile-extension:pptx-editor`
3. Restart PPTX Studio IDE

### OnlyOffice Not Loading

**Symptom**: Editor shows "Connecting to OnlyOffice..." but never loads

**Solutions**:
1. Verify Docker is running: `docker ps | grep onlyoffice`
2. Check OnlyOffice health: `curl http://localhost:8080/healthcheck`
3. Restart OnlyOffice: `docker restart onlyoffice-pptx`
4. Check logs: `docker logs onlyoffice-pptx`

### Build Errors

**Symptom**: `npm install` or `npm run build` fails

**Solutions**:
1. Verify Node.js version: `node --version` (should be v22.x)
2. Clear npm cache: `npm cache clean --force`
3. Delete node_modules and reinstall: `rm -rf node_modules && npm install`
4. Check system dependencies are installed (see Prerequisites)

### Binary Editor Shows Instead of PPTX Editor

**Symptom**: Opening .pptx shows hex view instead of OnlyOffice

**Solutions**:
1. Use **File > Open File** instead of command line
2. Wait for extensions to load before opening files
3. Right-click file > "Open With..." > "PPTX Preview"

---

## Development Workflow

### Rebuilding After Changes

```bash
# Rebuild only the pptx-editor extension
npx gulp compile-extension:pptx-editor

# Watch mode for continuous rebuilding
npx gulp watch-extension:pptx-editor
```

### Running Tests

```bash
# Run all tests
npm test

# Run extension tests
npm run test-extension
```

### Code Hygiene

Before committing, ensure code passes hygiene checks:
```bash
# Run linter
npm run lint

# Format code
npm run format
```

---

## Next Steps

See the [docs/](docs/) folder for detailed documentation:
- [Phase 1: Fork & Setup](docs/PHASE1-SETUP.md)
- [Phase 2: Extension Development](docs/PHASE2-EXTENSION.md)
- [Phase 3: OnlyOffice Integration](docs/PHASE3-ONLYOFFICE.md)
- [Distribution Strategy](docs/DISTRIBUTION-STRATEGY.md)

---

## License

This project is based on VS Code ([MIT License](LICENSE.txt)).

OnlyOffice Document Server is licensed under [AGPL v3](https://github.com/ONLYOFFICE/DocumentServer/blob/master/LICENSE).
