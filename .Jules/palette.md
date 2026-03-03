## 2024-05-15 - Dynamic ARIA labels for toggles
**Learning:** For interactive toggle buttons (e.g., password visibility), the `aria-label` must be dynamically updated to reflect the current state (e.g., switching from 'Show' to 'Hide') to ensure screen reader accessibility. This pattern is specific to this app's components to ensure robust accessibility.
**Action:** When creating toggle buttons, use JavaScript to update the `aria-label` and `title` attributes whenever the state changes.
