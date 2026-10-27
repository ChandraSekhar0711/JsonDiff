import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Copy, AlertTriangle } from 'lucide-react';
import { CHANGE_TYPES } from '../../constants/sampleData';

// Accent per change type, expressed as a CSS variable so the stripe color
// follows the active theme (light vs dark) automatically.
const ACCENT = {
  [CHANGE_TYPES.TYPE_CHANGED]: 'var(--color-type-changed)',
  [CHANGE_TYPES.REMOVED]: 'var(--color-removed)',
  [CHANGE_TYPES.MODIFIED]: 'var(--color-modified)',
  [CHANGE_TYPES.ADDED]: 'var(--color-added)',
};

export const DiffTreeRow = ({ diff, onCopyToast }) => {
  const [expanded, setExpanded] = useState(true);
  const accent = ACCENT[diff.type] || 'var(--color-text-muted)';

  const getBadge = (type) => {
    switch (type) {
      case CHANGE_TYPES.TYPE_CHANGED:
        return 'bg-type-changed-bg text-type-changed';
      case CHANGE_TYPES.REMOVED:
        return 'bg-removed-bg text-removed';
      case CHANGE_TYPES.MODIFIED:
        return 'bg-modified-bg text-modified';
      case CHANGE_TYPES.ADDED:
        return 'bg-added-bg text-added';
      default:
        return 'bg-hover text-secondary';
    }
  };

  const handleCopyPath = () => {
    navigator.clipboard.writeText(diff.path);
    onCopyToast(`Copied path: ${diff.path}`, 'info');
  };

  return (
    <div
      className="rounded-2xl border border-slate-800 bg-panel overflow-hidden transition-colors hover:border-slate-700"
      style={{ borderLeftColor: accent, borderLeftWidth: '2px' }}
    >
      <div className="flex items-center justify-between gap-3 p-3">
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-muted hover:text-secondary transition-colors"
          >
            {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>

          <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${getBadge(diff.type)}`}>
            {diff.type.replace('_', ' ')}
          </span>

          <span className="font-semibold text-secondary truncate text-xs" title={diff.path}>
            {diff.path}
          </span>
        </div>

        <button
          onClick={handleCopyPath}
          className="text-muted hover:text-secondary p-1 rounded transition-colors flex items-center gap-1 text-[11px]"
          title="Copy path"
        >
          <Copy className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex flex-col gap-2 px-3 pb-3">
        {diff.isRisk && (
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-sans text-removed bg-removed-bg"
            style={{ borderLeft: `2px solid ${accent}` }}
          >
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
            <span>{diff.riskReason}</span>
          </div>
        )}

        {expanded && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {diff.type !== CHANGE_TYPES.ADDED && (
              <div
                className="flex items-stretch rounded-lg bg-removed-bg"
                style={{ borderLeft: `2px solid var(--color-removed)` }}
              >
                <div className="px-3 py-2 flex-1">
                  <span className="block text-[10px] font-sans font-bold uppercase text-removed mb-0.5">
                    Baseline Value ({diff.oldType})
                  </span>
                  <pre className="text-secondary whitespace-pre-wrap break-all text-[11px]">
                    {diff.oldValue === undefined ? 'undefined' : JSON.stringify(diff.oldValue, null, 2)}
                  </pre>
                </div>
              </div>
            )}

            {diff.type !== CHANGE_TYPES.REMOVED && (
              <div
                className="flex items-stretch rounded-lg bg-added-bg"
                style={{ borderLeft: `2px solid var(--color-added)` }}
              >
                <div className="px-3 py-2 flex-1">
                  <span className="block text-[10px] font-sans font-bold uppercase text-added mb-0.5">
                    Latest Value ({diff.newType})
                  </span>
                  <pre className="text-secondary whitespace-pre-wrap break-all text-[11px]">
                    {diff.newValue === undefined ? 'undefined' : JSON.stringify(diff.newValue, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};