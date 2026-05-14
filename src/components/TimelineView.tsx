import { useState } from 'react';
import { cn } from '../utils/cn';
import { StatusBadge } from './StatusBadge';
import { formatTime, getHostname, timingColor } from '../utils/format';
import type { HarEntry, HarTimings } from '../types/har';

interface Props {
  entries: HarEntry[];
  selected: HarEntry | null;
  onSelect: (e: HarEntry) => void;
}

const TIMING_KEYS: (keyof HarTimings)[] = ['blocked', 'dns', 'connect', 'ssl', 'send', 'wait', 'receive'];

export function TimelineView({ entries, selected, onSelect }: Props) {
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);

  if (entries.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
        No matching requests
      </div>
    );
  }

  // Compute timeline bounds
  const starts = entries.map((e) => new Date(e.startedDateTime).getTime());
  const minStart = Math.min(...starts);
  const ends = entries.map((e, i) => starts[i] + e.time);
  const maxEnd = Math.max(...ends);
  const totalDuration = maxEnd - minStart || 1;

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Legend */}
      <div className="flex items-center gap-3 px-3 py-2 border-b border-border bg-muted/20 flex-wrap">
        {TIMING_KEYS.map((k) => (
          <button
            key={k as string}
            onMouseEnter={() => setHoveredKey(k as string)}
            onMouseLeave={() => setHoveredKey(null)}
            className={cn(
              'flex items-center gap-1.5 text-[10px] transition-opacity',
              hoveredKey && hoveredKey !== k ? 'opacity-30' : 'opacity-100'
            )}
          >
            <span
              className="w-2.5 h-2.5 rounded-sm shrink-0"
              style={{ backgroundColor: timingColor(k as string) }}
            />
            <span className="text-muted-foreground capitalize">{k as string}</span>
          </button>
        ))}
      </div>

      {/* Header row */}
      <div className="flex items-center px-3 py-1.5 border-b border-border bg-muted/30 text-[10px] text-muted-foreground select-none">
        <div className="w-12 shrink-0">Status</div>
        <div className="w-10 shrink-0">Method</div>
        <div className="w-[180px] shrink-0">Host</div>
        <div className="flex-1 min-w-0 relative">
          <div className="absolute inset-0 flex justify-between px-0">
            <span>0</span>
            <span>{formatTime(totalDuration / 2)}</span>
            <span>{formatTime(totalDuration)}</span>
          </div>
        </div>
        <div className="w-16 text-right shrink-0">Total</div>
      </div>

      {/* Rows */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {entries.map((entry, i) => {
          const isSelected = entry === selected;
          const entryStart = new Date(entry.startedDateTime).getTime() - minStart;
          const leftPct = (entryStart / totalDuration) * 100;
          const widthPct = (entry.time / totalDuration) * 100;

          // Build timing segments
          const timings = entry.timings;
          const segments: { key: string; pct: number }[] = [];
          let remaining = entry.time || 1;
          for (const k of TIMING_KEYS) {
            const val = (timings[k] ?? -1);
            if (val > 0) {
              segments.push({ key: k as string, pct: (val / remaining) * 100 });
              remaining -= val;
            }
          }

          const host = getHostname(entry.request.url);

          return (
            <div
              key={i}
              role="row"
              tabIndex={0}
              aria-selected={isSelected}
              onClick={() => onSelect(entry)}
              onKeyDown={(e) => { if (e.key === 'Enter') onSelect(entry); }}
              className={cn(
                'flex items-center px-3 py-1 cursor-pointer text-[11px] border-b border-border/40 hover:bg-muted/30 transition-colors',
                isSelected && 'bg-primary/10 border-l-2 border-l-primary'
              )}
            >
              {/* Status */}
              <div className="w-12 shrink-0">
                <StatusBadge status={entry.response.status} />
              </div>

              {/* Method */}
              <div className="w-10 shrink-0 font-mono font-semibold text-muted-foreground">
                {entry.request.method.substring(0, 4)}
              </div>

              {/* Host */}
              <div className="w-[180px] shrink-0 font-mono truncate text-muted-foreground">{host}</div>

              {/* Waterfall bar */}
              <div className="flex-1 min-w-0 relative h-4 mx-1">
                <div
                  className="absolute top-1/2 -translate-y-1/2 h-3 rounded overflow-hidden flex"
                  style={{ left: `${leftPct}%`, width: `${Math.max(widthPct, 0.5)}%` }}
                  title={formatTime(entry.time)}
                >
                  {segments.map(({ key, pct }) => (
                    <div
                      key={key}
                      className={cn('h-full transition-opacity', hoveredKey && hoveredKey !== key ? 'opacity-20' : 'opacity-100')}
                      style={{ width: `${pct}%`, backgroundColor: timingColor(key) }}
                    />
                  ))}
                  {segments.length === 0 && (
                    <div className="h-full w-full bg-primary/60" />
                  )}
                </div>
              </div>

              {/* Total time */}
              <div className="w-16 text-right shrink-0 text-muted-foreground tabular-nums font-mono">
                {formatTime(entry.time)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
