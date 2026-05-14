import { useState } from 'react';
import { X, Copy, Check } from 'lucide-react';
import { cn } from '../utils/cn';
import { StatusBadge } from './StatusBadge';
import { formatSize, formatTime, formatTimingLabel, timingColor } from '../utils/format';
import type { HarEntry, HarNameValue, HarTimings } from '../types/har';

interface Props {
  entry: HarEntry;
  onClose: () => void;
}

type Tab = 'general' | 'headers' | 'params' | 'response' | 'timings' | 'cookies';

const TABS: { id: Tab; label: string }[] = [
  { id: 'general', label: 'General' },
  { id: 'headers', label: 'Headers' },
  { id: 'params', label: 'Params' },
  { id: 'response', label: 'Response' },
  { id: 'timings', label: 'Timings' },
  { id: 'cookies', label: 'Cookies' },
];

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };
  return (
    <button onClick={copy} className="ml-1 text-muted-foreground hover:text-foreground transition-colors">
      {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
    </button>
  );
}

function KVTable({ rows, emptyMsg = 'None' }: { rows: HarNameValue[]; emptyMsg?: string }) {
  if (rows.length === 0) return <p className="text-xs text-muted-foreground px-3 py-2">{emptyMsg}</p>;
  return (
    <div className="divide-y divide-border/50">
      {rows.map((r, i) => (
        <div key={i} className="flex px-3 py-1.5 hover:bg-muted/20 group">
          <span className="w-2/5 text-xs text-muted-foreground font-mono shrink-0 truncate">{r.name}</span>
          <span className="flex-1 text-xs font-mono text-foreground/90 break-all min-w-0">
            {r.value}
            <CopyButton text={r.value} />
          </span>
        </div>
      ))}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground bg-muted/20 border-y border-border/50">
        {title}
      </div>
      {children}
    </div>
  );
}

function GeneralTab({ entry }: { entry: HarEntry }) {
  const rows: HarNameValue[] = [
    { name: 'URL', value: entry.request.url },
    { name: 'Method', value: entry.request.method },
    { name: 'Status', value: `${entry.response.status} ${entry.response.statusText}` },
    { name: 'Protocol', value: entry.request.httpVersion },
    { name: 'Time', value: formatTime(entry.time) },
    { name: 'Response Size', value: formatSize(Math.max(0, entry.response.bodySize)) },
    ...(entry.serverIPAddress ? [{ name: 'Remote Address', value: `${entry.serverIPAddress}${entry.connection ? `:${entry.connection}` : ''}` }] : []),
    { name: 'Started', value: new Date(entry.startedDateTime).toLocaleTimeString() },
  ];
  return <KVTable rows={rows} />;
}

function HeadersTab({ entry }: { entry: HarEntry }) {
  return (
    <>
      <Section title="Request Headers">
        <KVTable rows={entry.request.headers} emptyMsg="No request headers" />
      </Section>
      <Section title="Response Headers">
        <KVTable rows={entry.response.headers} emptyMsg="No response headers" />
      </Section>
    </>
  );
}

function ParamsTab({ entry }: { entry: HarEntry }) {
  return (
    <>
      <Section title="Query String">
        <KVTable rows={entry.request.queryString} emptyMsg="No query parameters" />
      </Section>
      {entry.request.postData && (
        <Section title="Request Body">
          <div className="px-3 py-1.5">
            <div className="text-xs text-muted-foreground mb-1">
              Content-Type: <span className="font-mono">{entry.request.postData.mimeType}</span>
            </div>
            {entry.request.postData.params && entry.request.postData.params.length > 0 ? (
              <KVTable rows={entry.request.postData.params} />
            ) : entry.request.postData.text ? (
              <pre className="text-xs font-mono bg-muted/30 rounded p-2 overflow-x-auto max-h-40 scrollbar-thin">
                {entry.request.postData.text}
              </pre>
            ) : null}
          </div>
        </Section>
      )}
    </>
  );
}

function ResponseTab({ entry }: { entry: HarEntry }) {
  const content = entry.response.content;
  let text = content.text ?? '';

  if (text && content.encoding === 'base64') {
    try {
      text = atob(text);
    } catch {
      // keep as-is
    }
  }

  let formatted = text;
  if (content.mimeType.includes('json') && text) {
    try {
      formatted = JSON.stringify(JSON.parse(text), null, 2);
    } catch {
      // keep raw
    }
  }

  return (
    <div className="px-3 py-2">
      <div className="text-xs text-muted-foreground mb-2">
        <span className="font-mono">{content.mimeType}</span>
        {content.size > 0 && <span className="ml-2">({formatSize(content.size)})</span>}
      </div>
      {formatted ? (
        <pre className="text-xs font-mono bg-muted/30 rounded p-2 overflow-auto max-h-[300px] scrollbar-thin whitespace-pre-wrap break-words">
          {formatted}
        </pre>
      ) : (
        <p className="text-xs text-muted-foreground">No response body</p>
      )}
    </div>
  );
}

const TIMING_KEYS: (keyof HarTimings)[] = ['blocked', 'dns', 'connect', 'ssl', 'send', 'wait', 'receive'];

function TimingsTab({ entry }: { entry: HarEntry }) {
  const timings = entry.timings;
  const total = entry.time;

  const rows = TIMING_KEYS.map((k) => {
    const val = timings[k] ?? -1;
    return { key: k, val };
  }).filter((r) => r.val >= 0);

  return (
    <div className="px-3 py-2 space-y-2">
      <div className="text-xs text-muted-foreground mb-3">
        Total: <span className="text-foreground font-semibold">{formatTime(total)}</span>
      </div>
      {rows.map(({ key, val }) => {
        const pct = total > 0 ? (val / total) * 100 : 0;
        const color = timingColor(key as string);
        return (
          <div key={key} className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">{formatTimingLabel(key as string)}</span>
              <span className="font-mono tabular-nums">{formatTime(val)}</span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${Math.min(100, pct)}%`, backgroundColor: color }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function CookiesTab({ entry }: { entry: HarEntry }) {
  return (
    <>
      <Section title="Request Cookies">
        <KVTable
          rows={entry.request.cookies.map((c) => ({ name: c.name, value: c.value }))}
          emptyMsg="No request cookies"
        />
      </Section>
      <Section title="Response Cookies">
        <KVTable
          rows={entry.response.cookies.map((c) => ({ name: c.name, value: c.value }))}
          emptyMsg="No response cookies"
        />
      </Section>
    </>
  );
}

export function RequestDetail({ entry, onClose }: Props) {
  const [tab, setTab] = useState<Tab>('general');

  return (
    <div className="flex flex-col border-l border-border bg-background h-full w-[300px] shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <div className="flex items-center gap-2 min-w-0">
          <StatusBadge status={entry.response.status} />
          <span className="text-xs font-mono text-muted-foreground truncate">{entry.request.method}</span>
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors ml-2 shrink-0">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* URL */}
      <div className="px-3 py-1.5 border-b border-border bg-muted/20">
        <p className="text-[11px] font-mono text-muted-foreground break-all leading-relaxed">
          {entry.request.url}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border overflow-x-auto scrollbar-thin shrink-0">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              'px-3 py-2 text-xs whitespace-nowrap transition-colors border-b-2',
              tab === t.id
                ? 'border-primary text-primary font-medium'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {tab === 'general' && <GeneralTab entry={entry} />}
        {tab === 'headers' && <HeadersTab entry={entry} />}
        {tab === 'params' && <ParamsTab entry={entry} />}
        {tab === 'response' && <ResponseTab entry={entry} />}
        {tab === 'timings' && <TimingsTab entry={entry} />}
        {tab === 'cookies' && <CookiesTab entry={entry} />}
      </div>
    </div>
  );
}
