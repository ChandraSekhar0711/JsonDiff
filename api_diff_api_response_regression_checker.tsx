import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Layers,
  Moon,
  Sun,
  Play,
  ArrowLeftRight,
  Clipboard,
  Trash2,
  Download,
  Copy,
  Check,
  Search,
  Plus,
  X,
  AlertTriangle,
  Info,
  CheckCircle2,
  Clock,
  Send,
  Save,
  RefreshCw,
  FolderOpen,
  HelpCircle,
  Database,
  ArrowRight,
  ShieldCheck,
  ChevronDown,
  ChevronRight,
  Split,
  ListTree,
  ExternalLink,
  Sliders,
  ShieldAlert
} from 'lucide-react';

// ==========================================
// 1. SAMPLE DATA & CONSTANTS
// ==========================================

const SAMPLE_BASELINE_OBJ = {
  id: 101,
  name: "Chandu",
  email: "chandu@example.com",
  age: 26,
  role: "frontend-engineer",
  profile: {
    city: "Hyderabad",
    country: "India",
    skills: ["React", "JavaScript", "CSS"]
  },
  metrics: {
    commits: 412,
    rating: 4.9
  },
  updatedAt: "2026-03-01T10:00:00Z"
};

const SAMPLE_UPDATED_OBJ = {
  id: 101,
  name: "Chandu Rao",
  // email removed
  age: "26", // Type changed: number -> string
  role: "frontend-engineer",
  profile: {
    city: "Bengaluru", // Modified
    country: "India",
    skills: ["React", "TypeScript", "Tailwind"] // Array item changes
  },
  metrics: {
    commits: 430,
    rating: 4.9
  },
  active: true, // Added
  updatedAt: "2026-03-15T14:32:00Z" // Can be ignored
};

const SAMPLE_BASELINE = JSON.stringify(SAMPLE_BASELINE_OBJ, null, 2);
const SAMPLE_UPDATED = JSON.stringify(SAMPLE_UPDATED_OBJ, null, 2);

const CHANGE_TYPES = {
  ADDED: 'added',
  REMOVED: 'removed',
  MODIFIED: 'modified',
  TYPE_CHANGED: 'type_changed'
};

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

// ==========================================
// 2. UTILITIES & RECURSIVE DIFF ENGINE
// ==========================================

function getExactType(val) {
  if (val === null) return 'null';
  if (Array.isArray(val)) return 'array';
  return typeof val;
}

function matchesPathRule(currentPath, rulePattern) {
  if (!currentPath || !rulePattern) return false;
  const cleanCurrent = currentPath.startsWith('$.') ? currentPath : `$.${currentPath}`;
  const cleanRule = rulePattern.startsWith('$.') ? rulePattern : `$.${rulePattern}`;

  if (cleanCurrent === cleanRule) return true;

  // Single word match fallback (e.g., "updatedAt" anywhere in path)
  if (!rulePattern.includes('.') && !rulePattern.includes('[')) {
    const segments = cleanCurrent.replace(/\[\d+\]/g, '').split('.');
    if (segments.includes(rulePattern)) return true;
  }

  // Wildcard converter: $.items[*].id -> ^\$\.items\[\d+\]\.id$
  try {
    const escaped = cleanRule
      .replace(/\./g, '\\.')
      .replace(/\[\*\]/g, '\\[\\d+\\]')
      .replace(/\*/g, '[^.]+');
    const rx = new RegExp(`^${escaped}$`);
    return rx.test(cleanCurrent);
  } catch {
    return false;
  }
}

/**
 * Recursive JSON Diff Engine
 * Identifies added, removed, modified, and type-changed properties.
 * Calculates potential frontend regression severity.
 */
function compareJson(baseline, updated, ignoreRules = [], basePath = '$') {
  let differences = [];

  const isIgnored = ignoreRules.some((rule) => matchesPathRule(basePath, rule));
  if (isIgnored) return differences;

  if (Object.is(baseline, updated)) return differences;

  const bType = getExactType(baseline);
  const uType = getExactType(updated);

  // Type change check
  if (bType !== uType) {
    differences.push({
      path: basePath,
      type: CHANGE_TYPES.TYPE_CHANGED,
      oldValue: baseline,
      newValue: updated,
      oldType: bType,
      newType: uType,
      isRisk: true,
      riskReason: `Type drift from [${bType}] to [${uType}]. Components expecting ${bType} properties or methods will fail.`
    });
    return differences;
  }

  // Primitives comparison
  if (bType !== 'object' && bType !== 'array') {
    if (baseline !== updated) {
      differences.push({
        path: basePath,
        type: CHANGE_TYPES.MODIFIED,
        oldValue: baseline,
        newValue: updated,
        oldType: bType,
        newType: uType,
        isRisk: false
      });
    }
    return differences;
  }

  // Array comparison (index-aligned with documentation)
  if (bType === 'array') {
    const maxLen = Math.max(baseline.length, updated.length);
    for (let i = 0; i < maxLen; i++) {
      const itemPath = `${basePath}[${i}]`;
      const itemIgnored = ignoreRules.some((rule) => matchesPathRule(itemPath, rule));
      if (itemIgnored) continue;

      if (i >= baseline.length) {
        differences.push({
          path: itemPath,
          type: CHANGE_TYPES.ADDED,
          oldValue: undefined,
          newValue: updated[i],
          oldType: 'undefined',
          newType: getExactType(updated[i]),
          isRisk: false
        });
      } else if (i >= updated.length) {
        differences.push({
          path: itemPath,
          type: CHANGE_TYPES.REMOVED,
          oldValue: baseline[i],
          newValue: undefined,
          oldType: getExactType(baseline[i]),
          newType: 'undefined',
          isRisk: true,
          riskReason: 'Array length decreased. Zero-indexed element accesses may evaluate to undefined.'
        });
      } else {
        differences = differences.concat(
          compareJson(baseline[i], updated[i], ignoreRules, itemPath)
        );
      }
    }
    return differences;
  }

  // Object comparison (key order agnostic)
  if (bType === 'object') {
    const bKeys = Object.keys(baseline);
    const uKeys = Object.keys(updated);
    const allKeys = Array.from(new Set([...bKeys, ...uKeys]));

    for (const key of allKeys) {
      const propPath = basePath === '$' ? `$.${key}` : `${basePath}.${key}`;
      const propIgnored = ignoreRules.some((rule) => matchesPathRule(propPath, rule));
      if (propIgnored) continue;

      const inBaseline = Object.prototype.hasOwnProperty.call(baseline, key);
      const inUpdated = Object.prototype.hasOwnProperty.call(updated, key);

      if (inBaseline && !inUpdated) {
        differences.push({
          path: propPath,
          type: CHANGE_TYPES.REMOVED,
          oldValue: baseline[key],
          newValue: undefined,
          oldType: getExactType(baseline[key]),
          newType: 'undefined',
          isRisk: true,
          riskReason: `Property [${key}] was deleted. Frontend code accessing response.${key} without optional chaining will throw ReferenceError.`
        });
      } else if (!inBaseline && inUpdated) {
        differences.push({
          path: propPath,
          type: CHANGE_TYPES.ADDED,
          oldValue: undefined,
          newValue: updated[key],
          oldType: 'undefined',
          newType: getExactType(updated[key]),
          isRisk: false
        });
      } else {
        differences = differences.concat(
          compareJson(baseline[key], updated[key], ignoreRules, propPath)
        );
      }
    }
  }

  return differences;
}

function safeParse(str) {
  if (!str || typeof str !== 'string' || !str.trim()) {
    return { data: null, error: null };
  }
  try {
    const data = JSON.parse(str.trim());
    return { data, error: null };
  } catch (err) {
    return { data: null, error: err.message };
  }
}

// ==========================================
// 3. MAIN COMPONENT (App)
// ==========================================

export default function App() {
  // Theme state
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('apidiff_theme') || 'dark';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
    }
    localStorage.setItem('apidiff_theme', theme);
  }, [theme]);

  // Mode: 'manual' | 'api'
  const [activeTab, setActiveTab] = useState('manual');

  // Manual comparison states
  const [baselineInput, setBaselineInput] = useState(SAMPLE_BASELINE);
  const [latestInput, setLatestInput] = useState(SAMPLE_UPDATED);
  const [ignoreRules, setIgnoreRules] = useState(['$.updatedAt', 'timestamp', 'requestId']);

  // API Request Builder states
  const [apiUrl, setApiUrl] = useState('https://jsonplaceholder.typicode.com/todos/1');
  const [apiMethod, setApiMethod] = useState('GET');
  const [queryParams, setQueryParams] = useState([{ key: '', value: '', enabled: true }]);
  const [headers, setHeaders] = useState([
    { key: 'Accept', value: 'application/json', enabled: true }
  ]);
  const [reqBody, setReqBody] = useState('{\n  "title": "foo",\n  "completed": false\n}');
  const [apiActiveSubTab, setApiActiveSubTab] = useState('params'); // params, headers, body

  // Execution & response states
  const [isFetching, setIsFetching] = useState(false);
  const [apiResponseMeta, setApiResponseMeta] = useState(null); // { status, statusText, timeMs, timestamp }
  const [corsModalOpen, setCorsModalOpen] = useState(false);
  const [activeBaselineRecord, setActiveBaselineRecord] = useState(null);

  // Saved Baselines (localStorage)
  const [savedBaselines, setSavedBaselines] = useState(() => {
    try {
      const stored = localStorage.getItem('apidiff_saved_baselines');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Baselines Drawer / Modal
  const [isBaselinesDrawerOpen, setIsBaselinesDrawerOpen] = useState(false);
  const [baselineNameInput, setBaselineNameInput] = useState('');
  const [saveBaselineModalOpen, setSaveBaselineModalOpen] = useState(false);

  // Diff & Filter States
  const [activeDiffFilter, setActiveDiffFilter] = useState('all'); // all, type_changed, removed, modified, added
  const [diffSearchQuery, setDiffSearchQuery] = useState('');
  const [diffViewMode, setDiffViewMode] = useState('tree'); // tree | sideBySide
  const [hasRunDiff, setHasRunDiff] = useState(true);

  // Toast feedback state
  const [toasts, setToasts] = useState([]);
  const addToast = (message, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  };

  // Sync savedBaselines to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('apidiff_saved_baselines', JSON.stringify(savedBaselines));
    } catch {
      // quota or local storage disabled
    }
  }, [savedBaselines]);

  // Validation
  const baselineParseResult = useMemo(() => safeParse(baselineInput), [baselineInput]);
  const latestParseResult = useMemo(() => safeParse(latestInput), [latestInput]);

  // Compute differences
  const differences = useMemo(() => {
    if (!hasRunDiff) return [];
    if (!baselineParseResult.data || !latestParseResult.data) return [];
    return compareJson(baselineParseResult.data, latestParseResult.data, ignoreRules);
  }, [hasRunDiff, baselineParseResult.data, latestParseResult.data, ignoreRules]);

  // Compute metrics
  const stats = useMemo(() => {
    return {
      total: differences.length,
      typeChanged: differences.filter((d) => d.type === CHANGE_TYPES.TYPE_CHANGED).length,
      removed: differences.filter((d) => d.type === CHANGE_TYPES.REMOVED).length,
      modified: differences.filter((d) => d.type === CHANGE_TYPES.MODIFIED).length,
      added: differences.filter((d) => d.type === CHANGE_TYPES.ADDED).length,
      riskCount: differences.filter((d) => d.isRisk).length
    };
  }, [differences]);

  // Filtered diffs
  const filteredDifferences = useMemo(() => {
    return differences.filter((item) => {
      const matchType = activeDiffFilter === 'all' || item.type === activeDiffFilter;
      const matchQuery =
        !diffSearchQuery ||
        item.path.toLowerCase().includes(diffSearchQuery.toLowerCase()) ||
        String(item.oldValue).toLowerCase().includes(diffSearchQuery.toLowerCase()) ||
        String(item.newValue).toLowerCase().includes(diffSearchQuery.toLowerCase());
      return matchType && matchQuery;
    });
  }, [differences, activeDiffFilter, diffSearchQuery]);

  // ==========================================
  // 4. API FETCH HANDLER
  // ==========================================

  const executeApiRequest = async () => {
    if (!apiUrl.trim()) {
      addToast('Please specify a valid API URL.', 'error');
      return;
    }

    setIsFetching(true);
    setApiResponseMeta(null);

    // Build URL with params
    let finalUrl = apiUrl.trim();
    const activeParams = queryParams.filter((p) => p.enabled && p.key.trim());
    if (activeParams.length > 0) {
      try {
        const urlObj = new URL(finalUrl);
        activeParams.forEach((p) => urlObj.searchParams.append(p.key.trim(), p.value.trim()));
        finalUrl = urlObj.toString();
      } catch {
        // Simple fallback concatenation if full URL format isn't strictly standard yet
        const qs = activeParams
          .map((p) => `${encodeURIComponent(p.key.trim())}=${encodeURIComponent(p.value.trim())}`)
          .join('&');
        finalUrl += (finalUrl.includes('?') ? '&' : '?') + qs;
      }
    }

    // Build Headers
    const reqHeaders = {};
    headers.forEach((h) => {
      if (h.enabled && h.key.trim()) {
        reqHeaders[h.key.trim()] = h.value.trim();
      }
    });

    const options = {
      method: apiMethod,
      headers: reqHeaders
    };

    if (['POST', 'PUT', 'PATCH'].includes(apiMethod) && reqBody.trim()) {
      options.body = reqBody;
      if (!reqHeaders['Content-Type']) {
        options.headers['Content-Type'] = 'application/json';
      }
    }

    const startTime = performance.now();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000); // 12-second timeout

    try {
      const res = await fetch(finalUrl, {
        ...options,
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      const elapsed = Math.round(performance.now() - startTime);

      const contentType = res.headers.get('content-type') || '';
      let bodyText = await res.text();
      let formattedJson = bodyText;

      try {
        const parsed = JSON.parse(bodyText);
        formattedJson = JSON.stringify(parsed, null, 2);
      } catch {
        // Not valid JSON
      }

      setApiResponseMeta({
        status: res.status,
        statusText: res.statusText || (res.ok ? 'OK' : 'Error'),
        timeMs: elapsed,
        timestamp: new Date().toLocaleTimeString(),
        isJson: contentType.includes('application/json')
      });

      // Update Latest response
      setLatestInput(formattedJson);
      setHasRunDiff(true);

      if (!activeBaselineRecord && !baselineInput.trim()) {
        // First run automatically suggests saving baseline
        setBaselineInput(formattedJson);
        addToast('Initial successful response saved as temporary Baseline.', 'info');
      } else {
        addToast(`Response received in ${elapsed}ms (${res.status} ${res.statusText})`, 'success');
      }
    } catch (err) {
      clearTimeout(timeoutId);
      const elapsed = Math.round(performance.now() - startTime);

      let msg = err.message;
      if (err.name === 'AbortError') {
        msg = 'Request timed out after 12 seconds.';
      } else if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
        msg = 'Network or CORS policy restriction prevented the browser from loading this resource.';
      }

      setApiResponseMeta({
        status: 0,
        statusText: 'Failed',
        timeMs: elapsed,
        timestamp: new Date().toLocaleTimeString(),
        error: msg
      });

      addToast(msg, 'error');
    } finally {
      setIsFetching(false);
    }
  };

  // ==========================================
  // 5. BASELINE ACTIONS
  // ==========================================

  const handleSaveBaselineConfirm = () => {
    if (!baselineInput.trim() || baselineParseResult.error) {
      addToast('Cannot save an invalid or empty baseline.', 'error');
      return;
    }

    const name = baselineNameInput.trim() || `Baseline: ${activeTab === 'api' ? apiUrl : 'Manual Payload'}`;
    const newRecord = {
      id: 'bl_' + Date.now(),
      name,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      mode: activeTab,
      endpoint: activeTab === 'api' ? apiUrl : null,
      method: activeTab === 'api' ? apiMethod : null,
      payload: baselineInput
    };

    setSavedBaselines((prev) => [newRecord, ...prev]);
    setActiveBaselineRecord(newRecord);
    setSaveBaselineModalOpen(false);
    setBaselineNameInput('');
    addToast(`Baseline "${name}" saved in browser storage.`, 'success');
  };

  const handleUpdateActiveBaseline = () => {
    if (!activeBaselineRecord) return;
    if (latestParseResult.error || !latestInput.trim()) {
      addToast('Cannot update baseline with invalid latest JSON.', 'error');
      return;
    }

    const updatedList = savedBaselines.map((bl) => {
      if (bl.id === activeBaselineRecord.id) {
        return {
          ...bl,
          payload: latestInput,
          updatedAt: new Date().toISOString()
        };
      }
      return bl;
    });

    setSavedBaselines(updatedList);
    setBaselineInput(latestInput);
    setActiveBaselineRecord({
      ...activeBaselineRecord,
      payload: latestInput,
      updatedAt: new Date().toISOString()
    });
    addToast('Baseline updated to match latest verified response.', 'success');
  };

  const handleSelectBaseline = (bl) => {
    setActiveBaselineRecord(bl);
    setBaselineInput(bl.payload);
    if (bl.endpoint) {
      setApiUrl(bl.endpoint);
      if (bl.method) setApiMethod(bl.method);
    }
    setIsBaselinesDrawerOpen(false);
    setHasRunDiff(true);
    addToast(`Loaded baseline "${bl.name}"`, 'info');
  };

  const handleDeleteBaseline = (id, e) => {
    e.stopPropagation();
    setSavedBaselines((prev) => prev.filter((b) => b.id !== id));
    if (activeBaselineRecord && activeBaselineRecord.id === id) {
      setActiveBaselineRecord(null);
    }
    addToast('Baseline removed from storage.', 'info');
  };

  // Swap baseline and latest
  const handleSwap = () => {
    const temp = baselineInput;
    setBaselineInput(latestInput);
    setLatestInput(temp);
    setHasRunDiff(true);
    addToast('Swapped Baseline and Latest inputs.', 'info');
  };

  const handleLoadSample = () => {
    setBaselineInput(SAMPLE_BASELINE);
    setLatestInput(SAMPLE_UPDATED);
    setHasRunDiff(true);
    setActiveBaselineRecord(null);
    addToast('Sample regression dataset loaded.', 'success');
  };

  const handleExportJson = () => {
    const reportData = {
      title: "API Diff Regression Report",
      generatedAt: new Date().toISOString(),
      summary: stats,
      activeRules: ignoreRules,
      differences
    };
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `api-diff-report-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    addToast('Report downloaded as JSON.', 'success');
  };

  const handleCopyReportMarkdown = () => {
    let md = `# API Diff Regression Report\nGenerated: ${new Date().toLocaleString()}\n\n`;
    md += `### Summary\n- Total Differences: ${stats.total}\n- Critical Type Changes: ${stats.typeChanged}\n- Removed Fields: ${stats.removed}\n- Modified Values: ${stats.modified}\n- Added Fields: ${stats.added}\n\n`;
    md += `### Detailed Changes\n`;
    differences.forEach((d) => {
      md += `- **[${d.type.toUpperCase()}]** \`${d.path}\`\n`;
      if (d.type !== CHANGE_TYPES.ADDED) md += `  - Baseline: \`${JSON.stringify(d.oldValue)}\`\n`;
      if (d.type !== CHANGE_TYPES.REMOVED) md += `  - Latest: \`${JSON.stringify(d.newValue)}\`\n`;
      if (d.isRisk) md += `  - ⚠️ *Risk*: ${d.riskReason}\n`;
    });

    navigator.clipboard.writeText(md);
    addToast('Markdown audit summary copied to clipboard!', 'success');
  };

  return (
    <div className={`min-h-screen flex flex-col font-sans transition-colors duration-200 ${theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-800'}`}>
      
      {/* Toast Notification Container */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto px-4 py-2.5 rounded-lg shadow-xl text-xs font-mono flex items-center gap-2 border transition-all animate-in fade-in slide-in-from-bottom-2 ${
              toast.type === 'error'
                ? 'bg-rose-950/90 text-rose-200 border-rose-800'
                : toast.type === 'success'
                ? 'bg-emerald-950/90 text-emerald-200 border-emerald-800'
                : 'bg-slate-900/90 text-slate-200 border-slate-700'
            }`}
          >
            {toast.type === 'error' && <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />}
            {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />}
            {toast.type === 'info' && <Info className="w-4 h-4 text-indigo-400 flex-shrink-0" />}
            <span className="leading-snug">{toast.message}</span>
          </div>
        ))}
      </div>

      {/* HEADER NAVBAR */}
      <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md px-4 sm:px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/30">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm tracking-tight text-white">API Diff</span>
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800/50">
                Regression Tool
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">Catch API breaking changes before production</p>
          </div>
        </div>

        {/* Mode Toggle Controls */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900 border border-slate-800">
          <button
            onClick={() => setActiveTab('manual')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'manual'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Manual Compare
          </button>
          <button
            onClick={() => setActiveTab('api')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
              activeTab === 'api'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Send className="w-3 h-3" />
            API Tester
          </button>
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsBaselinesDrawerOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-800 text-xs font-medium text-slate-300 hover:bg-slate-900 transition-colors"
            title="Saved Baselines in localStorage"
          >
            <Database className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden md:inline">Baselines</span>
            {savedBaselines.length > 0 && (
              <span className="w-4 h-4 rounded-full bg-slate-800 text-[10px] flex items-center justify-center font-mono">
                {savedBaselines.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="p-2 rounded-lg border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-900 transition-colors"
            title="Toggle Light/Dark Theme"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* SUB-HEADER / BANNER */}
      <div className="border-b border-slate-800/60 bg-slate-900/30 px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          {activeBaselineRecord ? (
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="text-slate-300">
                Active Baseline: <strong className="text-white font-mono">{activeBaselineRecord.name}</strong>
              </span>
              <span className="text-slate-500 text-[11px]">
                (Saved {new Date(activeBaselineRecord.updatedAt).toLocaleTimeString()})
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-slate-400">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span>Unsaved ephemeral comparison baseline</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleLoadSample}
            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors flex items-center gap-1.5"
          >
            <RefreshCw className="w-3 h-3" />
            Load Sample API Dataset
          </button>

          <button
            onClick={() => setSaveBaselineModalOpen(true)}
            className="px-2.5 py-1 rounded bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-600/30 text-xs font-medium transition-colors flex items-center gap-1.5"
          >
            <Save className="w-3 h-3" />
            Save Baseline
          </button>

          {activeBaselineRecord && (
            <button
              onClick={handleUpdateActiveBaseline}
              className="px-2.5 py-1 rounded bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-600/30 text-xs font-medium transition-colors flex items-center gap-1.5"
              title="Promote Latest response to be the new Baseline"
            >
              <Check className="w-3 h-3" />
              Update Baseline with Latest
            </button>
          )}
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">

        {/* MODE 1: API ENDPOINT TESTER */}
        {activeTab === 'api' && (
          <div className="border border-slate-800 rounded-2xl bg-slate-900/50 p-4 sm:p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              {/* Method select */}
              <select
                value={apiMethod}
                onChange={(e) => setApiMethod(e.target.value)}
                className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono font-bold text-indigo-400 focus:outline-none focus:border-indigo-500"
              >
                {HTTP_METHODS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>

              {/* URL Input */}
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={apiUrl}
                  onChange={(e) => setApiUrl(e.target.value)}
                  placeholder="https://api.yourdomain.com/v1/users/123"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Send Request Button */}
              <button
                disabled={isFetching}
                onClick={executeApiRequest}
                className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-indigo-600/20"
              >
                {isFetching ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Fetching...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Check for Changes</span>
                  </>
                )}
              </button>

              <button
                onClick={() => setCorsModalOpen(true)}
                className="p-2 text-slate-400 hover:text-slate-200 border border-slate-800 rounded-lg hover:bg-slate-800"
                title="CORS & Fetch Diagnostic Guidance"
              >
                <HelpCircle className="w-4 h-4" />
              </button>
            </div>

            {/* Request Configuration Tabs */}
            <div className="border border-slate-800/80 rounded-xl bg-slate-950/60 overflow-hidden">
              <div className="flex border-b border-slate-800 bg-slate-900/60 px-3">
                <button
                  onClick={() => setApiActiveSubTab('params')}
                  className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
                    apiActiveSubTab === 'params'
                      ? 'border-indigo-500 text-indigo-300'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Query Params ({queryParams.filter((p) => p.key).length})
                </button>
                <button
                  onClick={() => setApiActiveSubTab('headers')}
                  className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
                    apiActiveSubTab === 'headers'
                      ? 'border-indigo-500 text-indigo-300'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Headers ({headers.filter((h) => h.key).length})
                </button>
                {['POST', 'PUT', 'PATCH'].includes(apiMethod) && (
                  <button
                    onClick={() => setApiActiveSubTab('body')}
                    className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
                      apiActiveSubTab === 'body'
                        ? 'border-indigo-500 text-indigo-300'
                        : 'border-transparent text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Body (JSON)
                  </button>
                )}
              </div>

              <div className="p-3">
                {/* Query Params Subtab */}
                {apiActiveSubTab === 'params' && (
                  <div className="space-y-2">
                    {queryParams.map((p, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={p.enabled}
                          onChange={(e) => {
                            const updated = [...queryParams];
                            updated[idx].enabled = e.target.checked;
                            setQueryParams(updated);
                          }}
                          className="rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-0"
                        />
                        <input
                          type="text"
                          placeholder="Parameter Name"
                          value={p.key}
                          onChange={(e) => {
                            const updated = [...queryParams];
                            updated[idx].key = e.target.value;
                            setQueryParams(updated);
                          }}
                          className="flex-1 bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs font-mono text-slate-200 focus:outline-none focus:border-indigo-500"
                        />
                        <input
                          type="text"
                          placeholder="Value"
                          value={p.value}
                          onChange={(e) => {
                            const updated = [...queryParams];
                            updated[idx].value = e.target.value;
                            setQueryParams(updated);
                          }}
                          className="flex-1 bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs font-mono text-slate-200 focus:outline-none focus:border-indigo-500"
                        />
                        <button
                          onClick={() => setQueryParams(queryParams.filter((_, i) => i !== idx))}
                          className="text-slate-500 hover:text-rose-400 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => setQueryParams([...queryParams, { key: '', value: '', enabled: true }])}
                      className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-mono pt-1"
                    >
                      <Plus className="w-3 h-3" /> Add Query Param
                    </button>
                  </div>
                )}

                {/* Headers Subtab */}
                {apiActiveSubTab === 'headers' && (
                  <div className="space-y-2">
                    {headers.map((h, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={h.enabled}
                          onChange={(e) => {
                            const updated = [...headers];
                            updated[idx].enabled = e.target.checked;
                            setHeaders(updated);
                          }}
                          className="rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-0"
                        />
                        <input
                          type="text"
                          placeholder="Header Key (e.g. Authorization, X-Api-Key)"
                          value={h.key}
                          onChange={(e) => {
                            const updated = [...headers];
                            updated[idx].key = e.target.value;
                            setHeaders(updated);
                          }}
                          className="flex-1 bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs font-mono text-slate-200 focus:outline-none focus:border-indigo-500"
                        />
                        <input
                          type="text"
                          placeholder="Header Value"
                          value={h.value}
                          onChange={(e) => {
                            const updated = [...headers];
                            updated[idx].value = e.target.value;
                            setHeaders(updated);
                          }}
                          className="flex-1 bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs font-mono text-slate-200 focus:outline-none focus:border-indigo-500"
                        />
                        <button
                          onClick={() => setHeaders(headers.filter((_, i) => i !== idx))}
                          className="text-slate-500 hover:text-rose-400 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => setHeaders([...headers, { key: '', value: '', enabled: true }])}
                      className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-mono pt-1"
                    >
                      <Plus className="w-3 h-3" /> Add Header
                    </button>
                  </div>
                )}

                {/* Body Subtab */}
                {apiActiveSubTab === 'body' && (
                  <div>
                    <textarea
                      value={reqBody}
                      onChange={(e) => setReqBody(e.target.value)}
                      rows={5}
                      className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-indigo-500 leading-relaxed"
                      placeholder="JSON payload..."
                    />
                  </div>
                )}
              </div>
            </div>

            {/* API Metadata Bar */}
            {apiResponseMeta && (
              <div className="flex flex-wrap items-center justify-between gap-3 px-3.5 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono">
                <div className="flex items-center gap-3">
                  <span
                    className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                      apiResponseMeta.status >= 200 && apiResponseMeta.status < 300
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    }`}
                  >
                    STATUS: {apiResponseMeta.status} {apiResponseMeta.statusText}
                  </span>
                  <span className="text-slate-400 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-500" /> {apiResponseMeta.timeMs}ms
                  </span>
                  <span className="text-slate-500">Fetched at: {apiResponseMeta.timestamp}</span>
                </div>
                {apiResponseMeta.error && (
                  <span className="text-rose-400 text-[11px]">{apiResponseMeta.error}</span>
                )}
              </div>
            )}
          </div>
        )}

        {/* WORKSPACE DUAL EDITORS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          
          {/* Baseline Editor Panel */}
          <div className="border border-slate-800 rounded-xl bg-slate-900/60 overflow-hidden flex flex-col shadow-sm">
            <div className="px-3.5 py-2.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Known-Good Baseline Response
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={async () => {
                    try {
                      const text = await navigator.clipboard.readText();
                      setBaselineInput(text);
                      addToast('Pasted into Baseline', 'info');
                    } catch {
                      addToast('Clipboard permission denied', 'error');
                    }
                  }}
                  className="px-2 py-1 rounded text-slate-400 hover:text-slate-200 text-xs flex items-center gap-1 hover:bg-slate-800 transition-colors"
                >
                  <Clipboard className="w-3 h-3" /> Paste
                </button>
                <button
                  onClick={() => setBaselineInput('')}
                  className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                  title="Clear baseline"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>

            <textarea
              value={baselineInput}
              onChange={(e) => {
                setBaselineInput(e.target.value);
                setHasRunDiff(true);
              }}
              spellCheck="false"
              placeholder="Paste known-good baseline JSON response..."
              className="w-full h-72 sm:h-80 p-3 bg-transparent font-mono text-xs text-slate-200 focus:outline-none resize-none leading-relaxed"
            />

            <div className="px-3 py-1.5 bg-slate-950 border-t border-slate-800/80 text-[11px] font-mono flex items-center justify-between text-slate-400">
              <span>{baselineInput.length} chars</span>
              {baselineParseResult.error ? (
                <span className="text-rose-400 flex items-center gap-1 truncate max-w-xs" title={baselineParseResult.error}>
                  <AlertTriangle className="w-3 h-3 flex-shrink-0" /> Invalid JSON: {baselineParseResult.error}
                </span>
              ) : (
                <span className="text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Valid JSON
                </span>
              )}
            </div>
          </div>

          {/* Latest Editor Panel */}
          <div className="border border-slate-800 rounded-xl bg-slate-900/60 overflow-hidden flex flex-col shadow-sm">
            <div className="px-3.5 py-2.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Latest Response (Deploy / Test)
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={async () => {
                    try {
                      const text = await navigator.clipboard.readText();
                      setLatestInput(text);
                      addToast('Pasted into Latest', 'info');
                    } catch {
                      addToast('Clipboard permission denied', 'error');
                    }
                  }}
                  className="px-2 py-1 rounded text-slate-400 hover:text-slate-200 text-xs flex items-center gap-1 hover:bg-slate-800 transition-colors"
                >
                  <Clipboard className="w-3 h-3" /> Paste
                </button>
                <button
                  onClick={() => setLatestInput('')}
                  className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                  title="Clear latest response"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>

            <textarea
              value={latestInput}
              onChange={(e) => {
                setLatestInput(e.target.value);
                setHasRunDiff(true);
              }}
              spellCheck="false"
              placeholder="Paste updated API response here..."
              className="w-full h-72 sm:h-80 p-3 bg-transparent font-mono text-xs text-slate-200 focus:outline-none resize-none leading-relaxed"
            />

            <div className="px-3 py-1.5 bg-slate-950 border-t border-slate-800/80 text-[11px] font-mono flex items-center justify-between text-slate-400">
              <span>{latestInput.length} chars</span>
              {latestParseResult.error ? (
                <span className="text-rose-400 flex items-center gap-1 truncate max-w-xs" title={latestParseResult.error}>
                  <AlertTriangle className="w-3 h-3 flex-shrink-0" /> Invalid JSON: {latestParseResult.error}
                </span>
              ) : (
                <span className="text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Valid JSON
                </span>
              )}
            </div>
          </div>
        </div>

        {/* WORKSPACE ACTIONS ROW */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={handleSwap}
              className="px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-mono flex items-center gap-1.5 transition-colors"
            >
              <ArrowLeftRight className="w-3.5 h-3.5" /> Swap Baseline & Latest
            </button>
            <button
              onClick={() => {
                setBaselineInput('');
                setLatestInput('');
              }}
              className="px-3 py-1.5 rounded-lg border border-slate-800 text-slate-400 hover:text-rose-400 hover:bg-slate-900 text-xs transition-colors"
            >
              Clear Both
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setHasRunDiff(true);
                addToast('Differences re-computed.', 'info');
              }}
              className="px-6 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs flex items-center gap-2 transition-all shadow-md shadow-indigo-600/20"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              Re-Compare Diff
            </button>
          </div>
        </div>

        {/* IGNORE RULES CONFIGURATION */}
        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40 space-y-3">
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

            {/* Quick toggles */}
            <div className="flex items-center gap-1">
              {['timestamp', 'updatedAt', 'requestId', 'id'].map((keyword) => {
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
                        ? 'bg-indigo-900/50 text-indigo-300 border-indigo-700'
                        : 'bg-slate-950 text-slate-500 border-slate-800 hover:text-slate-300'
                    }`}
                  >
                    +{keyword}
                  </button>
                );
              })}
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

        {/* SUMMARY STATS & REGRESSION RISK BANNER */}
        <div className="space-y-4">
          {stats.riskCount > 0 && (
            <div className="p-3.5 rounded-xl border border-rose-500/30 bg-rose-950/20 text-rose-200 flex items-start gap-3 text-xs">
              <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="font-semibold block text-rose-300">
                  Potential Frontend Breaking Changes Detected ({stats.riskCount})
                </strong>
                <span>
                  One or more properties have been removed or changed data types (e.g. from number to string). These frequently break UI assumptions and property calculations.
                </span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/60">
              <span className="text-[11px] font-mono uppercase text-slate-400">Total Differences</span>
              <div className="text-2xl font-bold font-mono text-slate-100 mt-1">{stats.total}</div>
            </div>

            <div className="p-3.5 rounded-xl border border-violet-800/40 bg-violet-950/20">
              <span className="text-[11px] font-mono uppercase text-violet-300 flex items-center justify-between">
                Type Changed
                <span className="w-1.5 h-1.5 rounded-full bg-violet-400" />
              </span>
              <div className="text-2xl font-bold font-mono text-violet-400 mt-1">{stats.typeChanged}</div>
            </div>

            <div className="p-3.5 rounded-xl border border-rose-800/40 bg-rose-950/20">
              <span className="text-[11px] font-mono uppercase text-rose-300 flex items-center justify-between">
                Removed Fields
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
              </span>
              <div className="text-2xl font-bold font-mono text-rose-400 mt-1">{stats.removed}</div>
            </div>

            <div className="p-3.5 rounded-xl border border-amber-800/40 bg-amber-950/20">
              <span className="text-[11px] font-mono uppercase text-amber-300 flex items-center justify-between">
                Modified Values
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              </span>
              <div className="text-2xl font-bold font-mono text-amber-400 mt-1">{stats.modified}</div>
            </div>

            <div className="p-3.5 rounded-xl border border-emerald-800/40 bg-emerald-950/20">
              <span className="text-[11px] font-mono uppercase text-emerald-300 flex items-center justify-between">
                Added Fields
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              </span>
              <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">{stats.added}</div>
            </div>
          </div>
        </div>

        {/* DIFFERENCE REPORT PANEL */}
        <div className="border border-slate-800 rounded-2xl bg-slate-900/50 overflow-hidden shadow-sm">
          
          {/* Header controls & filters */}
          <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            
            {/* Filter Tabs */}
            <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-950 rounded-lg border border-slate-800 text-xs">
              <button
                onClick={() => setActiveDiffFilter('all')}
                className={`px-2.5 py-1 rounded font-medium ${
                  activeDiffFilter === 'all' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                All ({stats.total})
              </button>
              <button
                onClick={() => setActiveDiffFilter(CHANGE_TYPES.TYPE_CHANGED)}
                className={`px-2.5 py-1 rounded font-medium ${
                  activeDiffFilter === CHANGE_TYPES.TYPE_CHANGED
                    ? 'bg-violet-900/60 text-violet-200'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Type Changes ({stats.typeChanged})
              </button>
              <button
                onClick={() => setActiveDiffFilter(CHANGE_TYPES.REMOVED)}
                className={`px-2.5 py-1 rounded font-medium ${
                  activeDiffFilter === CHANGE_TYPES.REMOVED
                    ? 'bg-rose-900/60 text-rose-200'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Removed ({stats.removed})
              </button>
              <button
                onClick={() => setActiveDiffFilter(CHANGE_TYPES.MODIFIED)}
                className={`px-2.5 py-1 rounded font-medium ${
                  activeDiffFilter === CHANGE_TYPES.MODIFIED
                    ? 'bg-amber-900/60 text-amber-200'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Modified ({stats.modified})
              </button>
              <button
                onClick={() => setActiveDiffFilter(CHANGE_TYPES.ADDED)}
                className={`px-2.5 py-1 rounded font-medium ${
                  activeDiffFilter === CHANGE_TYPES.ADDED
                    ? 'bg-emerald-900/60 text-emerald-200'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Added ({stats.added})
              </button>
            </div>

            {/* Search and view toggle */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1 sm:w-56">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search JSON path..."
                  value={diffSearchQuery}
                  onChange={(e) => setDiffSearchQuery(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* View switch */}
              <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-0.5">
                <button
                  onClick={() => setDiffViewMode('tree')}
                  className={`p-1.5 rounded ${diffViewMode === 'tree' ? 'bg-slate-800 text-white' : 'text-slate-400'}`}
                  title="Tree View"
                >
                  <ListTree className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setDiffViewMode('sideBySide')}
                  className={`p-1.5 rounded ${diffViewMode === 'sideBySide' ? 'bg-slate-800 text-white' : 'text-slate-400'}`}
                  title="Side-by-Side Diff"
                >
                  <Split className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Export actions */}
              <button
                onClick={handleCopyReportMarkdown}
                className="p-1.5 text-slate-400 hover:text-slate-200 border border-slate-800 bg-slate-950 rounded-lg"
                title="Copy Summary Markdown"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleExportJson}
                className="p-1.5 text-slate-400 hover:text-slate-200 border border-slate-800 bg-slate-950 rounded-lg"
                title="Export JSON Report"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* VIEW: TREE VIEW */}
          {diffViewMode === 'tree' && (
            <div className="p-4">
              {filteredDifferences.length === 0 ? (
                <div className="py-12 text-center text-slate-500 font-mono text-xs">
                  {stats.total === 0
                    ? '✓ No regressions detected. Both JSON payloads are identical under active rules.'
                    : 'No differences match the current filter or search criteria.'}
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredDifferences.map((diff, idx) => (
                    <DiffTreeRow key={diff.path + idx} diff={diff} onCopyToast={addToast} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* VIEW: SIDE-BY-SIDE VIEW */}
          {diffViewMode === 'sideBySide' && (
            <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-800">
              <div className="p-4">
                <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block mb-2 font-bold">
                  Baseline Payload Elements
                </span>
                <div className="space-y-2">
                  {filteredDifferences
                    .filter((d) => d.type !== CHANGE_TYPES.ADDED)
                    .map((d, i) => (
                      <div key={i} className="p-2.5 rounded bg-rose-950/20 border border-rose-500/20 text-xs font-mono">
                        <div className="flex items-center justify-between text-rose-300">
                          <span className="font-semibold">{d.path}</span>
                          <span className="text-[10px] uppercase px-1 rounded bg-rose-900/60">{d.type}</span>
                        </div>
                        <pre className="mt-1 text-slate-300 whitespace-pre-wrap break-all text-[11px]">
                          {JSON.stringify(d.oldValue, null, 2)}
                        </pre>
                      </div>
                    ))}
                </div>
              </div>

              <div className="p-4">
                <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block mb-2 font-bold">
                  Updated Payload Elements
                </span>
                <div className="space-y-2">
                  {filteredDifferences
                    .filter((d) => d.type !== CHANGE_TYPES.REMOVED)
                    .map((d, i) => (
                      <div key={i} className="p-2.5 rounded bg-emerald-950/20 border border-emerald-500/20 text-xs font-mono">
                        <div className="flex items-center justify-between text-emerald-300">
                          <span className="font-semibold">{d.path}</span>
                          <span className="text-[10px] uppercase px-1 rounded bg-emerald-900/60">{d.type}</span>
                        </div>
                        <pre className="mt-1 text-slate-300 whitespace-pre-wrap break-all text-[11px]">
                          {JSON.stringify(d.newValue, null, 2)}
                        </pre>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* WORKFLOW GUIDE & VALUE PROPOSITION */}
        <div className="border border-slate-800 rounded-2xl bg-slate-900/30 p-6 space-y-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-indigo-400" />
            <h3 className="text-sm font-semibold text-slate-200">How to use API Diff in your development cycle</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs text-slate-400 leading-relaxed">
            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
              <span className="font-bold text-white block mb-1">1. Establish Baseline</span>
              <p>Execute your staging or production API request and click "Save Baseline" to store the response signature.</p>
            </div>
            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
              <span className="font-bold text-white block mb-1">2. Run Deployment Tests</span>
              <p>Re-trigger the request against your latest build branch or staging container without modifying the baseline.</p>
            </div>
            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
              <span className="font-bold text-white block mb-1">3. Inspect Breaking Changes</span>
              <p>Review the diff tree. Violet type changes and red removed fields highlight immediate frontend regression hazards.</p>
            </div>
            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
              <span className="font-bold text-white block mb-1">4. Accept or Report</span>
              <p>Copy the markdown report into your PR or click "Update Baseline" once schema changes are validated.</p>
            </div>
          </div>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-slate-800/80 bg-slate-950 px-6 py-6 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-indigo-500" />
          <span>API Diff — Lightweight Client-Side Regression Checker</span>
        </div>
        <div className="text-center sm:text-right">
          <span className="text-[11px] block">Data Privacy: 100% processed locally in your browser session. No API tokens or payloads are sent to external analytics.</span>
        </div>
      </footer>

      {/* MODAL: CORS DIAGNOSTIC HELPER */}
      {corsModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-indigo-400">
                <HelpCircle className="w-5 h-5" />
                <h3 className="font-bold text-white text-sm">Browser CORS & Fetch Diagnostics</h3>
              </div>
              <button onClick={() => setCorsModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-slate-300 space-y-3 leading-relaxed">
              <p>
                Browsers enforce the <strong>Same-Origin Policy (CORS)</strong>. When sending requests directly from a client application:
              </p>
              <ul className="list-disc list-inside space-y-1 text-slate-400">
                <li>The target API server must return an <code>Access-Control-Allow-Origin: *</code> header.</li>
                <li>Local APIs (e.g., <code>http://localhost:3000</code>) usually require enabling CORS headers in middleware like express, fastify, or Spring.</li>
                <li>If calling restricted production APIs, use the <strong>Manual Compare</strong> tab by pasting the response from Postman or terminal curl.</li>
              </ul>
              
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 font-mono text-[11px]">
                <strong className="text-slate-300 block mb-1">Public CORS-enabled APIs to test right now:</strong>
                <p className="text-indigo-400 cursor-pointer" onClick={() => { setApiUrl('https://jsonplaceholder.typicode.com/todos/1'); setCorsModalOpen(false); }}>
                  → https://jsonplaceholder.typicode.com/todos/1
                </p>
                <p className="text-indigo-400 cursor-pointer mt-1" onClick={() => { setApiUrl('https://dummyjson.com/products/1'); setCorsModalOpen(false); }}>
                  → https://dummyjson.com/products/1
                </p>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setCorsModalOpen(false)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-medium"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: SAVE BASELINE */}
      {saveBaselineModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-indigo-400">
                <Save className="w-5 h-5" />
                <h3 className="font-bold text-white text-sm">Save Baseline Snapshot</h3>
              </div>
              <button onClick={() => setSaveBaselineModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Baselines are persisted in browser <code>localStorage</code>. Checking for changes will test against this snapshot without overriding it until you confirm.
            </p>

            <div className="space-y-1.5">
              <label className="text-[11px] font-mono uppercase text-slate-300">Baseline Name</label>
              <input
                type="text"
                placeholder="e.g. Users API v2.1 Staging"
                value={baselineNameInput}
                onChange={(e) => setBaselineNameInput(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="p-3 rounded-lg bg-amber-950/20 border border-amber-800/30 text-[11px] text-amber-300">
              Note: Do not store production passwords or secret tokens in browser storage.
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setSaveBaselineModalOpen(false)}
                className="px-3 py-1.5 rounded-lg border border-slate-800 text-xs text-slate-400 hover:text-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveBaselineConfirm}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium"
              >
                Save to Storage
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DRAWER: SAVED BASELINES */}
      {isBaselinesDrawerOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-end">
          <div className="bg-slate-900 border-l border-slate-800 w-full max-w-md h-full flex flex-col p-6 space-y-4 shadow-2xl animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-indigo-400" />
                <h3 className="font-bold text-white text-sm">Saved Baselines ({savedBaselines.length})</h3>
              </div>
              <button onClick={() => setIsBaselinesDrawerOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Select any saved baseline to load its response into the comparison workspace.
            </p>

            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
              {savedBaselines.length === 0 ? (
                <div className="py-12 text-center text-slate-500 font-mono text-xs">
                  No saved baselines found in browser storage.
                </div>
              ) : (
                savedBaselines.map((bl) => (
                  <div
                    key={bl.id}
                    onClick={() => handleSelectBaseline(bl)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      activeBaselineRecord?.id === bl.id
                        ? 'border-indigo-500 bg-indigo-950/20'
                        : 'border-slate-800 bg-slate-950/50 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <strong className="text-xs font-semibold text-slate-200 block">{bl.name}</strong>
                        {bl.endpoint && (
                          <span className="text-[10px] font-mono text-indigo-400 block truncate max-w-xs">
                            [{bl.method || 'GET'}] {bl.endpoint}
                          </span>
                        )}
                        <span className="text-[10px] text-slate-500 block mt-1">
                          Saved: {new Date(bl.updatedAt).toLocaleString()}
                        </span>
                      </div>
                      <button
                        onClick={(e) => handleDeleteBaseline(bl.id, e)}
                        className="text-slate-500 hover:text-rose-400 p-1 rounded"
                        title="Delete baseline"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-3 border-t border-slate-800 text-[11px] text-slate-500">
              Stored locally on this device. Clearing browser cache will remove these records.
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// ==========================================
// 6. HELPER SUB-COMPONENTS
// ==========================================

function DiffTreeRow({ diff, onCopyToast }) {
  const [expanded, setExpanded] = useState(true);

  const getBadge = (type) => {
    switch (type) {
      case CHANGE_TYPES.TYPE_CHANGED:
        return 'bg-violet-500/20 text-violet-300 border-violet-500/30';
      case CHANGE_TYPES.REMOVED:
        return 'bg-rose-500/20 text-rose-300 border-rose-500/30';
      case CHANGE_TYPES.MODIFIED:
        return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      case CHANGE_TYPES.ADDED:
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
      default:
        return 'bg-slate-800 text-slate-300';
    }
  };

  const handleCopyPath = () => {
    navigator.clipboard.writeText(diff.path);
    onCopyToast(`Copied path: ${diff.path}`, 'info');
  };

  return (
    <div className="border border-slate-800/80 rounded-xl bg-slate-950/40 p-3 text-xs font-mono">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-slate-500 hover:text-slate-300 transition-colors"
          >
            {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>

          <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded border ${getBadge(diff.type)}`}>
            {diff.type.replace('_', ' ')}
          </span>

          <span className="font-semibold text-slate-200 truncate" title={diff.path}>
            {diff.path}
          </span>
        </div>

        <button
          onClick={handleCopyPath}
          className="text-slate-500 hover:text-slate-300 p-1 rounded transition-colors flex items-center gap-1 text-[11px]"
          title="Copy path"
        >
          <Copy className="w-3.5 h-3.5" />
        </button>
      </div>

      {diff.isRisk && (
        <div className="mt-2 text-[11px] font-sans text-rose-300 bg-rose-950/30 border border-rose-900/40 px-2.5 py-1 rounded flex items-center gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
          <span>{diff.riskReason}</span>
        </div>
      )}

      {expanded && (
        <div className="mt-2.5 grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-900">
          {diff.type !== CHANGE_TYPES.ADDED && (
            <div className="p-2 rounded bg-rose-950/20 border border-rose-900/20">
              <span className="block text-[10px] font-sans font-bold uppercase text-rose-400 mb-0.5">
                Baseline Value ({diff.oldType})
              </span>
              <pre className="text-slate-300 whitespace-pre-wrap break-all text-[11px]">
                {diff.oldValue === undefined ? 'undefined' : JSON.stringify(diff.oldValue, null, 2)}
              </pre>
            </div>
          )}

          {diff.type !== CHANGE_TYPES.REMOVED && (
            <div className="p-2 rounded bg-emerald-950/20 border border-emerald-900/20">
              <span className="block text-[10px] font-sans font-bold uppercase text-emerald-400 mb-0.5">
                Latest Value ({diff.newType})
              </span>
              <pre className="text-slate-300 whitespace-pre-wrap break-all text-[11px]">
                {diff.newValue === undefined ? 'undefined' : JSON.stringify(diff.newValue, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function RuleInput({ onAdd }) {
  const [val, setVal] = useState('');

  const submit = (e) => {
    e.preventDefault();
    if (val.trim()) {
      onAdd(val.trim());
      setVal('');
    }
  };

  return (
    <form onSubmit={submit} className="flex items-center gap-1">
      <input
        type="text"
        placeholder="Add pattern (e.g. $.traceId)"
        value={val}
        onChange={(e) => setVal(e.target.value)}
        className="px-2 py-0.5 text-xs font-mono bg-slate-950 border border-slate-800 rounded text-slate-300 focus:outline-none focus:border-indigo-500 w-44"
      />
      <button
        type="submit"
        className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
        title="Add rule"
      >
        <Plus className="w-3 h-3" />
      </button>
    </form>
  );
}