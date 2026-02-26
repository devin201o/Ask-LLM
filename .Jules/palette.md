## 2026-02-26 - Playwright Testing of Extension Pages
**Learning:** To verify extension pages (like `options.html`) with Playwright in a standalone environment (without loading the full extension), inject a mock `window.chrome` object using `page.add_init_script`. This mock should stub necessary APIs like `storage.local` and `runtime.sendMessage` to prevent runtime errors.
**Action:** Use `page.add_init_script` to inject mocks for verify scripts.
