import { useCallback, useRef, useState } from 'react';
import { Upload, FileSearch } from 'lucide-react';
import { cn } from '../utils/cn';
import type { HarFile } from '../types/har';

interface Props {
  onLoad: (file: HarFile, fileName: string) => void;
  onError: (msg: string) => void;
}

export function UploadView({ onLoad, onError }: Props) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const parseFile = useCallback(
    (file: File) => {
      if (!file.name.endsWith('.har') && file.type !== 'application/json') {
        onError('Please select a valid .har file.');
        return;
      }
      if (file.size > 50 * 1024 * 1024) {
        onError('File is larger than 50 MB. Please use a smaller HAR file.');
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const parsed = JSON.parse(e.target?.result as string) as HarFile;
          if (!parsed?.log?.entries) throw new Error('Invalid HAR format');
          onLoad(parsed, file.name);
        } catch {
          onError('Failed to parse HAR file. Make sure it is a valid HAR archive.');
        }
      };
      reader.readAsText(file);
    },
    [onLoad, onError]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) parseFile(file);
    },
    [parseFile]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) parseFile(file);
      e.target.value = '';
    },
    [parseFile]
  );

  return (
    <div className="flex flex-col items-center justify-center h-full gap-8 p-8">
      <div className="flex flex-col items-center gap-3">
        <div className="p-4 rounded-2xl bg-primary/10">
          <FileSearch className="w-12 h-12 text-primary" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">HAR Spyglass</h1>
        <p className="text-sm text-muted-foreground text-center max-w-xs">
          Analyze HTTP Archive files directly in your browser. All data stays local.
        </p>
      </div>

      <div
        className={cn(
          'w-full max-w-md border-2 border-dashed rounded-xl p-12 flex flex-col items-center gap-4 cursor-pointer transition-colors',
          dragging
            ? 'border-primary bg-primary/5'
            : 'border-border hover:border-primary/50 hover:bg-muted/30'
        )}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <Upload className={cn('w-8 h-8 transition-colors', dragging ? 'text-primary' : 'text-muted-foreground')} />
        <div className="text-center">
          <p className="text-sm font-medium">Drop your HAR file here</p>
          <p className="text-xs text-muted-foreground mt-1">or click to browse</p>
        </div>
        <span className="text-xs text-muted-foreground px-3 py-1 rounded-full border border-border">
          .har files up to 50 MB
        </span>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".har,application/json"
        className="hidden"
        onChange={handleChange}
      />
    </div>
  );
}
