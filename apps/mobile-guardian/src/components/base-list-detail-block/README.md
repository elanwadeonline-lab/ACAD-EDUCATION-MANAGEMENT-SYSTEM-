# Base List Detail Block

A searchable list and detail screen with configurable records, category filters, avatar and badge data, create/edit forms, delete and undo callbacks, copy, insets, and theme.

## How it works

1. Composes a large header, clearable search, category chips, a virtualized `FlatList` of Base rows with avatars/badges, loading skeletons, empty states, and inline failures.
2. Sections reveal over 300 ms from 6 pt, staggered by 30 ms. Rows cap their entrance delay at five stagger intervals so large collections remain responsive.
3. Detail and create/edit forms use a Base sheet. The host can control the panel as `null`, `{ kind: 'detail', id }`, `{ kind: 'create' }`, or `{ kind: 'edit', id }`.
4. Names must be nonempty. Local edits keep IDs and metadata; creates receive a unique local ID and the configured new-item category. No requests or persistent storage are performed.
5. Delete closes the sheet before presenting a destructive confirmation. After confirmation a Base toast offers Undo, restoring the removed item at its previous position while keeping later edits. A fresh collection reference prevents Undo from restoring an outdated list.

## Install

```bash
npx nativeanimation add base-list-detail-block
```

The CLI copies the exact family modules listed in `registryDependencies`, including their transitive dependencies. To copy by hand, copy those modules too and install their native packages with:

```bash
npx expo install react-native-gesture-handler react-native-reanimated react-native-worklets lucide-react-native react-native-svg
```

Mount `GestureHandlerRootView` at the app root. Load the Geist regular and medium fonts once, or supply your own font names through the theme. Free forever. MIT.

## Usage

```tsx
import { BaseListDetailBlock } from './base-list-detail-block';

<BaseListDetailBlock
  items={projects}
  onItemsChange={setProjects}
  onSelect={trackProjectOpen}
  onCreate={saveNewProject}
  onUpdate={saveProject}
  onDelete={removeProject}
  onUndo={restoreProject}
  insets={insets}
/>
```

Wrap your app in `BaseThemeProvider` from `base-theme` to choose light/dark and neutral, blue, green, or violet accents. A `theme` prop overrides the provider and is inherited by nested controls, sheets, and dialogs. Place the block inside a bounded container with `flex: 1`; screens scroll vertically when space is limited. Supply safe-area insets from the host.

Each `ListDetailItem` has `id`, `title`, `description`, `initials`, `category`, and optional `badge` and `avatar`. Search and filters are local presentation; record changes are emitted through callbacks. For async saves, control `panel`, pass `saving`/`saveError`, and close the panel after success. In controlled mode the host applies `onItemsChange`, including Undo. Backend rollback remains the host responsibility.

### Use with an agent

> Use Native Animation MCP to add base-list-detail-block with searchable projects, category chips, detail and edit sheets, and delete with Undo.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `copy` | `Partial<copy>` | `Northwind copy` | Every label, field placeholder, empty/error message, and accessible name. |
| `items / defaultItems` | `ListDetailItem[]` | `three sample projects` | Controlled or initial records; [] renders the empty state. |
| `onItemsChange` | `(items: ListDetailItem[]) => void` | `—` | Apply the next immutable collection when controlled. |
| `filters` | `BaseToggleItem[]` | `active / archived` | Caller-owned category chips; [] removes filters. |
| `query / onQueryChange` | `string / (query: string) => void` | `local empty query` | Optional controlled case-insensitive title/description search. |
| `selectedFilters / onFiltersChange` | `string[] / (filters: string[]) => void` | `local []` | Optional controlled categories; [] shows all. |
| `panel / onPanelChange` | `ListDetailPanel or null / callback` | `local null` | Controls detail, create, edit, and close requests. |
| `onSelect / onCreate / onUpdate / onDelete / onUndo` | `(item: ListDetailItem) => void` | `—` | Callbacks for every record action. |
| `onRetry` | `() => void` | `—` | Retry callback in the load error alert. |
| `saving / saveError` | `boolean / string` | `false / —` | Host-controlled editor state. |
| `newItemCategory` | `string` | `active` | Category assigned when creating a local record. |
| `icons` | `{ search?, empty?, create?: ReactNode }` | `—` | Caller-owned decorative slots. |
| `insets` | `{ top?: number; bottom?: number }` | `0 / 0` | Host safe-area insets; no internal SafeAreaView. |
| `theme` | `BaseTheme` | `nearest provider` | Full shared theme override inherited by every nested control. |
| `onBack / backLabel` | `() => void / string` | `— / Back` | Optional host back action and its accessible name. |
| `loading / error` | `boolean / string` | `false / —` | Host pending state and failure message. |
| `testID` | `string` | `piece ID` | Stable identifier on the screen primary action. |
| `style` | `StyleProp<ViewStyle>` | `flex: 1` | Container override. |

`copy` supports these keys: `title`, `subtitle`, `search`, `clearSearch`, `filters`, `create`, `edit`, `save`, `cancel`, `close`, `emptyTitle`, `emptyDescription`, `noResults`, `noResultsDescription`, `reset`, `loading`, `errorTitle`, `retry`, `name`, `namePlaceholder`, `description`, `descriptionPlaceholder`, `requiredName`, `delete`, `deleteTitle`, `deleteDescription`, `deleted`, `undo`, `back`, `dismissToast`, `expandToast`. Unspecified keys keep the generic English defaults. Icons and content remain caller-owned.

## Compatibility

Expo SDK 58 · React Native 0.88 · Reanimated 4.7 · react-native-worklets 0.13. Targets iOS, Android, and web, in Expo Go and development builds. Native bundle compilation does not replace device interaction testing. Part of **Native Animation Base**. Free forever. MIT. No router, network, or storage dependency.

### Go further

- [swipe-to-delete-row](https://nativeanimation.com/animations/swipe-to-delete-row) for gesture-driven deletion.
- [filter-chips-reflow](https://nativeanimation.com/animations/filter-chips-reflow) for animated filter rearrangement.

## Accessibility

Rows announce their title and description and retain Base press semantics. Search is named and clearable. Sheets expose modal content; the destructive dialog requires explicit confirmation. Toast Undo is separately accessible. Busy and error states have accessible labels. The editor scrolls and avoids the keyboard; sections skip displacement under Reduce Motion.
