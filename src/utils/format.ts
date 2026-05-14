export function formatSize(bytes: number): string {
  if (bytes < 0) return '—';
  if (bytes === 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatTime(ms: number): string {
  if (ms < 0) return '—';
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}

export function getHostname(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

export function getPathname(url: string): string {
  try {
    const u = new URL(url);
    return u.pathname + u.search;
  } catch {
    return url;
  }
}

export function getMimeCategory(mimeType: string): string {
  if (!mimeType) return 'other';
  if (mimeType.includes('javascript') || mimeType.includes('ecmascript')) return 'js';
  if (mimeType.includes('css')) return 'css';
  if (mimeType.includes('html')) return 'html';
  if (mimeType.includes('json')) return 'json';
  if (mimeType.includes('xml')) return 'xml';
  if (mimeType.includes('image/')) return 'img';
  if (mimeType.includes('font')) return 'font';
  if (mimeType.includes('wasm')) return 'wasm';
  if (mimeType.includes('video/') || mimeType.includes('audio/')) return 'media';
  return 'other';
}

export function getStatusCategory(status: number): '2xx' | '3xx' | '4xx' | '5xx' | 'other' {
  if (status >= 200 && status < 300) return '2xx';
  if (status >= 300 && status < 400) return '3xx';
  if (status >= 400 && status < 500) return '4xx';
  if (status >= 500) return '5xx';
  return 'other';
}

export function getEntrySize(entry: { response: { bodySize: number; headersSize: number } }): number {
  const body = entry.response.bodySize ?? 0;
  const headers = entry.response.headersSize ?? 0;
  return Math.max(0, body) + Math.max(0, headers);
}

export function truncateUrl(url: string, maxLen = 60): string {
  if (url.length <= maxLen) return url;
  return url.slice(0, maxLen - 3) + '…';
}

export function formatTimingLabel(key: string): string {
  const labels: Record<string, string> = {
    blocked: 'Blocked',
    dns: 'DNS Lookup',
    connect: 'Initial Connection',
    ssl: 'SSL',
    send: 'Request Sent',
    wait: 'Waiting (TTFB)',
    receive: 'Content Download',
  };
  return labels[key] ?? key;
}

export function timingColor(key: string): string {
  const colors: Record<string, string> = {
    blocked: '#9ca3af',
    dns: '#f59e0b',
    connect: '#f97316',
    ssl: '#a855f7',
    send: '#3b82f6',
    wait: '#22c55e',
    receive: '#06b6d4',
  };
  return colors[key] ?? '#6b7280';
}
