---

# LICENSE.md

```markdown
MIT License

Copyright (c) 2026 ML Knowledge Explorer

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

---

## Third-Party Acknowledgements

This software makes use of the following third-party services and resources:

### Wikipedia REST API
- **URL:** https://en.wikipedia.org/api/rest_v1/
- **License:** Content available under CC BY-SA 4.0
- **Usage:** Used exclusively for checking and fetching newly documented
  Machine Learning type descriptions when the user manually triggers an
  online update check.

### Google Fonts — Inter
- **URL:** https://fonts.google.com/specimen/Inter
- **License:** SIL Open Font License 1.1
- **Usage:** Used as the primary UI typeface. Falls back to system
  sans-serif fonts when offline.

### Chrome Extensions API / Microsoft Edge Extensions API
- **URL:** https://developer.chrome.com/docs/extensions/
- **License:** BSD-style (Chromium open source project)
- **Usage:** Storage, tabs, and service worker APIs used throughout
  the extension.

---

## Data & Privacy

This extension:

- Does **NOT** collect any personal data
- Does **NOT** transmit any user data to external servers
- Does **NOT** use analytics, tracking, or telemetry of any kind
- Stores all user data (favorites, notes, theme preference, custom entries)
  **locally on your device** using chrome.storage.local
- Only makes outbound network requests to **Wikipedia** when the user
  explicitly clicks "Check Updates"

---

## Content License

The Machine Learning type definitions, use cases, and examples included
in this extension's knowledge base (js/data.js) are original educational
summaries written for this project, inspired by and consistent with
publicly available academic and encyclopedic sources.

If you redistribute this software, please retain this license file and
all copyright notices in their original form.

---

*ML Knowledge Explorer is an independent open-source project and is not
affiliated with, endorsed by, or sponsored by Microsoft, Google, or
Wikipedia.*