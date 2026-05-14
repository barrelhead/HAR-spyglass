import { useState } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../utils/cn';
import { getStatusCategory } from '../utils/format';
import { getHttpCodeInfo } from '../utils/httpCodes';

interface Props {
  status: number;
  className?: string;
}

interface TooltipPos {
  x: number;
  y: number;
}

export function StatusBadge({ status, className }: Props) {
  const cat = getStatusCategory(status);
  const info = getHttpCodeInfo(status);
  const [pos, setPos] = useState<TooltipPos | null>(null);

  const handleMouseEnter = (e: React.MouseEvent<HTMLSpanElement>) => {
    if (!info) return;
    const r = e.currentTarget.getBoundingClientRect();
    setPos({ x: r.left + r.width / 2, y: r.top });
  };

  return (
    <>
      <span
        onMouseEnter={handleMouseEnter}
        onMouseLeave={() => setPos(null)}
        className={cn(
          'inline-flex items-center justify-center font-mono text-xs font-semibold px-1.5 py-0.5 rounded',
          info && 'cursor-default',
          cat === '2xx' && 'bg-green-500/15 text-green-400',
          cat === '3xx' && 'bg-blue-500/15 text-blue-400',
          cat === '4xx' && 'bg-yellow-500/15 text-yellow-400',
          cat === '5xx' && 'bg-red-500/15 text-red-400',
          cat === 'other' && 'bg-muted text-muted-foreground',
          className
        )}
      >
        {status}
      </span>

      {pos && info && createPortal(
        <div
          className="fixed z-[9999] pointer-events-none"
          style={{
            left: pos.x,
            top: pos.y - 10,
            transform: 'translate(-50%, -100%)',
          }}
        >
          <div className="bg-background border border-border rounded-lg shadow-xl px-3 py-2.5 text-left w-52">
            <div className="flex items-center gap-2 mb-1">
              <span
                className={cn(
                  'text-xs font-mono font-bold',
                  cat === '2xx' && 'text-green-400',
                  cat === '3xx' && 'text-blue-400',
                  cat === '4xx' && 'text-yellow-400',
                  cat === '5xx' && 'text-red-400',
                )}
              >
                {status}
              </span>
              <span className="text-xs font-semibold text-foreground">{info.name}</span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">{info.description}</p>
          </div>
          {/* Arrow */}
          <div className="flex justify-center">
            <div className="w-2 h-2 bg-background border-b border-r border-border rotate-45 -mt-[5px]" />
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
