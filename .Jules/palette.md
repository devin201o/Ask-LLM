## 2025-03-01 - Password Visibility Toggle Accessibility
**Learning:** For interactive toggle buttons (e.g., password visibility), the `aria-label` must be dynamically updated to reflect the current state (e.g., switching from 'Show' to 'Hide') to ensure screen reader accessibility. Additionally, using inline SVGs for simple icons in the options page TS logic simplifies asset handling.
**Action:** Always dynamically update `aria-label` and `title` attributes on stateful UI toggles, and prefer inline SVGs over external image files for simple UI icons to avoid path resolution issues.
