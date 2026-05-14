# HAR Spyglass

A Chrome extension for analyzing HAR (HTTP Archive) files directly in your browser. Built for technicians who need to quickly triage application errors, slow transactions, and network issues from captured traffic.

All data is processed locally — nothing is sent to external servers.

---

## Features

### Overview (default view)
When a HAR file is loaded, the extension opens to a focused summary designed for fast triage:

- **Errors** — all 4xx and 5xx responses listed prominently, color-coded by severity
- **Slowest Requests** — top requests by duration with a relative timing bar, color-coded by threshold (green / amber / red)
- **Issues Found** — automatically detected patterns such as slow TTFB, large payloads, missing cache headers, slow DNS/TLS, and duplicate requests

Each row is highlighted with a colored left accent based on its status:
- 🔴 Red — server errors (5xx) or requests exceeding 3 seconds
- 🟠 Orange — client errors (4xx)
- 🟡 Amber — requests between 1.5 and 3 seconds

Hovering over any HTTP status code shows a tooltip with its name and plain-English description.

### Detailed view
Click **Inspect all requests →** to open the full request log:

- **Table view** — all requests with sortable columns: method, status, type, URL, size, and time. Rows are flagged with colored dots for detected issues.
- **Timeline view** — waterfall chart showing each request's timing phases (DNS, TLS, TTFB, download) positioned relative to the overall session.
- **Filter bar** — filter by HTTP method, status category (2xx / 3xx / 4xx / 5xx), and MIME type; search by URL.
- **Request detail panel** — click any row to open a sidebar with six tabs: General, Headers, Params, Response body, Timings breakdown, and Cookies.

### Export
From the detailed view, export the current (filtered) request set as a `.har` file or `.csv`.

---

## Installation

### From source (developer mode)

1. Clone or download this repository
2. Install dependencies and build:
   ```bash
   npm install
   npm run build
   ```
3. Open Chrome and go to `chrome://extensions/`
4. Enable **Developer mode** (top-right toggle)
5. Click **Load unpacked** and select the `dist/` folder

To reload after making changes, run `npm run build` again and click the reload icon on the extension card in `chrome://extensions/`.

---

## Development

```bash
npm install       # install dependencies
npm run build     # production build → dist/
```

The `dist/` folder is the complete, loadable Chrome extension. Source lives in `src/`.

### Stack
- React 19 + TypeScript
- Vite 6
- Tailwind CSS v3
- Radix UI primitives
- Lucide icons
- Manifest V3 — requires only the `storage` permission

---

## Privacy

HAR files can contain sensitive data (auth tokens, cookies, request bodies). HAR Spyglass processes everything locally in the browser. No data is transmitted to any external server.
