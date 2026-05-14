import { X } from 'lucide-react';
import { cn } from '../utils/cn';
import type { Filters, HarEntry } from '../types/har';
import { getMimeCategory } from '../utils/format';

interface Props {
  filters: Filters;
  onChange: (f: Filters) => void;
  entries: HarEntry[];
  totalVisible: number;
}

const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'];
const STATUS_GROUPS = ['2xx', '3xx', '4xx', '5xx'];

function Chip({
  label,
  active,
  color,
  onClick,
}: {
  label: string;
  active: boolean;
  color?: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-2 py-0.5 rounded text-xs font-medium border transition-colors',
        active
          ? 'border-primary bg-primary/20 text-primary'
          : 'border-border bg-transparent text-muted-foreground hover:border-primary/40 hover:text-foreground'
      )}
      style={active && color ? { borderColor: color, color, backgroundColor: `${color}22` } : undefined}
    >
      {label}
    </button>
  );
}

export function FilterBar({ filters, onChange, entries, totalVisible }: Props) {
  const availableMethods = [...new Set(entries.map((e) => e.request.method.toUpperCase()))].sort();
  const availableTypes = [...new Set(entries.map((e) => getMimeCategory(e.response.content.mimeType)))].sort();

  const toggle = (key: 'methods' | 'statuses' | 'types', value: string) => {
    const current = filters[key];
    const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
    onChange({ ...filters, [key]: next });
  };

  const hasActiveFilters =
    filters.methods.length > 0 ||
    filters.statuses.length > 0 ||
    filters.types.length > 0 ||
    filters.search !== '';

  const statusColor: Record<string, string> = {
    '2xx': '#22c55e',
    '3xx': '#3b82f6',
    '4xx': '#eab308',
    '5xx': '#ef4444',
  };

  return (
    <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-background flex-wrap min-h-[44px]">
      {/* Search */}
      <div className="relative flex-1 min-w-[160px] max-w-[220px]">
        <input
          type="text"
          placeholder="Filter by URL…"
          value={filters.search}
          onChange={(e) => onChange({ ...filters, search: e.target.value })}
          className="w-full h-7 text-xs bg-muted/50 border border-border rounded px-2 pr-6 focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground"
        />
        {filters.search && (
          <button
            onClick={() => onChange({ ...filters, search: '' })}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      <div className="h-4 w-px bg-border" />

      {/* Methods */}
      <div className="flex items-center gap-1">
        {availableMethods
          .filter((m) => METHODS.includes(m))
          .map((m) => (
            <Chip
              key={m}
              label={m}
              active={filters.methods.includes(m)}
              onClick={() => toggle('methods', m)}
            />
          ))}
      </div>

      <div className="h-4 w-px bg-border" />

      {/* Status groups */}
      <div className="flex items-center gap-1">
        {STATUS_GROUPS.map((s) => (
          <Chip
            key={s}
            label={s}
            active={filters.statuses.includes(s)}
            color={statusColor[s]}
            onClick={() => toggle('statuses', s)}
          />
        ))}
      </div>

      {availableTypes.length > 0 && (
        <>
          <div className="h-4 w-px bg-border" />
          {/* Type filters */}
          <div className="flex items-center gap-1">
            {availableTypes.map((t) => (
              <Chip
                key={t}
                label={t}
                active={filters.types.includes(t)}
                onClick={() => toggle('types', t)}
              />
            ))}
          </div>
        </>
      )}

      <div className="ml-auto flex items-center gap-2">
        {hasActiveFilters && (
          <button
            onClick={() => onChange({ search: '', methods: [], statuses: [], types: [] })}
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            <X className="w-3 h-3" /> Clear
          </button>
        )}
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {totalVisible} / {entries.length}
        </span>
      </div>
    </div>
  );
}
