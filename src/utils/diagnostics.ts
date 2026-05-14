import type { HarEntry } from '../types/har';
import { getMimeCategory, getEntrySize } from './format';

// ─── Types ────────────────────────────────────────────────────────────────────

export type Severity = 'critical' | 'warning' | 'info';

export type IssueType =
  | 'http_error_5xx'
  | 'http_error_4xx'
  | 'slow_total'
  | 'slow_ttfb'
  | 'large_payload'
  | 'redirect_chain'
  | 'dns_slow'
  | 'ssl_slow'
  | 'no_cache'
  | 'duplicate_request';

export interface Issue {
  type: IssueType;
  severity: Severity;
  entry: HarEntry;
  detail: string;      // e.g. "TTFB 2,340 ms"
  metricValue: number; // raw number for sorting
}

export interface IssueGroup {
  type: IssueType;
  label: string;
  description: string;
  severity: Severity;
  issues: Issue[];
  threshold: string; // e.g. "> 1,000 ms"
}

export interface SummaryMetrics {
  totalRequests: number;
  errorCount: number;
  errorPct: number;
  avgTime: number;
  p95Time: number;
  totalTransferred: number;
  issueCount: number;
}

export interface DiagnosticsResult {
  groups: IssueGroup[];
  issuesByEntry: Map<HarEntry, Issue[]>;
  summary: SummaryMetrics;
}

// ─── Thresholds ───────────────────────────────────────────────────────────────

export const THRESHOLDS = {
  SLOW_TOTAL_CRITICAL_MS: 3000,
  SLOW_TOTAL_WARN_MS: 1500,
  SLOW_TTFB_CRITICAL_MS: 1000,
  SLOW_TTFB_WARN_MS: 500,
  LARGE_PAYLOAD_CRITICAL_BYTES: 1_000_000,
  LARGE_PAYLOAD_WARN_BYTES: 250_000,
  DNS_SLOW_MS: 200,
  SSL_SLOW_MS: 500,
} as const;

// ─── Group metadata ───────────────────────────────────────────────────────────

const GROUP_META: Record<IssueType, { label: string; description: string; threshold: string; severity: Severity }> = {
  http_error_5xx: {
    label: 'Server Errors (5xx)',
    description: 'Server returned a 5xx error — indicates a backend failure.',
    threshold: 'status ≥ 500',
    severity: 'critical',
  },
  http_error_4xx: {
    label: 'Client Errors (4xx)',
    description: 'Server returned a 4xx error — broken links, auth failures, or bad requests.',
    threshold: 'status 400–499',
    severity: 'warning',
  },
  slow_total: {
    label: 'Slow Requests',
    description: 'Total request duration exceeded threshold — may indicate network or server issues.',
    threshold: `> ${THRESHOLDS.SLOW_TOTAL_CRITICAL_MS.toLocaleString()} ms`,
    severity: 'critical',
  },
  slow_ttfb: {
    label: 'Slow Server Response (TTFB)',
    description: 'Time to First Byte exceeded threshold — server is slow to process the request.',
    threshold: `> ${THRESHOLDS.SLOW_TTFB_CRITICAL_MS.toLocaleString()} ms`,
    severity: 'critical',
  },
  large_payload: {
    label: 'Large Payloads',
    description: 'Response size exceeds threshold for a non-media resource — consider compression or code splitting.',
    threshold: `> ${(THRESHOLDS.LARGE_PAYLOAD_WARN_BYTES / 1024).toFixed(0)} KB`,
    severity: 'warning',
  },
  redirect_chain: {
    label: 'Redirects',
    description: 'Request resulted in a redirect — chains add extra round-trips.',
    threshold: '3xx redirect',
    severity: 'info',
  },
  dns_slow: {
    label: 'Slow DNS Lookup',
    description: 'DNS resolution time exceeded threshold — may indicate missing DNS pre-fetch or a slow resolver.',
    threshold: `> ${THRESHOLDS.DNS_SLOW_MS} ms`,
    severity: 'warning',
  },
  ssl_slow: {
    label: 'Slow TLS Handshake',
    description: 'SSL/TLS negotiation time exceeded threshold — may indicate connection reuse is not happening.',
    threshold: `> ${THRESHOLDS.SSL_SLOW_MS} ms`,
    severity: 'warning',
  },
  no_cache: {
    label: 'Uncached Static Assets',
    description: 'Static assets (JS, CSS, images, fonts) served without Cache-Control headers — browsers will re-fetch on every load.',
    threshold: 'no Cache-Control',
    severity: 'info',
  },
  duplicate_request: {
    label: 'Duplicate Requests',
    description: 'The same URL was requested more than once — may indicate missing caching or redundant fetches.',
    threshold: '2+ identical requests',
    severity: 'info',
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function hasCacheControl(entry: HarEntry): boolean {
  return entry.response.headers.some(
    (h) => h.name.toLowerCase() === 'cache-control'
  );
}

function formatMs(ms: number): string {
  return ms < 1000 ? `${Math.round(ms)} ms` : `${(ms / 1000).toFixed(2)} s`;
}

function formatBytes(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}

const SEVERITY_ORDER: Record<Severity, number> = { critical: 0, warning: 1, info: 2 };

function highestSeverity(issues: Issue[]): Severity {
  return issues.reduce<Severity>((best, i) =>
    SEVERITY_ORDER[i.severity] < SEVERITY_ORDER[best] ? i.severity : best,
    'info'
  );
}

// ─── Core computation ─────────────────────────────────────────────────────────

export function computeDiagnostics(entries: HarEntry[]): DiagnosticsResult {
  if (entries.length === 0) {
    return {
      groups: [],
      issuesByEntry: new Map(),
      summary: { totalRequests: 0, errorCount: 0, errorPct: 0, avgTime: 0, p95Time: 0, totalTransferred: 0, issueCount: 0 },
    };
  }

  // Accumulators for summary metrics
  let errorCount = 0;
  let totalTime = 0;
  let totalTransferred = 0;
  const times: number[] = [];

  // Issue collectors per type
  const collected: Record<IssueType, Issue[]> = {
    http_error_5xx: [],
    http_error_4xx: [],
    slow_total: [],
    slow_ttfb: [],
    large_payload: [],
    redirect_chain: [],
    dns_slow: [],
    ssl_slow: [],
    no_cache: [],
    duplicate_request: [],
  };

  // For duplicate detection: method+url → first seen entry
  const urlSeen = new Map<string, { entry: HarEntry; count: number }>();

  // Single pass over all entries
  for (const entry of entries) {
    const { request, response, timings, time } = entry;
    const status = response.status;

    totalTime += time;
    times.push(time);
    totalTransferred += getEntrySize(entry);

    if (status >= 400) errorCount++;

    // ── 5xx ──
    if (status >= 500) {
      collected.http_error_5xx.push({
        type: 'http_error_5xx',
        severity: 'critical',
        entry,
        detail: `${status} ${response.statusText}`,
        metricValue: status,
      });
    }

    // ── 4xx (excluding 304) ──
    if (status >= 400 && status < 500 && status !== 304) {
      collected.http_error_4xx.push({
        type: 'http_error_4xx',
        severity: 'warning',
        entry,
        detail: `${status} ${response.statusText}`,
        metricValue: status,
      });
    }

    // ── Slow total ──
    if (time > THRESHOLDS.SLOW_TOTAL_CRITICAL_MS) {
      collected.slow_total.push({
        type: 'slow_total',
        severity: 'critical',
        entry,
        detail: formatMs(time),
        metricValue: time,
      });
    } else if (time > THRESHOLDS.SLOW_TOTAL_WARN_MS) {
      collected.slow_total.push({
        type: 'slow_total',
        severity: 'warning',
        entry,
        detail: formatMs(time),
        metricValue: time,
      });
    }

    // ── Slow TTFB ──
    const ttfb = timings.wait ?? 0;
    if (ttfb > THRESHOLDS.SLOW_TTFB_CRITICAL_MS) {
      collected.slow_ttfb.push({
        type: 'slow_ttfb',
        severity: 'critical',
        entry,
        detail: `TTFB ${formatMs(ttfb)}`,
        metricValue: ttfb,
      });
    } else if (ttfb > THRESHOLDS.SLOW_TTFB_WARN_MS) {
      collected.slow_ttfb.push({
        type: 'slow_ttfb',
        severity: 'warning',
        entry,
        detail: `TTFB ${formatMs(ttfb)}`,
        metricValue: ttfb,
      });
    }

    // ── Large payload (non-media types only) ──
    const mimeCategory = getMimeCategory(response.content.mimeType);
    const TRACKABLE_TYPES = ['js', 'css', 'html', 'json', 'xml', 'other'];
    if (TRACKABLE_TYPES.includes(mimeCategory)) {
      const size = getEntrySize(entry);
      if (size > THRESHOLDS.LARGE_PAYLOAD_CRITICAL_BYTES) {
        collected.large_payload.push({
          type: 'large_payload',
          severity: 'critical',
          entry,
          detail: formatBytes(size),
          metricValue: size,
        });
      } else if (size > THRESHOLDS.LARGE_PAYLOAD_WARN_BYTES) {
        collected.large_payload.push({
          type: 'large_payload',
          severity: 'warning',
          entry,
          detail: formatBytes(size),
          metricValue: size,
        });
      }
    }

    // ── Redirects ──
    if (status >= 300 && status < 400 && response.redirectURL !== '') {
      collected.redirect_chain.push({
        type: 'redirect_chain',
        severity: 'info',
        entry,
        detail: `→ ${response.redirectURL.slice(0, 50)}`,
        metricValue: status,
      });
    }

    // ── Slow DNS ──
    const dns = timings.dns ?? -1;
    if (dns > THRESHOLDS.DNS_SLOW_MS) {
      collected.dns_slow.push({
        type: 'dns_slow',
        severity: 'warning',
        entry,
        detail: `DNS ${formatMs(dns)}`,
        metricValue: dns,
      });
    }

    // ── Slow SSL ──
    const ssl = timings.ssl ?? -1;
    if (ssl > THRESHOLDS.SSL_SLOW_MS) {
      collected.ssl_slow.push({
        type: 'ssl_slow',
        severity: 'warning',
        entry,
        detail: `TLS ${formatMs(ssl)}`,
        metricValue: ssl,
      });
    }

    // ── No cache (static assets) ──
    const CACHEABLE_TYPES = ['js', 'css', 'img', 'font'];
    if (CACHEABLE_TYPES.includes(mimeCategory) && !hasCacheControl(entry)) {
      collected.no_cache.push({
        type: 'no_cache',
        severity: 'info',
        entry,
        detail: `${mimeCategory} — no Cache-Control`,
        metricValue: 0,
      });
    }

    // ── Duplicate requests ──
    const urlKey = `${request.method.toUpperCase()}::${request.url}`;
    const seen = urlSeen.get(urlKey);
    if (seen) {
      seen.count++;
      // Flag this (2nd+) occurrence
      collected.duplicate_request.push({
        type: 'duplicate_request',
        severity: 'info',
        entry,
        detail: `${seen.count}× ${request.method.toUpperCase()}`,
        metricValue: seen.count,
      });
    } else {
      urlSeen.set(urlKey, { entry, count: 1 });
    }
  }

  // ── Build issuesByEntry map ───────────────────────────────────────────────
  const issuesByEntry = new Map<HarEntry, Issue[]>();
  for (const issues of Object.values(collected)) {
    for (const issue of issues) {
      const existing = issuesByEntry.get(issue.entry);
      if (existing) existing.push(issue);
      else issuesByEntry.set(issue.entry, [issue]);
    }
  }

  // ── Build groups (non-empty only) ────────────────────────────────────────
  const groups: IssueGroup[] = [];
  for (const [type, issues] of Object.entries(collected) as [IssueType, Issue[]][]) {
    if (issues.length === 0) continue;
    const meta = GROUP_META[type];
    // Sort issues within group: worst metric first
    issues.sort((a, b) => b.metricValue - a.metricValue);
    groups.push({
      type,
      label: meta.label,
      description: meta.description,
      severity: highestSeverity(issues),
      issues,
      threshold: meta.threshold,
    });
  }

  // Sort groups: critical first, then warning, then info; within severity by count desc
  groups.sort((a, b) => {
    const sd = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
    return sd !== 0 ? sd : b.issues.length - a.issues.length;
  });

  // ── Summary metrics ──────────────────────────────────────────────────────
  const sortedTimes = [...times].sort((a, b) => a - b);
  const p95Time = sortedTimes[Math.floor(sortedTimes.length * 0.95)] ?? 0;
  const issueCount = groups.reduce((s, g) => s + g.issues.length, 0);

  const summary: SummaryMetrics = {
    totalRequests: entries.length,
    errorCount,
    errorPct: (errorCount / entries.length) * 100,
    avgTime: totalTime / entries.length,
    p95Time,
    totalTransferred,
    issueCount,
  };

  return { groups, issuesByEntry, summary };
}
