import { useCallback } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { cn } from '../utils/cn';
import { StatusBadge } from './StatusBadge';
import { formatSize, formatTime, getHostname, getMimeCategory, getEntrySize } from '../utils/format';
import type { HarEntry, SortKey, SortDir } from '../types/har';
import type { Issue, Severity } from '../utils/diagnostics';

interface Props {
  entries: HarEntry[];
  selected: HarEntry | null;
  onSelect: (e: HarEntry) => void;
  sortKey: SortKey;
  sortDir: SortDir;
  onSort: (key: SortKey) => void;
  issuesByEntry?: Map<HarEntry, Issue[]>;
}

interface Column {
  key: SortKey;
  label: string;
  width: string;
  align?: 'right';
}

const COLUMNS: Column[] = [
  { key: 'method', label: 'Method', width: 'w-14' },
  { key: 'status', label: 'Status', width: 'w-14' },
  { key: 'type', label: 'Type', width: 'w-14' },
  { key: 'url', label: 'URL', width: 'flex-1 min-w-0' },
  { key: 'size', label: 'Size', width: 'w-16', align: 'right' },
  { key: 'time', label: 'Time', width: 'w-16', align: 'right' },
];

const SEVERITY_ORDER: Record<Severity, number> = { critical: 0, warning: 1, info: 2 };

function highestSeverity(issues: Issue[]): Severity {
  return issues.reduce<Severity>(
    (best, i) => (SEVERITY_ORDER[i.severity] < SEVERITY_ORDER[best] ? i.severity : best),
    'info'
  );
}

function FlagDot({ issues }: { issues: Issue[] }) {
  if (issues.length === 0) return <span className="w-4 shrink-0" />;
  const sev = highestSeverity(issues);
  const title = [...new Set(issues.map((i) => i.detail))].join(' · ');
  return (
    <span
      className={cn(
        'w-4 shrink-0 flex items-center justify-center',
      )}
      title={title}
    >
      <span
        className={cn(
          'inline-block w-1.5 h-1.5 rounded-full',
          sev === 'critical' && 'bg-red-400',
          sev === 'warning' && 'bg-amber-400',
          sev === 'info' && 'bg-blue-400'
        )}
      />
    </span>
  );
}

function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: SortDir }) {
  if (col !== sortKey) return <ChevronsUpDown className="w-3 h-3 opacity-30" />;
  return sortDir === 'asc' ? (
    <ChevronUp className="w-3 h-3 text-primary" />
  ) : (
    <ChevronDown className="w-3 h-3 text-primary" />
  );
}

function methodColor(method: string): string {
  const colors: Record<string, string> = {
    GET: 'text-blue-400',
    POST: 'text-green-400',
    PUT: 'text-yellow-400',
    PATCH: 'text-orange-400',
    DELETE: 'text-red-400',
    OPTIONS: 'text-purple-400',
    HEAD: 'text-cyan-400',
  };
  return colors[method.toUpperCase()] ?? 'text-muted-foreground';
}

export function RequestsTable({ entries, selected, onSelect, sortKey, sortDir, onSort, issuesByEntry }: Props) {
  const hasFlags = issuesByEntry !== undefined;

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>, entry: HarEntry) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onSelect(entry);
      }
    },
    [onSelect]
  );

  if (entries.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
        No matching requests
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Header */}
      <div className="flex items-center px-3 py-1.5 border-b border-border bg-muted/30 text-xs text-muted-foreground select-none">
        {/* Flag column spacer */}
        {hasFlags && <span className="w-4 shrink-0" />}
        {COLUMNS.map((col) => (
          <button
            key={col.key}
            onClick={() => onSort(col.key)}
            className={cn(
              'flex items-center gap-1 hover:text-foreground transition-colors',
              col.width,
              col.align === 'right' && 'justify-end'
            )}
          >
            {col.label}
            <SortIcon col={col.key} sortKey={sortKey} sortDir={sortDir} />
          </button>
        ))}
      </div>

      {/* Rows */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {entries.map((entry, i) => {
          const isSelected = entry === selected;
          const size = getEntrySize(entry);
          const type = getMimeCategory(entry.response.content.mimeType);
          const host = getHostname(entry.request.url);
          const rowIssues = issuesByEntry?.get(entry) ?? [];
          let path: string;
          try {
            const u = new URL(entry.request.url);
            path = u.pathname + u.search;
          } catch {
            path = entry.request.url;
          }

          return (
            <div
              key={i}
              role="row"
              tabIndex={0}
              aria-selected={isSelected}
              onClick={() => onSelect(entry)}
              onKeyDown={(e) => handleKeyDown(e, entry)}
              className={cn(
                'flex items-center px-3 py-1.5 cursor-pointer text-xs border-b border-border/50 hover:bg-muted/40 transition-colors group',
                isSelected && 'bg-primary/10 border-l-2 border-l-primary'
              )}
            >
              {/* Flag dot */}
              {hasFlags && <FlagDot issues={rowIssues} />}

              {/* Method */}
              <div className={cn('w-14 font-mono font-semibold text-[11px] shrink-0', methodColor(entry.request.method))}>
                {entry.request.method.toUpperCase()}
              </div>

              {/* Status */}
              <div className="w-14 shrink-0">
                <StatusBadge status={entry.response.status} />
              </div>

              {/* Type */}
              <div className="w-14 shrink-0 text-muted-foreground font-mono text-[11px]">{type}</div>

              {/* URL */}
              <div className="flex-1 min-w-0 font-mono text-[11px]">
                <span className="text-muted-foreground">{host}</span>
                <span className="text-foreground/80 truncate block">{path}</span>
              </div>

              {/* Size */}
              <div className="w-16 text-right shrink-0 text-muted-foreground tabular-nums">
                {formatSize(size)}
              </div>

              {/* Time */}
              <div className="w-16 text-right shrink-0 text-muted-foreground tabular-nums">
                {formatTime(entry.time)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
