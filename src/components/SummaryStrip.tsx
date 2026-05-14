import { AlertTriangle, CheckCircle } from 'lucide-react';
import { cn } from '../utils/cn';
import { formatTime, formatSize } from '../utils/format';
import type { SummaryMetrics, IssueGroup } from '../utils/diagnostics';

interface Props {
  metrics: SummaryMetrics;
  issueGroups: IssueGroup[];
  onIssuesClick: () => void;
}

function Divider() {
  return <span className="h-3 w-px bg-border mx-0.5 shrink-0" />;
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <span className="flex items-center gap-1 px-1.5">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn('font-medium tabular-nums', color ?? 'text-foreground')}>{value}</span>
    </span>
  );
}

export function SummaryStrip({ metrics, issueGroups, onIssuesClick }: Props) {
  const { totalRequests, errorCount, errorPct, avgTime, p95Time, totalTransferred, issueCount } = metrics;

  // Error color
  const errorColor =
    errorCount === 0
      ? 'text-green-400'
      : errorPct >= 5
      ? 'text-red-400'
      : 'text-amber-400';

  // p95 color
  const p95Color =
    p95Time < 1000
      ? 'text-green-400'
      : p95Time < 3000
      ? 'text-amber-400'
      : 'text-red-400';

  // Issues button color
  const hasCritical = issueGroups.some((g) => g.severity === 'critical');
  const hasWarning = issueGroups.some((g) => g.severity === 'warning');
  const issuesBtnColor =
    issueCount === 0
      ? 'text-green-400 hover:text-green-300'
      : hasCritical
      ? 'text-red-400 hover:text-red-300'
      : hasWarning
      ? 'text-amber-400 hover:text-amber-300'
      : 'text-blue-400 hover:text-blue-300';

  return (
    <div className="flex items-center h-7 px-2 border-b border-border bg-muted/10 text-[11px] shrink-0 overflow-hidden">
      <Stat label="Requests" value={String(totalRequests)} />
      <Divider />
      <Stat
        label="Errors"
        value={errorCount === 0 ? '0' : `${errorCount} (${errorPct.toFixed(1)}%)`}
        color={errorColor}
      />
      <Divider />
      <Stat label="Avg" value={formatTime(avgTime)} />
      <Divider />
      <Stat label="p95" value={formatTime(p95Time)} color={p95Color} />
      <Divider />
      <Stat label="Transferred" value={formatSize(totalTransferred)} />

      <div className="flex-1" />

      {/* Issues pill — primary CTA */}
      <button
        onClick={onIssuesClick}
        className={cn(
          'flex items-center gap-1 px-2 py-0.5 rounded border transition-colors shrink-0',
          issueCount === 0
            ? 'border-green-500/30 bg-green-500/5 text-green-400 hover:bg-green-500/10'
            : hasCritical
            ? 'border-red-500/40 bg-red-500/10 text-red-400 hover:bg-red-500/15'
            : hasWarning
            ? 'border-amber-500/40 bg-amber-500/10 text-amber-400 hover:bg-amber-500/15'
            : 'border-blue-500/30 bg-blue-500/5 text-blue-400 hover:bg-blue-500/10',
          issuesBtnColor
        )}
        title="View all detected issues"
      >
        {issueCount === 0 ? (
          <CheckCircle className="w-3 h-3" />
        ) : (
          <AlertTriangle className="w-3 h-3" />
        )}
        <span className="font-medium">
          {issueCount === 0 ? 'No issues' : `${issueCount} issue${issueCount !== 1 ? 's' : ''}`}
        </span>
      </button>
    </div>
  );
}
