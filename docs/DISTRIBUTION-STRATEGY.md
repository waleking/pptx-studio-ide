# PPTX Studio IDE: Distribution Strategy

## Overview

This document analyzes distribution options for PPTX Studio IDE, focusing on how to deliver the OnlyOffice-powered PPTX editing experience to end users without requiring them to manually manage Docker containers.

## Current State

**Current approach**: Users must manually run OnlyOffice Document Server in Docker:
```bash
docker run -d -p 8080:80 --name onlyoffice-test onlyoffice/documentserver
```

**Problem**: Poor UX - requires Docker knowledge, manual setup, ongoing container management.

---

## Distribution Options Analysis

### Option 1: User Runs Docker (Current)

| Aspect | Details |
|--------|---------|
| **Implementation effort** | None (already done) |
| **User experience** | Poor - technical barrier |
| **Target audience** | Developers only |
| **Distribution size** | ~100MB (IDE only) |

**Verdict**: Only acceptable for developer/power user audience during early development.

---

### Option 2: Bundle OnlyOffice DocumentServer Locally

OnlyOffice provides native installers that don't require Docker.

#### Platform Support

| Platform | Installation Method | Size |
|----------|---------------------|------|
| **Windows** | `.exe` installer | ~500MB |
| **Linux** | `.deb`/`.rpm` packages | ~500MB |
| **macOS** | Not officially supported | N/A |

#### Architecture

```
┌─────────────────────────────────────────────┐
│  PPTX Studio IDE (Electron/VS Code)         │
│  ┌─────────────────────────────────────┐    │
│  │  Webview (pptx-editor extension)    │    │
│  │  - Loads OnlyOffice JS API          │    │
│  │  - iframe to local server           │    │
│  └──────────────┬──────────────────────┘    │
│                 │ HTTP localhost:8080       │
│  ┌──────────────▼──────────────────────┐    │
│  │  Bundled OnlyOffice DocumentServer  │    │
│  │  - Node.js services                 │    │
│  │  - PostgreSQL/Redis (embedded)      │    │
│  │  - Auto-started on IDE launch       │    │
│  │  - Auto-stopped on IDE close        │    │
│  └─────────────────────────────────────┘    │
└─────────────────────────────────────────────┘
```

#### Implementation Steps

1. **Bundle the server binaries**
   ```
   pptx-studio-ide/
   ├── resources/
   │   └── onlyoffice/           # Bundled DocumentServer
   │       ├── bin/
   │       ├── server/
   │       └── fonts/
   ```

2. **Auto-start on IDE launch**
   ```typescript
   import { spawn } from 'child_process';

   export function activate(context) {
     const server = spawn(getDocumentServerPath(), ['--port', '8080']);
     context.subscriptions.push({
       dispose: () => server.kill()
     });
   }
   ```

3. **Wait for server ready before loading editor**
   ```typescript
   async function waitForServer(port: number, timeout: number) {
     const start = Date.now();
     while (Date.now() - start < timeout) {
       if (await isServerReady(port)) return true;
       await sleep(100);
     }
     throw new Error('Server failed to start');
   }
   ```

| Aspect | Details |
|--------|---------|
| **Implementation effort** | 2-4 weeks |
| **User experience** | Excellent - transparent to user |
| **Target audience** | All users |
| **Distribution size** | ~600MB |

**Verdict**: Best long-term solution for desktop distribution.

---

### Option 3: Auto-Manage Docker for Users

Make Docker invisible - IDE handles everything automatically.

#### Implementation

```typescript
async function ensureOnlyOffice() {
  // Check if Docker is installed
  if (!await isDockerInstalled()) {
    showInstallDockerPrompt();
    return;
  }

  // Check if container exists
  if (!await containerExists('onlyoffice-pptx-studio')) {
    await pullImage('onlyoffice/documentserver');
    await createContainer('onlyoffice-pptx-studio');
  }

  // Start container if not running
  if (!await isContainerRunning('onlyoffice-pptx-studio')) {
    await startContainer('onlyoffice-pptx-studio');
  }

  // Wait for server ready
  await waitForServer(8080, 30000);
}
```

| Aspect | Details |
|--------|---------|
| **Implementation effort** | 1-2 weeks |
| **User experience** | Good - still requires Docker installed |
| **Target audience** | Technical users |
| **Distribution size** | ~100MB (IDE) + ~2GB (Docker image) |

**Verdict**: Good short-term solution, keeps current architecture.

---

### Option 4: Hosted OnlyOffice (SaaS)

Host OnlyOffice on cloud servers, IDE connects remotely.

| Aspect | Details |
|--------|---------|
| **Implementation effort** | 2-3 weeks |
| **User experience** | Excellent - nothing to install |
| **Target audience** | All users |
| **Distribution size** | ~100MB |
| **Ongoing cost** | $50-200/month for servers |
| **Limitations** | Requires internet, privacy concerns |

**Verdict**: Good for quick onboarding, offer as option alongside local.

---

### Option 5: Hybrid Cloud/Local

Combine Options 2/3 and 4:
- **Default**: Hosted OnlyOffice for instant start
- **Option**: Local server for offline/privacy

| Aspect | Details |
|--------|---------|
| **Implementation effort** | 3-4 weeks |
| **User experience** | Best - flexible |
| **Target audience** | All users |

**Verdict**: Best overall UX but more complex to implement.

---

## OnlyOffice: Open Source Details

### License

OnlyOffice is licensed under **GNU AGPL v3.0**:
- Free to use, modify, and distribute
- **Requirement**: If you distribute, your code must also be AGPL (open source)
- **Alternative**: Purchase commercial license (~$1,500-5,000/year) to keep code proprietary

Since VS Code is MIT licensed and we're building open source, AGPL is compatible.

### GitHub Repositories

| Repository | Description | URL |
|------------|-------------|-----|
| DocumentServer | Web-based editors | https://github.com/ONLYOFFICE/DocumentServer |
| DesktopEditors | Standalone desktop app | https://github.com/ONLYOFFICE/DesktopEditors |
| sdkjs | Core JS editor engine | https://github.com/nicce/pptxjs |
| server | Backend services | https://github.com/nicce/pptx-viewer |

### Building from Source

OnlyOffice can be built from source:
- **Documentation**: https://helpcenter.onlyoffice.com/docs/development
- **Build time**: Several hours
- **Complexity**: High (many dependencies)

---

## Cost Analysis: Build vs Bundle

### Building a Similar Editor from Scratch

| Factor | OnlyOffice Reality | Estimated Cost |
|--------|-------------------|----------------|
| **Development time** | 10+ years (started 2012) | 5-8 years minimum |
| **Team size** | International, 8+ offices | 10-20 full-time devs |
| **Investment** | $10-20M+ lifetime | $5-15M minimum |

### Why Office Editors Are Complex

PPTX editing requires:
- **OOXML specification**: 6,000+ page Microsoft spec
- **Rendering engine**: Text, shapes, charts, SmartArt, animations, transitions
- **Font handling**: Embedding, substitution, cross-platform rendering
- **Formula engine**: For embedded Excel charts
- **Real-time collaboration**: OT/CRDT algorithms
- **File compatibility**: MS Office round-trip fidelity (90%+ accuracy)

### Bundling OnlyOffice (Recommended)

| Approach | Cost | Time |
|----------|------|------|
| Bundle pre-built binaries | $0 | 1-2 weeks |
| Build from source + customize | $0 | 1-2 months |
| Commercial license (proprietary) | $1,500-5,000/year | 1-2 weeks |

---

## Recommended Strategy

### Phase 1: Development (Current)
- Use Docker-based OnlyOffice
- Target: Developers and early testers

### Phase 2: Alpha Release
- Implement Option 3 (Auto-manage Docker)
- Target: Technical early adopters

### Phase 3: Beta Release
- Implement Option 2 (Bundle DocumentServer)
- Target: General users on Windows/Linux

### Phase 4: Public Release
- Implement Option 5 (Hybrid)
- Offer both cloud and local options
- Target: All users

---

## References

- [OnlyOffice GitHub Organization](https://github.com/ONLYOFFICE)
- [OnlyOffice DocumentServer](https://github.com/ONLYOFFICE/DocumentServer)
- [OnlyOffice Desktop Editors](https://github.com/ONLYOFFICE/DesktopEditors)
- [OnlyOffice 10-Year Journey](https://www.onlyoffice.com/blog/2022/03/onlyoffice-editors-a-10-year-journey)
- [OnlyOffice Windows Installation](https://helpcenter.onlyoffice.com/docs/installation/docs-community-install-windows.aspx)
- [OnlyOffice Local Installation Guide](https://community.onlyoffice.com/t/how-to-install-onlyoffice-document-server-locally-without-docker/8307)
- [Building OnlyOffice from Source](https://www.onlyoffice.com/blog/2020/04/compile-onlyoffice-from-source-code)
