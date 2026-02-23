## 2024-05-22 - Testing Options Pages with Playwright

**Learning:** When testing Chrome extension options pages with Playwright, serving the `dist` folder via `python3 -m http.server` and injecting a mock `window.chrome` object via `page.add_init_script` is a robust way to bypass the lack of extension APIs in a standard browser context. This allows verifying UI interactions that depend on storage or runtime messages without needing to load the full extension.

**Action:** Use this pattern for future UI verifications of extension pages.
