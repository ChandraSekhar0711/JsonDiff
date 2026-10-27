import React from 'react';
import { RefreshCw, Save, Check } from 'lucide-react';

export const SubHeader = ({
  activeBaselineRecord,
  handleLoadSample,
  setSaveBaselineModalOpen,
  handleUpdateActiveBaseline,
  activeTab,
}) => {
  return (
    <div className="border-b border-slate-800 bg-input/60 px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
      <div className="flex items-center gap-3">
        {activeBaselineRecord ? (
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-added" />
            <span className="text-secondary">
              Active Baseline: <strong className="text-primary font-mono">{activeBaselineRecord.name}</strong>
            </span>
            <span className="text-muted text-[11px]">
              (Saved {new Date(activeBaselineRecord.updatedAt).toLocaleTimeString()})
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-muted">
            <span className="w-2 h-2 rounded-full bg-modified" />
            <span>Unsaved ephemeral comparison baseline</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={handleLoadSample}
          className="px-2.5 py-1 rounded bg-hover hover:bg-border text-secondary text-xs transition-colors flex items-center gap-1.5"
        >
          <RefreshCw className="w-3 h-3" />
          Load Sample API Dataset
        </button>

        <button
          onClick={() => setSaveBaselineModalOpen(true)}
          className="px-2.5 py-1 rounded bg-accent/15 text-accent hover:bg-accent/25 text-xs font-medium transition-colors flex items-center gap-1.5"
        >
          <Save className="w-3 h-3" />
          Save Baseline
        </button>

        {activeBaselineRecord && (
          <button
            onClick={handleUpdateActiveBaseline}
            className="px-2.5 py-1 rounded bg-added/15 text-added border border-added/30 hover:bg-added/25 text-xs font-medium transition-colors flex items-center gap-1.5"
            title="Promote Latest response to be the new Baseline"
          >
            <Check className="w-3 h-3" />
            Update Baseline with Latest
          </button>
        )}
      </div>
    </div>
  );
};
