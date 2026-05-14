import { useState } from 'react';
import { ArrowRight, CheckCircle } from 'lucide-react';
import { cn } from '../utils/cn';
import { StatusBadge } from './StatusBadge';
import { formatTime, formatSize, getHostname, getEntrySize } from '../utils/format';
import type { HarEntry } from '../types/har';
import type { IssueGroup } from '../utils/diagnostics';

// ─── Color helpers ────────────────────────────────────────────────────────────

/** Left-border + background accent derived from the entry's status and timing. */
function rowAccentClass(entry: HarEntry): string {
  const s = entry.response.status;
  if (s >= 500) return 'border-l-[3px] border-l-red-500 bg-red-500/20';
  if (s >= 400) return 'border-l-[3px] border-l-orange-400 bg-orange-500/15';
  if (entry.time >= 3000) return 'border-l-[3px] border-l-red-400 bg-red-500/12';
  if (entry.time >= 1500) return 'border-l-[3px] border-l-amber-400 bg-amber-500/12';
  return 'border-l-[3px] border-l-transparent';
}

/** Color for the time value based on thresholds. */
function timeColorClass(ms: number): string {
  if (ms >= 3000) return 'text-red-400 font-semibold';
  if (ms >= 1500) return 'text-amber-400 font-semibold';
  return 'text-muted-foreground';
}

// ─── Shared entry row ─────────────────────────────────────────────────────────

function EntryRow({
  entry,
  barPct,
  barColor,
  onSelect,
  selected,
}: {
  entry: HarEntry;
  barPct?: number;
  barColor?: string;
  onSelect: (e: HarEntry) => void;
  selected: boolean;
}) {
  const host = getHostname(entry.request.url);
  let path = '';
  try {
    const u = new URL(entry.request.url);
    path = u.pathname;
  } catch {
    path = entry.request.url;
  }

  return (
    <button
      onClick={() => onSelect(entry)}
      className={cn(
        'w-full flex items-center gap-2 px-4 py-2 text-left transition-colors border-b border-border/30 group',
        rowAccentClass(entry),
        selected ? 'bg-primary/10' : 'hover:brightness-110'
      )}
    >
      {/* Method */}
      <span className="text-[10px] font-mono font-bold text-muted-foreground w-8 shrink-0">
        {entry.request.method.substring(0, 4)}
      </span>

      {/* Status badge — tooltip built in */}
      <StatusBadge status={entry.response.status} />

      {/* URL */}
      <div className="flex-1 min-w-0">
        <span className="text-xs font-mono text-muted-foreground">{host}</span>
        <span className="text-xs font-mono text-foreground/70 truncate block">{path}</span>
      </div>

      {/* Relative time bar (slowest section) */}
      {barPct !== undefined && (
        <div className="w-16 shrink-0">
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{ width: `${barPct}%`, backgroundColor: barColor ?? '#22c55e' }}
            />
          </div>
        </div>
      )}

      {/* Time — color-coded by threshold */}
      <span className={cn('text-xs font-mono tabular-nums shrink-0 w-16 text-right', timeColorClass(entry.time))}>
        {formatTime(entry.time)}
      </span>

      <ArrowRight className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-60 transition-opacity shrink-0" />
    </button>
  );
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({
  title,
  count,
  countColor,
  children,
  empty,
}: {
  title: string;
  count?: number;
  countColor?: string;
  children: React.ReactNode;
  empty?: boolean;
}) {
  return (
    <div className="mb-1">
      <div className="flex items-center gap-2 px-4 py-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-foreground/60">{title}</span>
        <div className="flex-1 h-px bg-border/40" />
        {count !== undefined && count > 0 && (
          <span className={cn('text-xs font-mono font-semibold tabular-nums', countColor ?? 'text-muted-foreground')}>
            {count}
          </span>
        )}
      </div>
      {empty ? (
        <div className="px-4 py-2 text-xs text-muted-foreground italic">None found</div>
      ) : (
        children
      )}
    </div>
  );
}

// ─── Errors section ───────────────────────────────────────────────────────────

function ErrorsSection({
  entries,
  selected,
  onSelect,
}: {
  entries: HarEntry[];
  selected: HarEntry | null;
  onSelect: (e: HarEntry) => void;
}) {
  const [showAll, setShowAll] = useState(false);
  const errors = entries
    .filter((e) => e.response.status >= 400)
    .sort((a, b) => b.response.status - a.response.status);
  const visible = showAll ? errors : errors.slice(0, 5);
  const remaining = errors.length - 5;

  return (
    <Section title="Errors" count={errors.length} countColor="text-red-400" empty={errors.length === 0}>
      {visible.map((entry, i) => (
        <EntryRow key={i} entry={entry} onSelect={onSelect} selected={entry === selected} />
      ))}
      {!showAll && remaining > 0 && (
        <button
          onClick={() => setShowAll(true)}
          className="w-full px-4 py-2 text-xs text-muted-foreground hover:text-foreground text-left transition-colors border-b border-border/20"
        >
          + {remaining} more error{remaining !== 1 ? 's' : ''} →
        </button>
      )}
    </Section>
  );
}

// ─── Slowest section ──────────────────────────────────────────────────────────

function SlowestSection({
  entries,
  selected,
  onSelect,
}: {
  entries: HarEntry[];
  selected: HarEntry | null;
  onSelect: (e: HarEntry) => void;
}) {
  const [showAll, setShowAll] = useState(false);
  const sorted = [...entries].sort((a, b) => b.time - a.time);
  const top = showAll ? sorted.slice(0, 20) : sorted.slice(0, 5);
  const maxTime = sorted[0]?.time ?? 1;
  const remaining = Math.min(sorted.length - 5, 15);

  const barColor = (ms: number) =>
    ms >= 3000 ? '#f87171' : ms >= 1500 ? '#fbbf24' : '#4ade80';

  return (
    <Section title="Slowest Requests">
      {top.map((entry, i) => (
        <EntryRow
          key={i}
          entry={entry}
          onSelect={onSelect}
          selected={entry === selected}
          barPct={(entry.time / maxTime) * 100}
          barColor={barColor(entry.time)}
        />
      ))}
      {!showAll && remaining > 0 && (
        <button
          onClick={() => setShowAll(true)}
          className="w-full px-4 py-2 text-xs text-muted-foreground hover:text-foreground text-left transition-colors border-b border-border/20"
        >
          + {remaining} more →
        </button>
      )}
    </Section>
  );
}

// ─── Issues section ───────────────────────────────────────────────────────────

const EXCLUDED_FROM_ISSUES = ['http_error_5xx', 'http_error_4xx', 'slow_total'];

function IssuesSection({ groups }: { groups: IssueGroup[] }) {
  const filtered = groups.filter((g) => !EXCLUDED_FROM_ISSUES.includes(g.type));

  return (
    <Section title="Issues Found" count={filtered.length} empty={filtered.length === 0}>
      {filtered.map((group) => (
        <div key={group.type} className="flex items-start gap-3 px-4 py-2.5 border-b border-border/30">
          <span
            className={cn(
              'mt-0.5 w-2 h-2 rounded-full shrink-0',
              group.severity === 'critical' && 'bg-red-400',
              group.severity === 'warning' && 'bg-amber-400',
              group.severity === 'info' && 'bg-blue-400'
            )}
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2">
              <span className="text-xs font-medium">{group.label}</span>
              <span className="text-[11px] font-mono text-muted-foreground">{group.issues.length}×</span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed mt-0.5">{group.description}</p>
          </div>
          <span className="text-[10px] text-muted-foreground shrink-0 mt-0.5 font-mono">{group.threshold}</span>
        </div>
      ))}
    </Section>
  );
}

// ─── Quick stats strip ────────────────────────────────────────────────────────

function QuickStats({ entries }: { entries: HarEntry[] }) {
  const errors = entries.filter((e) => e.response.status >= 400).length;
  const totalSize = entries.reduce((s, e) => s + getEntrySize(e), 0);
  const times = entries.map((e) => e.time).sort((a, b) => a - b);
  const p95 = times[Math.floor(times.length * 0.95)] ?? 0;

  return (
    <div className="flex items-center gap-3 px-4 py-2 border-b border-border bg-muted/10 text-[11px]">
      <span className="text-muted-foreground">
        <span className="text-foreground font-medium">{entries.length}</span> requests
      </span>
      <span className="h-3 w-px bg-border" />
      {errors > 0 ? (
        <span className="text-red-400 font-semibold">{errors} error{errors !== 1 ? 's' : ''}</span>
      ) : (
        <span className="text-green-400">No errors</span>
      )}
      <span className="h-3 w-px bg-border" />
      <span className="text-muted-foreground">
        p95 <span className={cn('font-mono', p95 >= 3000 ? 'text-red-400 font-semibold' : p95 >= 1500 ? 'text-amber-400' : 'text-foreground')}>{formatTime(p95)}</span>
      </span>
      <span className="h-3 w-px bg-border" />
      <span className="text-muted-foreground">
        <span className="text-foreground font-mono">{formatSize(totalSize)}</span> transferred
      </span>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

interface Props {
  entries: HarEntry[];
  groups: IssueGroup[];
  selected: HarEntry | null;
  onSelect: (e: HarEntry) => void;
}

export function OverviewView({ entries, groups, selected, onSelect }: Props) {
  const hasErrors = entries.some((e) => e.response.status >= 400);
  const filteredGroups = groups.filter((g) => !EXCLUDED_FROM_ISSUES.includes(g.type));
  const allHealthy = !hasErrors && filteredGroups.length === 0;

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <QuickStats entries={entries} />
      <div className="flex-1 overflow-y-auto scrollbar-thin">

        {allHealthy && (
          <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
            <CheckCircle className="w-8 h-8 text-green-400" />
            <p className="text-sm font-medium">No errors or issues detected</p>
            <p className="text-xs text-muted-foreground">All requests completed successfully.</p>
          </div>
        )}

        {hasErrors && (
          <ErrorsSection entries={entries} selected={selected} onSelect={onSelect} />
        )}

        <SlowestSection entries={entries} selected={selected} onSelect={onSelect} />

        {filteredGroups.length > 0 && (
          <IssuesSection groups={filteredGroups} />
        )}

      </div>
    </div>
  );
}
