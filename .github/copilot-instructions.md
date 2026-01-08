# AI Coding Instructions for C4 Modelizer

## Architecture Overview

**C4 Modelizer** is a React/TypeScript web app for designing C4 architecture diagrams. The app uses a **flat data model** (not nested hierarchies) and organizes code into clear functional layers:

- **SDK Core** (`@archivisio/c4-modelizer-sdk`): Provides all hooks (`useFlatC4Store`, `useFlatNavigation`, `useFlatNodes`, `useFlatEdges`, `useFlatActiveElements`) and type definitions (`FlatC4Model`, `SystemBlock`, `ContainerBlock`, `ComponentBlock`, `CodeBlock`)
- **Canvas Layer** (`FlowCanvas`, node/edge components): React Flow based visual editor with selection/pan modes
- **Dialog/Form Layer** (edit dialogs, connection dialogs): Modal-based node & connection editing using `DialogContext`
- **Navigation Layer** (`NavBar`, breadcrumb): Implements C4 levels (System → Container → Component → Code) with URL-based state

## Key Data Flow Patterns

### State Management (Zustand via SDK)
```typescript
// Access via useFlatC4Store hook - used everywhere
const { model, setModel } = useFlatC4Store();
const { systems, containers, components, codeElements, viewLevel, activeSystemId } = model;
const { removeSystem, resetStore } = useFlatC4Store(); // actions
```

### Dialog Context Pattern
Local dialog state lives in [DialogContext.tsx](src/contexts/DialogContext.tsx) and [DialogProvider.tsx](src/contexts/DialogProvider.tsx):
- Used to track which node/connection is being edited
- Passed via context to avoid prop drilling through `FlowCanvas`
- Edit dialogs read from context: `const { editingElement, closeEditDialog } = useDialogs();`

### Navigation (URL-driven)
[NavBar.tsx](src/components/NavBar.tsx) uses `useFlatNavigation()` to change views. Views are:
- `system` (top level)
- `container` (under a system)
- `component` (under a system + container)
- `code` (under a system + container + component)

Double-clicking a node in [FlowCanvas.tsx](src/components/FlowCanvas.tsx#L128) navigates down one level; breadcrumb or back button navigates up.

## Component Structure

### Node Types (4 React Flow node components)
- [SystemBlock](src/components/system/SystemBlock.tsx)
- [ContainerBlock](src/components/container/ContainerBlock.tsx)
- [ComponentBlock](src/components/component/ComponentBlock.tsx)
- [CodeBlock](src/components/code/CodeBlock.tsx)

All wrap [C4Block](src/components/common/C4Block.tsx) (reusable styled box).

### Edit Dialogs
Each node type has a paired edit dialog:
- [SystemEditDialog](src/components/system/SystemEditDialog.tsx)
- [ContainerEditDialog](src/components/container/ContainerEditDialog.tsx)
- [ComponentEditDialog](src/components/component/ComponentEditDialog.tsx)
- [CodeEditDialog](src/components/code/CodeEditDialog.tsx)

All extend [BaseEditDialog](src/components/common/BaseEditDialog.tsx).

## Plugin System

[Plugin Architecture](docs/PLUGINS.md): Custom plugins can register UI components via a registry. Used for:
- Toolbar extensions (`toolbar:actions-before/after`)
- Navbar extensions (`navbar:before/after`)
- Root provider slots (`root:provider`)

Load via [manager.ts](src/plugins/manager.ts), defaults to `['@archivisio/default', '@archivisio/simon-brown-credit']`. Plugins access the core store via `registry.getMethod('useStore')()`.

## Alias Paths (all paths use `@` shortcuts)
```typescript
@components, @contexts, @data, @hooks, @icons, @locales, @plugins, @slots, @theme, @utils
```

## Styling & Theme

- **Framework**: Material-UI v7 + styled-components (`@emotion/styled`)
- **Dark theme**: Defined in [theme.ts](src/theme/theme.ts)
- **C4 color mapping**: `theme.c4Colors[viewLevel]` for level-specific colors
- **Styled components**: Use `styled()` from `@mui/system`; leverage MUI `useTheme()` hook for theme access

## Build & Development Commands

```bash
npm run dev          # Start dev server (Vite, port 5173)
npm run build        # TypeScript build + Vite bundle
npm run lint         # ESLint check
npm type-check       # TypeScript type check
npm run test         # Cypress e2e tests (starts dev server)
npm run test:node    # Jest unit tests
npm run test:ci      # Cypress CI mode
```

## Testing Patterns

### Unit Tests (Jest + TypeScript)
- Location: `src/**/__tests__/*.test.ts(x)`
- Config: [jest.config.js](jest.config.js)
- Mock pattern: `jest.mock('@archivisio/c4-modelizer-sdk')` for SDK hooks
- Setup: [setupTests.ts](src/setupTests.ts)

### E2E Tests (Cypress)
- Location: [cypress/e2e/](cypress/e2e/)
- Fixtures: [cypress/fixtures/](cypress/fixtures/) — sample JSON models (schema version 2)
- Commands: [cypress/support/commands.ts](cypress/support/commands.ts) — `cy.addNode()`, `cy.editNodeProperty()`, etc.
- Example: [navigation.cy.ts](cypress/e2e/navigation.cy.ts) tests breadcrumb drill-down behavior

## Import/Export (JSON Serialization)

- Model schema versioned via `CURRENT_SCHEMA_VERSION` ([jsonIO.ts](src/utils/jsonIO.ts#L3))
- Flat model structure: separate arrays `systems`, `containers`, `components`, `codeElements`
- Import/export handlers in [useFileOperations](src/hooks/useFileOperations.ts)
- Migration: `convertToFlatModel()` transforms nested C4Model to flat structure

## i18n (Internationalization)

- Framework: i18next
- Setup: [i18n.ts](src/i18n.ts) initializes with English only (`en/translation.json`)
- Usage: `const { t } = useTranslation();` then `t('key')`
- Custom format: `t('key', { interpolate: { name: value } })`; supports `capitalize` formatter

## Development Conventions

- **TypeScript**: Always typed; use `type` for type aliases, `interface` for contracts
- **React**: Functional components with hooks; memoize expensive node renders (`memo()`)
- **Naming**: Components in PascalCase files; files match component names
- **Props**: Define interfaces; avoid spreading unknown props
- **Errors**: Use `ErrorNotification` component for user feedback
- **URL state**: Leverage navigation hooks; avoid direct URL manipulation

## Common Implementation Tasks

**Adding a new C4 element level**: Create new node component in `components/<level>/`, paired edit dialog, wire in [App.tsx](src/App.tsx#L74) node/edge arrays, update [FlowCanvas nodeTypes](src/components/FlowCanvas.tsx#L83).

**Extending toolbar/navbar**: Use plugin system slots (`toolbar:actions-before`, `navbar:after`) via [ToolbarSlot](src/slots/ToolbarSlot.tsx), [NavBarSlot](src/slots/NavBarSlot.tsx).

**Modifying the data model**: Changes to `FlatC4Model` type require SDK update + schema version bump in [jsonIO.ts](src/utils/jsonIO.ts).

## Key Files to Review

- [src/App.tsx](src/App.tsx): Main wiring, hooks composition
- [src/contexts/DialogProvider.tsx](src/contexts/DialogProvider.tsx): Dialog state management
- [src/components/FlowCanvas.tsx](src/components/FlowCanvas.tsx): Canvas engine
- [src/plugins/manager.ts](src/plugins/manager.ts): Plugin lifecycle
- [docs/PLUGINS.md](docs/PLUGINS.md): Plugin extension guide
