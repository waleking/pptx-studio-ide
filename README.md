# PPTX Studio IDE

A specialized IDE for editing PowerPoint presentations, built on VS Code with OnlyOffice integration.

## Overview

PPTX Studio IDE transforms VS Code into a powerful PowerPoint editing environment. Open `.pptx` files directly in the IDE and edit them with a full WYSIWYG editor powered by OnlyOffice Document Server.

## Features

- **WYSIWYG PowerPoint Editing** - Full visual editing with OnlyOffice
- **VS Code Foundation** - All the power of VS Code (extensions, themes, keybindings)
- **Built-in Extension** - No marketplace installation required
- **Local Processing** - Your files stay on your machine

## Quick Start

### Prerequisites

- Node.js v22.x
- Docker (for OnlyOffice Document Server)
- Python 3.10+
- Build tools (gcc/g++ on Linux, Xcode on macOS, Visual Studio Build Tools on Windows)

### Setup

```bash
# 1. Clone the repository
git clone https://github.com/waleking/pptx-studio-ide.git
cd pptx-studio-ide

# 2. Start OnlyOffice Document Server
docker run -d -p 8080:80 --name onlyoffice-pptx onlyoffice/documentserver

# 3. Install dependencies
npm install

# 4. Build
npm run build

# 5. Run
./scripts/code.sh
```

For detailed setup instructions, see [GETTING-STARTED.md](GETTING-STARTED.md).

## Architecture

```
┌────────────────────────────────────────────────┐
│              PPTX Studio IDE                   │
│  ┌──────────────────────────────────────────┐  │
│  │         pptx-editor Extension            │  │
│  │  - Custom editor for .pptx files         │  │
│  │  - Webview with OnlyOffice integration   │  │
│  └─────────────────┬────────────────────────┘  │
│                    │ HTTP                      │
│  ┌─────────────────▼────────────────────────┐  │
│  │    OnlyOffice Document Server (Docker)   │  │
│  │  - WYSIWYG presentation editor           │  │
│  │  - 90%+ MS Office compatibility          │  │
│  └──────────────────────────────────────────┘  │
└────────────────────────────────────────────────┘
```

## Documentation

| Document | Description |
|----------|-------------|
| [GETTING-STARTED.md](GETTING-STARTED.md) | Complete setup and usage guide |
| [docs/PHASE1-SETUP.md](docs/PHASE1-SETUP.md) | VS Code fork & build process |
| [docs/PHASE2-EXTENSION.md](docs/PHASE2-EXTENSION.md) | Extension development details |
| [docs/PHASE3-ONLYOFFICE.md](docs/PHASE3-ONLYOFFICE.md) | OnlyOffice integration |
| [docs/DISTRIBUTION-STRATEGY.md](docs/DISTRIBUTION-STRATEGY.md) | Future distribution plans |

## Project Status

| Phase | Status | Description |
|-------|--------|-------------|
| 1. Fork & Build | Complete | VS Code forked and building |
| 2. Extension | Complete | Built-in pptx-editor extension |
| 3. OnlyOffice | Complete | WYSIWYG editing integration |
| 4. Distribution | Planned | Bundle OnlyOffice for easy install |
| 5. AI Features | Planned | AI-assisted slide generation |

## Development

### Rebuild Extension

```bash
npx gulp compile-extension:pptx-editor
```

### Watch Mode

```bash
npx gulp watch-extension:pptx-editor
```

### Run Tests

```bash
npm test
```

## Contributing

Contributions are welcome! Please see the documentation in the `docs/` folder to understand the project architecture.

## License

- **PPTX Studio IDE** - Based on VS Code, [MIT License](LICENSE.txt)
- **OnlyOffice Document Server** - [AGPL v3](https://github.com/ONLYOFFICE/DocumentServer/blob/master/LICENSE)

## Acknowledgments

- [Visual Studio Code](https://github.com/microsoft/vscode) - The foundation of this IDE
- [OnlyOffice](https://github.com/ONLYOFFICE) - Document editing engine

---

*This project is a fork of [VS Code](https://github.com/microsoft/vscode) by Microsoft.*
