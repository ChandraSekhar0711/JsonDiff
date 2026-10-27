# API Diff & Regression Checker

**API Diff & Regression Checker** is a lightweight, high-performance client-side web application built with React, Vite, and Tailwind CSS. It is designed for frontend developers, QA engineers, and API architects to instantly detect breaking API changes, schema drifts, type mismatches, and regressions between a known-good baseline response and a new deployment or test response.

---

## 🌟 Key Features

1. **Dual Comparison Modes**:
   - **Manual Compare**: Paste arbitrary JSON payloads into baseline and updated editors for instant side-by-side or tree-view comparison.
   - **Live API Tester**: Configure method (`GET`, `POST`, `PUT`, `DELETE`, etc.), endpoint URL, query parameters, custom headers, and request bodies to fetch live responses directly from your API.

2. **Smart Diff & Regression Engine (`diffEngine.js`)**:
   - Recursively walks JSON objects and arrays to detect four change types:
     - 🟢 **Added**: New properties or array elements.
     - 🔴 **Removed**: Missing properties or reduced array bounds (flagged as breaking risks).
     - 🟡 **Modified**: Primitive value changes (string, number, boolean).
     - 🟣 **Type Changed**: Dangerous type drifts (e.g., `string` to `number` or `object` to `null`), automatically flagged as breaking risks that could crash client applications.

3. **Ignore Rules Engine**:
   - Filter out volatile fields (such as timestamps, request IDs, UUIDs, or dynamic tokens) using exact paths (`$.updatedAt`) or wildcard/segment matching (`$[*].id`).
   - Automatically extracts all JSON keys from current payloads for one-click ignore toggling.

4. **Saved Baselines & Persistence**:
   - Save frequently tested API baselines into browser `localStorage`.
   - Easily load, switch, or update baselines with the latest responses.

5. **Data Privacy**:
   - 100% client-side execution. No API tokens, authorization headers, or response payloads ever leave your browser session.

---

## 🏗️ Architecture Overview

The application follows a clean, modular React component architecture structured for maintainability, clarity, and high performance:

```
JsonDiff/
├── index.html                  # HTML root entry with Tailwind styling
├── vite.config.js              # Vite bundler configuration with path aliases
├── package.json                # Dependencies and npm scripts
└── src/
    ├── main.jsx                # React app mount point
    ├── App.jsx                 # Core orchestrator state management & layout
    ├── index.css               # Tailwind CSS directives and custom color tokens
    ├── utils/
    │   └── diffEngine.js       # Core JSON comparison, type detection, & key extractor
    ├── constants/
    │   └── sampleData.js       # Default sample datasets and HTTP methods
    └── components/
        ├── api-tester/
        │   └── ApiTester.jsx   # Live API request builder (URL, method, headers, query params, body)
        ├── editors/
        │   └── JsonEditor.jsx  # Split-pane JSON editor with syntax validity checking
        ├── diff/
        │   └── DiffTreeRow.jsx # Render diff items with tree indentation, risk badges, & value inspection
        ├── rules/
        │   ├── IgnoreRules.jsx # Ignore rule management interface
        │   └── RuleInput.jsx   # Input for custom path / wildcard ignore rules
        ├── layout/
        │   ├── Header.jsx      # Top navigation bar and mode switcher
        │   ├── SubHeader.jsx   # Baseline status indicators and quick-action buttons
        │   └── Footer.jsx      # Privacy disclaimer and version info
        └── common/
            └── Toast.jsx       # Floating notification toast container
```

### Data Flow & Execution Pipeline

1. **Input Stage**:
   - User inputs or fetches JSON in **Manual Compare** or **API Tester** mode.
   - `safeParse` safely validates and parses JSON strings into JavaScript objects.

2. **Comparison Stage (`compareJson`)**:
   - Recursively traverses the baseline and updated objects starting from root `$` path.
   - Evaluates `ignoreRules` at each step; skips paths matching any ignore rule.
   - Compares exact types (`null`, `array`, `object`, `string`, `number`, `boolean`).
   - Generates difference objects containing path, change type (`added`, `removed`, `modified`, `type_changed`), old/new values, and risk metadata.

3. **Filtering & Rendering**:
   - Computed differences are filtered by type and search query.
   - Displayed either in tree view or side-by-side layout with copy and inspection tools.

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+ recommended)
- npm

### Installation & Development

1. Clone or navigate to the project directory:
   ```bash
   cd JsonDiff
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

4. Build for production:
   ```bash
   npm run build
   ```

---

## 🛠️ Tech Stack

- **React 18**: Component-based UI framework.
- **Vite**: Ultra-fast frontend build tool and dev server.
- **Tailwind CSS**: Utility-first CSS styling.
- **Lucide React**: Modern iconography.

---

