# Emoji Manager Browser Extension

A modern browser extension built with Vue 3, Vite, TailwindCSS, and Ant Design Vue for advanced emoji management with image scaling and cloud synchronization capabilities.

## Features

### Popup Window
- **Image Size Adjustment**: Scale images from 5% to 150% with real-time preview
- **Settings Navigation**: Quick access to the options page
- **Secondary Menu**: Configuration management options
- **Emoji Grid**: Browse and copy emojis organized by groups
- **Quick Copy**: Click any emoji to copy it to clipboard

### Options/Settings Page
- **Emoji Group Management**: Create, edit, and reorder emoji groups
- **Drag & Drop**: Reorder emojis within groups and between groups
- **Custom Emojis**: Add custom emojis with titles
- **Group Icons**: Customize group display icons
- **Responsive Layout**: Clean, modern interface with intuitive controls

### Configuration Management
- **Export/Import**: Save and restore emoji configurations as JSON files
- **Cloud Sync**: Synchronize configurations across devices (simulated)
- **Local Storage**: Persistent storage using Chrome extension APIs

## Technical Stack

- **Frontend**: Vue 3 with Composition API
- **Build Tool**: Vite 6 with modern JavaScript output
- **Styling**: TailwindCSS 3 + Ant Design Vue 4
- **State Management**: Pinia for reactive state management
- **Drag & Drop**: Vue.Draggable for intuitive reordering
- **Icons**: Ant Design Icons for consistent UI elements

## Project Structure

```
extension/
├── src/
│   ├── popup/           # Popup window components
│   ├── options/         # Settings page components
│   ├── stores/          # Pinia state management
│   ├── styles/          # TailwindCSS styles
│   └── components/      # Shared components
├── public/
│   ├── manifest.json    # Extension manifest
│   └── icons/           # Extension icons
└── dist/                # Built extension files
```

## Development

### Prerequisites
- Node.js 18+ 
- npm or pnpm

### Setup
```bash
cd extension
npm install
```

### Development
```bash
npm run dev
```

### Build
```bash
npm run build
```

### Install Extension
1. Build the extension: `npm run build`
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked" and select the `dist` folder

## Architecture

### State Management
The extension uses Pinia for centralized state management with the following key features:
- Reactive emoji groups and emojis
- Image scale preferences
- Configuration import/export
- Cloud sync simulation

### Browser Extension Integration
- Manifest V3 compliant
- Local storage for persistence
- Cross-tab synchronization
- Secure content security policy

### Build Optimization
- Code splitting for optimal loading
- Vendor chunk separation
- CSS extraction and minification
- Asset optimization

## Usage

1. **Popup Usage**:
   - Click the extension icon to open the popup
   - Adjust image scale using the slider
   - Browse emoji groups and click to copy
   - Use the menu button for configuration options

2. **Settings Management**:
   - Click the settings button to open the options page
   - Drag and drop to reorder groups and emojis
   - Add new groups and emojis
   - Export/import configurations

3. **Configuration Sync**:
   - Use the export feature to backup configurations
   - Import configurations to restore settings
   - Enable cloud sync for cross-device synchronization

## Browser Compatibility

- Chrome 88+
- Edge 88+
- Firefox 109+ (with minor modifications)

## License

MIT License - see LICENSE file for details.