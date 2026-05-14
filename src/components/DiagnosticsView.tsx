import { useState } from 'react';
import { ChevronRight, ChevronDown, CheckCircle, ArrowUpRight } from 'lucide-react';
import { cn } from '../utils/cn';
import { StatusBadge } from './StatusBadge';
import { getHostname } from '../utils/format';
import type { IssueGroup, IssueType, Issue, Severity } from '../utils/diagnostics';
import type { HarEntry } from '../types/har';

interface Props {
  groups: IssueGroup[];
  issuesByEntry: Map<HarEntry, Issue[]>;
  onSelectEntry: (entry: HarEntry) => void;
}

// ─── Severity helpers ─────────────────────────────────────────────────────────

function severityDot(severity: Severity) {
  return (
    <span
      className={cn(
        'inline-block w-2 h-2 rounded-full shrink-0',
        severity === 'critical' && 'bg-red-400',
        severity === 'warning' && 'bg-amber-400',
        severity === 'info' && 'bg-blue-400'
      )}
    />
  );
}

function severityLabel(severity: Severity) {
  const map: Record<Severity, string> = {
    critical: 'CRITICAL',
    warning: 'WARNING',
    info: 'INFO',
  };
  return map[severity];
}

function severityHeadingColor(severity: Severity) {
  return severity === 'critical'
    ? 'text-red-400'
    : severity === 'warning'
    ? 'text-amber-400'
    : 'text-blue-400';
}

// ─── Affected entry row ───────────────────────────────────────────────────────

function AffectedEntry({ issue, onSelect }: { issue: Issue; onSelect: () => void }) {
  const { entry, detail } = issue;
  const host = getHostname(entry.request.url);
  let path: string;
  try {
    const u = new URL(entry.request.url);
    path = u.pathname;
  } catch {
    path = entry.request.url;
  }

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border/30 hover:bg-muted/30 group">
      {/* Method */}
      <span className="text-[10px] font-mono font-semibold text-muted-foreground w-8 shrink-0">
        {entry.request.method.substring(0, 4)}
      </span>
      {/* Status */}
      <StatusBadge status={entry.response.status} />
      {/* URL */}
      <div className="flex-1 min-w-0">
        <span className="text-[11px] font-mono text-muted-foreground">{host}</span>
        <span className="text-[11px] font-mono text-foreground/70 truncate block">{path}</span>
      </div>
      {/* Detail metric */}
      <span className="text-[11px] font-mono text-muted-foreground shrink-0 tabular-nums">
        {detail}
      </span>
      {/* View button */}
      <button
        onClick={onSelect}
        className="flex items-center gap-0.5 text-[10px] text-primary opacity-0 group-hover:opacity-100 transition-opacity shrink-0 hover:underline"
        title="View in Table"
      >
        View <ArrowUpRight className="w-3 h-3" />
      </button>
    </div>
  );
}

// ─── Issue group row ──────────────────────────────────────────────────────────

function IssueGroupRow({
  group,
  expanded,
  onToggle,
  onSelectEntry,
}: {
  group: IssueGroup;
  expanded: boolean;
  onToggle: () => void;
  onSelectEntry: (entry: HarEntry) => void;
}) {
  return (
    <div className="border-b border-border/50">
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted/30 transition-colors text-left"
      >
        {severityDot(group.severity)}
        <span className="text-xs font-medium flex-1">{group.label}</span>
        {/* Count badge */}
        <span
          className={cn(
            'text-[10px] font-mono px-1.5 py-0.5 rounded font-semibold',
            group.severity === 'critical' && 'bg-red-500/15 text-red-400',
            group.severity === 'warning' && 'bg-amber-500/15 text-amber-400',
            group.severity === 'info' && 'bg-blue-500/15 text-blue-400'
          )}
        >
          {group.issues.length}
        </span>
        {/* Threshold hint */}
        <span className="text-[10px] text-muted-foreground ml-1 shrink-0">{group.threshold}</span>
        {/* Chevron */}
        {expanded ? (
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        )}
      </button>

      {/* Description (always visible) */}
      <p className="px-3 pb-2 text-[11px] text-muted-foreground -mt-1 leading-relaxed">
        {group.description}
      </p>

      {/* Expanded: affected entries list */}
      {expanded && (
        <div className="border-t border-border/30 bg-muted/10">
          {group.issues.slice(0, 50).map((issue, i) => (
            <AffectedEntry
              key={i}
              issue={issue}
              onSelect={() => onSelectEntry(issue.entry)}
            />
          ))}
          {group.issues.length > 50 && (
            <p className="px-3 py-1.5 text-[11px] text-muted-foreground">
              … and {group.issues.length - 50} more
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Severity section divider ─────────────────────────────────────────────────

function SeverityDivider({ severity }: { severity: Severity }) {
  return (
    <div className="flex items-center gap-2 px-3 py-1 bg-muted/20 border-b border-border/50">
      <span className={cn('text-[10px] font-semibold tracking-widest uppercase', severityHeadingColor(severity))}>
        {severityLabel(severity)}
      </span>
      <div className="flex-1 h-px bg-border/40" />
    </div>
  );
}

// ─── Main view ────────────────────────────────────────────────────────────────

export function DiagnosticsView({ groups, onSelectEntry }: Props) {
  const [expandedType, setExpandedType] = useState<IssueType | null>(null);

  const toggle = (type: IssueType) =>
    setExpandedType((prev) => (prev === type ? null : type));

  if (groups.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center px-8">
        <CheckCircle className="w-10 h-10 text-green-400" />
        <p className="text-sm font-medium">No issues detected</p>
        <p className="text-xs text-muted-foreground">All requests look healthy based on the current thresholds.</p>
      </div>
    );
  }

  // Group by severity for section headers
  const severities: Severity[] = ['critical', 'warning', 'info'];

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin">
      {severities.map((sev) => {
        const sevGroups = groups.filter((g) => g.severity === sev);
        if (sevGroups.length === 0) return null;
        return (
          <div key={sev}>
            <SeverityDivider severity={sev} />
            {sevGroups.map((group) => (
              <IssueGroupRow
                key={group.type}
                group={group}
                expanded={expandedType === group.type}
                onToggle={() => toggle(group.type)}
                onSelectEntry={(entry) => {
                  onSelectEntry(entry);
                }}
              />
            ))}
          </div>
        );
      })}
    </div>
  );
}
