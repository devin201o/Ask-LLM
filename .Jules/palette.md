## 2024-05-22 - Password Visibility Toggle
**Learning:** Options pages often have sensitive inputs (API keys) that default to `type="password"`. Users frequently need to verify these long strings. Implementing a reusable "show/hide" toggle pattern is a high-impact, low-effort UX win.
**Action:** Wrap password inputs in a relative container and add an absolute-positioned toggle button with an eye icon.

## 2024-05-22 - Icon-only Buttons Accessibility
**Learning:** Icon-only buttons (like "+" and "-") are a common accessibility trap. Without text content, they are often read as just "button" or the icon name by screen readers.
**Action:** Always verify `aria-label` is present on icon-only buttons to provide context (e.g., "Add new model" instead of just "+").
