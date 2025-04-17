# HAR Spyglass

HAR Spyglass is a browser extension that allows you to analyze HAR (HTTP Archive) files directly in your browser.

## Overview

HAR (HTTP Archive) files contain detailed information about web requests, including timing data, HTTP headers, cookies, and more. This extension provides a convenient way to view and analyze this data without leaving your browser.

## Features

- Analyze HAR files directly in your browser
- Simple popup interface for quick access
- Lightweight with minimal permissions required

## Manual Installation (Developer Mode)

1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" by toggling the switch in the top-right corner
4. Click "Load unpacked" and select the directory containing the extension files

## Usage

1. Click the HAR Spyglass icon in your browser toolbar
2. Upload your HAR file using the interface
3. View and analyze the detailed request data

## Technical Details

- Built with Manifest V3
- Uses browser storage API for data persistence
- Styled with Tailwind CSS
- Minimal permissions (only requires "storage")

## Privacy

HAR Spyglass processes all data locally in your browser. No data is sent to external servers.
