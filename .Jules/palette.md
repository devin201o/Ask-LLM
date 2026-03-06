
## 2025-03-05 - Password Visibility Toggle
**Learning:** For password fields, placing a toggle button over the input field can cause text overlap. The `aria-label` must dynamically update for screen readers when the toggle state changes.
**Action:** When creating password toggles, wrap the input in an `.input-wrapper`, give the input right padding (e.g. 40px) to make room for the absolutely positioned `.toggle-password-btn`, and ensure the TS logic updates the button's `aria-label` (e.g. "Show password" -> "Hide password").
