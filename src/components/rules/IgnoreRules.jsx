import React, { useState } from 'react';
import { ShieldAlert, X, ChevronDown, ChevronRight } from 'lucide-react';
import { RuleInput } from './RuleInput';

export const IgnoreRules = ({ ignoreRules, setIgnoreRules, availableKeys = [] }) => {
  const [expanded, setExpanded] = useState(false);
  const shownKeys = expanded ? availableKeys : availableKeys.slice(0, 5);

  return (
    <div className="p-4 rounded-2xl border border-slate-800/80 bg-slate-900/40 space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-indigo-400" />
          <span className="text-xs font-semibold text-slate-200">
            Ignore Rules & Volatile Noise Filter
          </span>
          <span className="text-[11px] text-slate-500">
            (Exclude dynamic timestamps, token UUIDs, or headers)
          </span>
        </div>

        {/* Quick toggles — keys auto-extracted from the current JSON response */}
        <div className="flex items-center gap-1 flex-wrap">
          {shownKeys.map((keyword) => {
            const isPresent = ignoreRules.includes(keyword) || ignoreRules.includes(`$.${keyword}`);
            return (
              <button
                key={keyword}
                onClick={() => {
                  if (isPresent) {
                    setIgnoreRules(ignoreRules.filter((r) => r !== keyword && r !== `$.${keyword}`));
                  } else {
                    setIgnoreRules([...ignoreRules, keyword]);
                  }
                }}
                className={`px-2 py-0.5 rounded text-[10px] font-mono border transition-colors ${
                  isPresent
                    ? 'bg-accent/15 text-accent border-accent/30'
                    : 'bg-slate-950 text-slate-500 border-slate-800 hover:text-slate-300'
                }`}
              >
                +{keyword}
              </button>
            );
          })}

          {availableKeys.length > 5 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="px-2 py-0.5 rounded text-[10px] font-mono border border-slate-800 text-slate-400 hover:text-slate-200 transition-colors flex items-center gap-1"
            >
              {expanded ? (
                <>
                  <ChevronDown className="w-3 h-3" />
                  Show Less
                </>
              ) : (
                <>
                  <ChevronRight className="w-3 h-3" />
                  Show More ({availableKeys.length - 5})
                </>
              )}
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 pt-1">
        {ignoreRules.map((rule) => (
          <span
            key={rule}
            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-300 text-[11px] font-mono"
          >
            <span>{rule}</span>
            <button
              onClick={() => setIgnoreRules(ignoreRules.filter((r) => r !== rule))}
              className="text-slate-500 hover:text-rose-400"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}

        <RuleInput
          onAdd={(newRule) => {
            if (!ignoreRules.includes(newRule)) {
              setIgnoreRules([...ignoreRules, newRule]);
            }
          }}
        />
      </div>
    </div>
  );
};
