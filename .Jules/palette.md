## 2024-05-23 - Password Visibility Toggle
**Learning:** Testing UI logic in top-level scripts (like `options.ts`) requires careful DOM mocking and module resetting. Using `JSDOM` to manually construct the expected DOM structure is cleaner than reading files when file I/O types are missing.
**Action:** When adding interactive UI elements to extension pages, prefer manually mocking the required DOM elements in tests to avoid dependency on file system reads and types.

## 2024-05-23 - Inline SVGs for UI Controls
**Learning:** For simple UI controls like "show/hide password", inline SVGs are more maintainable than external assets as they don't require build configuration changes or asset copying.
**Action:** Use inline SVGs for small, interactive icons within the code to keep components self-contained.
