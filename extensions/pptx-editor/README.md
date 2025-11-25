# PPTX Editor Extension

Built-in extension for PPTX Studio IDE that provides a custom editor for PowerPoint (.pptx) files.

## Features

- **Custom Editor**: Opens .pptx files in a custom editor instead of the hex/binary viewer
- **File Info Display**: Shows file name and size
- **Extension Host Communication**: Bidirectional message passing between webview and extension

## Architecture

```
pptx-editor/
├── src/
│   ├── extension.ts         # Extension entry point
│   └── pptxEditorProvider.ts # CustomEditorProvider implementation
├── media/
│   ├── main.css             # Webview styles
│   └── main.js              # Webview script (message handling)
├── package.json             # Extension manifest
└── tsconfig.json            # TypeScript configuration
```

## Development

The extension is built as part of the VS Code watch process:

```bash
npm run watch
```

## Future Phases

- **Phase 3**: OnlyOffice Document Server integration for WYSIWYG editing
- **Phase 6**: AI Assistant integration for intelligent slide manipulation
