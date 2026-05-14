import { useState, useEffect, useMemo, useCallback } from 'react';
import { FileSearch, Table2, Activity, Download, Trash2, Sun, Moon, ChevronLeft, ArrowRight } from 'lucide-react';

import { cn } from './utils/cn';
import { UploadView } from './components/UploadView';
import { OverviewView } from './components/OverviewView';
import { FilterBar } from './components/FilterBar';
import { RequestsTable } from './components/RequestsTable';
import { RequestDetail } from './components/RequestDetail';
import { TimelineView } from './components/TimelineView';
import { getMimeCategory, getEntrySize, getStatusCategory } from './utils/format';
import { saveHarData, loadHarData, clearHarData } from './utils/storage';
import { computeDiagnostics } from './utils/diagnostics';
import type { HarFile, HarEntry, Filters, SortKey, SortDir } from './types/har';

// 'overview' is the simplified default; 'table' and 'timeline' are the detailed views
type View = 'overview' | 'table' | 'timeline';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Toast({ message, onDone }: { message: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3000);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-secondary text-secondary-foreground text-xs px-4 py-2 rounded-lg shadow-lg border border-border z-50">
      {message}
    </div>
  );
}

function exportJSON(entries: HarEntry[], fileName: string) {
  const blob = new Blob([JSON.stringify({ log: { entries } }, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = fileName.replace('.har', '-filtered.har');
  a.click();
  URL.revokeObjectURL(a.href);
}

function exportCSV(entries: HarEntry[]) {
  const headers = ['Method', 'Status', 'Type', 'URL', 'Size (bytes)', 'Time (ms)', 'Domain'];
  const rows = entries.map((e) =>
    [
      e.request.method,
      e.response.status,
      getMimeCategory(e.response.content.mimeType),
      e.request.url,
      getEntrySize(e),
      Math.round(e.time),
      (() => { try { return new URL(e.request.url).hostname; } catch { return e.request.url; } })(),
    ]
      .map(String)
      .map((v) => `"${v.replace(/"/g, '""')}"`)
      .join(',')
  );
  const blob = new Blob([[headers.join(','), ...rows].join('\n')], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'har-export.csv';
  a.click();
  URL.revokeObjectURL(a.href);
}

function applyFilters(entries: HarEntry[], filters: Filters): HarEntry[] {
  return entries.filter((e) => {
    if (filters.search && !e.request.url.toLowerCase().includes(filters.search.toLowerCase())) return false;
    if (filters.methods.length > 0 && !filters.methods.includes(e.request.method.toUpperCase())) return false;
    if (filters.statuses.length > 0 && !filters.statuses.includes(getStatusCategory(e.response.status))) return false;
    if (filters.types.length > 0 && !filters.types.includes(getMimeCategory(e.response.content.mimeType))) return false;
    return true;
  });
}

function sortEntries(entries: HarEntry[], key: SortKey, dir: SortDir): HarEntry[] {
  return [...entries].sort((a, b) => {
    let av: string | number, bv: string | number;
    switch (key) {
      case 'method': av = a.request.method; bv = b.request.method; break;
      case 'status': av = a.response.status; bv = b.response.status; break;
      case 'type': av = getMimeCategory(a.response.content.mimeType); bv = getMimeCategory(b.response.content.mimeType); break;
      case 'url': av = a.request.url; bv = b.request.url; break;
      case 'size': av = getEntrySize(a); bv = getEntrySize(b); break;
      case 'time': av = a.time; bv = b.time; break;
      case 'domain':
        try { av = new URL(a.request.url).hostname; } catch { av = a.request.url; }
        try { bv = new URL(b.request.url).hostname; } catch { bv = b.request.url; }
        break;
      default: return 0;
    }
    return av < bv ? (dir === 'asc' ? -1 : 1) : av > bv ? (dir === 'asc' ? 1 : -1) : 0;
  });
}

// ─── App ─────────────────────────────────────────────────────────────────────

export default function App() {
  const [dark, setDark] = useState(true);
  const [entries, setEntries] = useState<HarEntry[]>([]);
  const [fileName, setFileName] = useState('');
  const [selected, setSelected] = useState<HarEntry | null>(null);
  const [view, setView] = useState<View>('overview');
  const [filters, setFilters] = useState<Filters>({ search: '', methods: [], statuses: [], types: [] });
  const [sortKey, setSortKey] = useState<SortKey>('time');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [toast, setToast] = useState<string | null>(null);
  const [exportOpen, setExportOpen] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
  }, [dark]);

  useEffect(() => {
    loadHarData().then((data) => {
      if (data) { setEntries(data.entries); setFileName(data.fileName); }
    });
  }, []);

  const diagnostics = useMemo(() => computeDiagnostics(entries), [entries]);
  const { groups, issuesByEntry } = diagnostics;

  const filteredEntries = useMemo(
    () => sortEntries(applyFilters(entries, filters), sortKey, sortDir),
    [entries, filters, sortKey, sortDir]
  );

  const handleLoad = useCallback((har: HarFile, name: string) => {
    const loaded = har.log.entries;
    setEntries(loaded);
    setFileName(name);
    setSelected(null);
    setFilters({ search: '', methods: [], statuses: [], types: [] });
    setView('overview');
    setToast(`Loaded ${loaded.length} requests`);
    saveHarData(loaded, name);
  }, []);

  const handleSort = useCallback((key: SortKey) => {
    setSortKey((prev) => {
      if (prev === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
      else setSortDir('asc');
      return key;
    });
  }, []);

  const handleClear = useCallback(() => {
    setEntries([]); setFileName(''); setSelected(null);
    clearHarData(); setToast('HAR data cleared');
  }, []);

  const isDetailView = view === 'table' || view === 'timeline';

  if (entries.length === 0) {
    return (
      <div className="flex flex-col h-full">
        <UploadView onLoad={handleLoad} onError={(msg) => setToast(msg)} />
        {toast && <Toast message={toast} onDone={() => setToast(null)} />}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 px-3 h-10 border-b border-border bg-background shrink-0">

        {isDetailView ? (
          /* Detail mode header */
          <>
            <button
              onClick={() => { setView('overview'); setSelected(null); }}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Overview
            </button>

            <span className="text-border">|</span>
            <span className="text-xs text-muted-foreground truncate max-w-[180px]" title={fileName}>{fileName}</span>

            <div className="flex-1" />

            {/* Table / Timeline toggle */}
            <div className="flex rounded border border-border overflow-hidden">
              <button
                onClick={() => setView('table')}
                className={cn(
                  'px-2 py-1 flex items-center gap-1 text-xs transition-colors',
                  view === 'table' ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Table2 className="w-3 h-3" /> Table
              </button>
              <button
                onClick={() => setView('timeline')}
                className={cn(
                  'px-2 py-1 flex items-center gap-1 text-xs transition-colors border-l border-border',
                  view === 'timeline' ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Activity className="w-3 h-3" /> Timeline
              </button>
            </div>

            {/* Export */}
            <div className="relative">
              <button
                onClick={() => setExportOpen((o) => !o)}
                className="flex items-center gap-1 px-2 py-1 rounded border border-border text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <Download className="w-3 h-3" /> Export
              </button>
              {exportOpen && (
                <div className="absolute right-0 top-full mt-1 bg-background border border-border rounded-lg shadow-lg z-10 py-1 min-w-[130px]">
                  <button className="w-full text-left px-3 py-1.5 text-xs hover:bg-muted/50 transition-colors"
                    onClick={() => { exportJSON(filteredEntries, fileName); setExportOpen(false); setToast('Exported as HAR'); }}>
                    Export as HAR
                  </button>
                  <button className="w-full text-left px-3 py-1.5 text-xs hover:bg-muted/50 transition-colors"
                    onClick={() => { exportCSV(filteredEntries); setExportOpen(false); setToast('Exported as CSV'); }}>
                    Export as CSV
                  </button>
                </div>
              )}
            </div>
          </>
        ) : (
          /* Overview mode header */
          <>
            <FileSearch className="w-4 h-4 text-primary shrink-0" />
            <span className="text-sm font-semibold text-primary">HAR Spyglass</span>
            <span className="text-xs text-muted-foreground truncate max-w-[160px] ml-1" title={fileName}>{fileName}</span>

            <div className="flex-1" />

            <button
              onClick={() => setView('table')}
              className="flex items-center gap-1.5 px-3 py-1 text-xs rounded border border-primary/50 text-foreground font-medium hover:bg-primary/10 hover:border-primary transition-colors"
            >
              Inspect all {entries.length} requests <ArrowRight className="w-3 h-3" />
            </button>

            <button
              onClick={() => setDark((d) => !d)}
              className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors"
            >
              {dark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            </button>

            <button
              onClick={handleClear}
              className="p-1 rounded text-muted-foreground hover:text-destructive transition-colors"
              title="Clear and load a new file"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </>
        )}
      </div>

      {/* ── Filter Bar (detail view only) ────────────────────────────────── */}
      {isDetailView && (
        <FilterBar
          filters={filters}
          onChange={setFilters}
          entries={entries}
          totalVisible={filteredEntries.length}
        />
      )}

      {/* ── Content ──────────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {view === 'overview' && (
          <OverviewView
            entries={entries}
            groups={groups}
            selected={selected}
            onSelect={setSelected}
          />
        )}

        {view === 'table' && (
          <RequestsTable
            entries={filteredEntries}
            selected={selected}
            onSelect={setSelected}
            sortKey={sortKey}
            sortDir={sortDir}
            onSort={handleSort}
            issuesByEntry={issuesByEntry}
          />
        )}

        {view === 'timeline' && (
          <TimelineView
            entries={filteredEntries}
            selected={selected}
            onSelect={setSelected}
          />
        )}

        {/* Detail panel — visible in all views when something is selected */}
        {selected && (
          <RequestDetail entry={selected} onClose={() => setSelected(null)} />
        )}
      </div>

      {toast && <Toast message={toast} onDone={() => setToast(null)} />}

      {exportOpen && <div className="fixed inset-0 z-0" onClick={() => setExportOpen(false)} />}
    </div>
  );
}
