import React, { useState, useEffect, useMemo } from 'react';
import { ToastContainer } from './components/common/Toast';
import { Header } from './components/layout/Header';
import { SubHeader } from './components/layout/SubHeader';
import { Footer } from './components/layout/Footer';
import { ApiTester } from './components/api-tester/ApiTester';
import { JsonEditor } from './components/editors/JsonEditor';
import { IgnoreRules } from './components/rules/IgnoreRules';
import { DiffTreeRow } from './components/diff/DiffTreeRow';
import { SAMPLE_BASELINE, SAMPLE_UPDATED, CHANGE_TYPES } from './constants/sampleData';
import { compareJson, safeParse, extractJsonKeys } from './utils/diffEngine';
import { ArrowLeftRight, Play, X, ShieldCheck, Search, ListTree, Split, Copy, Download, Database, Save } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('manual');
  const [baselineInput, setBaselineInput] = useState(SAMPLE_BASELINE);
  const [latestInput, setLatestInput] = useState(SAMPLE_UPDATED);
  const [ignoreRules, setIgnoreRules] = useState(['$.updatedAt', 'requestId']);

  const [apiUrl, setApiUrl] = useState('https://jsonplaceholder.typicode.com/todos/1');
  const [apiMethod, setApiMethod] = useState('GET');
  const [queryParams, setQueryParams] = useState([{ key: '', value: '', enabled: true }]);
  const [headers, setHeaders] = useState([{ key: 'Accept', value: 'application/json', enabled: true }]);
  const [reqBody, setReqBody] = useState('{\n  "title": "foo",\n  "completed": false\n}');

  const [isFetching, setIsFetching] = useState(false);
  const [apiResponseMeta, setApiResponseMeta] = useState(null);
  const [corsModalOpen, setCorsModalOpen] = useState(false);
  const [activeBaselineRecord, setActiveBaselineRecord] = useState(null);
  const [savedBaselines, setSavedBaselines] = useState(() => {
    try { return JSON.parse(localStorage.getItem('apidiff_saved_baselines') || '[]'); }
    catch { return []; }
  });

  const [isBaselinesDrawerOpen, setIsBaselinesDrawerOpen] = useState(false);
  const [baselineNameInput, setBaselineNameInput] = useState('');
  const [saveBaselineModalOpen, setSaveBaselineModalOpen] = useState(false);
  const [activeDiffFilter, setActiveDiffFilter] = useState('all');
  const [diffSearchQuery, setDiffSearchQuery] = useState('');
  const [diffViewMode, setDiffViewMode] = useState('tree');
  const [hasRunDiff, setHasRunDiff] = useState(true);
  const [toasts, setToasts] = useState([]);

  const addToast = (message, type = 'info') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  };

  useEffect(() => { localStorage.setItem('apidiff_saved_baselines', JSON.stringify(savedBaselines)); }, [savedBaselines]);

  const baselineParseResult = useMemo(() => safeParse(baselineInput), [baselineInput]);
  const latestParseResult = useMemo(() => safeParse(latestInput), [latestInput]);

  const differences = useMemo(() => {
    if (!hasRunDiff) return [];
    if (!baselineParseResult.data || !latestParseResult.data) return [];
    return compareJson(baselineParseResult.data, latestParseResult.data, ignoreRules);
  }, [hasRunDiff, baselineParseResult.data, latestParseResult.data, ignoreRules]);

  const stats = useMemo(() => ({
    total: differences.length,
    typeChanged: differences.filter((d) => d.type === CHANGE_TYPES.TYPE_CHANGED).length,
    removed: differences.filter((d) => d.type === CHANGE_TYPES.REMOVED).length,
    modified: differences.filter((d) => d.type === CHANGE_TYPES.MODIFIED).length,
    added: differences.filter((d) => d.type === CHANGE_TYPES.ADDED).length,
    riskCount: differences.filter((d) => d.isRisk).length
  }), [differences]);

  const filteredDifferences = useMemo(() => differences.filter((item) => {
    const matchType = activeDiffFilter === 'all' || item.type === activeDiffFilter;
    const matchQuery = !diffSearchQuery || item.path.toLowerCase().includes(diffSearchQuery.toLowerCase()) || String(item.oldValue).toLowerCase().includes(diffSearchQuery.toLowerCase()) || String(item.newValue).toLowerCase().includes(diffSearchQuery.toLowerCase());
    return matchType && matchQuery;
  }), [differences, activeDiffFilter, diffSearchQuery]);

  // Auto-extract every JSON key path from the current payloads so users can
  // toggle them as ignore rules without guessing the exact path.
  const availableKeys = useMemo(() => {
    const merged = new Set();
    if (baselineParseResult.data) extractJsonKeys(baselineParseResult.data).forEach((k) => merged.add(k));
    if (latestParseResult.data) extractJsonKeys(latestParseResult.data).forEach((k) => merged.add(k));
    return Array.from(merged).sort();
  }, [baselineParseResult.data, latestParseResult.data]);

  const executeApiRequest = async () => {
    if (!apiUrl.trim()) { addToast('Please specify a valid API URL.', 'error'); return; }
    setIsFetching(true); setApiResponseMeta(null);

    let finalUrl = apiUrl.trim();
    const activeParams = queryParams.filter((p) => p.enabled && p.key.trim());
    if (activeParams.length > 0) {
      try {
        const urlObj = new URL(finalUrl);
        activeParams.forEach((p) => urlObj.searchParams.append(p.key.trim(), p.value.trim()));
        finalUrl = urlObj.toString();
      } catch {
        finalUrl += (finalUrl.includes('?') ? '&' : '?') + activeParams.map((p) => `${encodeURIComponent(p.key.trim())}=${encodeURIComponent(p.value.trim())}`).join('&');
      }
    }

    const reqHeaders = {};
    headers.forEach((h) => { if (h.enabled && h.key.trim()) reqHeaders[h.key.trim()] = h.value.trim(); });

    const options = { method: apiMethod, headers: reqHeaders };
    if (['POST', 'PUT', 'PATCH'].includes(apiMethod) && reqBody.trim()) {
      options.body = reqBody;
      if (!reqHeaders['Content-Type']) options.headers['Content-Type'] = 'application/json';
    }

    const startTime = performance.now();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    try {
      const res = await fetch(finalUrl, { ...options, signal: controller.signal });
      clearTimeout(timeoutId);
      const elapsed = Math.round(performance.now() - startTime);
      const bodyText = await res.text();
      let formattedJson = bodyText;
      try { formattedJson = JSON.stringify(JSON.parse(bodyText), null, 2); } catch {}

      setApiResponseMeta({
        status: res.status,
        statusText: res.statusText || (res.ok ? 'OK' : 'Error'),
        timeMs: elapsed,
        timestamp: new Date().toLocaleTimeString(),
        isJson: res.headers.get('content-type')?.includes('application/json')
      });
      setLatestInput(formattedJson);
      setHasRunDiff(true);
      if (!activeBaselineRecord && !baselineInput.trim()) { setBaselineInput(formattedJson); addToast('Initial successful response saved as temporary Baseline.', 'info'); }
      else addToast(`Response received in ${elapsed}ms (${res.status} ${res.statusText})`, 'success');
    } catch (err) {
      clearTimeout(timeoutId);
      setApiResponseMeta({ status: 0, statusText: 'Failed', timeMs: Math.round(performance.now() - startTime), timestamp: new Date().toLocaleTimeString(), error: err.name === 'AbortError' ? 'Request timed out.' : 'Network error.' });
      addToast(err.message, 'error');
    } finally { setIsFetching(false); }
  };

  const handleSaveBaselineConfirm = () => {
    if (!baselineInput.trim() || baselineParseResult.error) { addToast('Cannot save invalid baseline.', 'error'); return; }
    const name = baselineNameInput.trim() || `Baseline: ${activeTab === 'api' ? apiUrl : 'Manual'}`;
    const newRecord = { id: 'bl_' + Date.now(), name, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), mode: activeTab, endpoint: activeTab === 'api' ? apiUrl : null, method: activeTab === 'api' ? apiMethod : null, payload: baselineInput };
    setSavedBaselines((prev) => [newRecord, ...prev]);
    setActiveBaselineRecord(newRecord);
    setSaveBaselineModalOpen(false);
    setBaselineNameInput('');
    addToast(`Baseline "${name}" saved.`, 'success');
  };

  const handleUpdateActiveBaseline = () => {
    if (!activeBaselineRecord || latestParseResult.error || !latestInput.trim()) return;
    setSavedBaselines((prev) => prev.map((bl) => bl.id === activeBaselineRecord.id ? { ...bl, payload: latestInput, updatedAt: new Date().toISOString() } : bl));
    setBaselineInput(latestInput);
    setActiveBaselineRecord({ ...activeBaselineRecord, payload: latestInput, updatedAt: new Date().toISOString() });
    addToast('Baseline updated.', 'success');
  };

  const handleSwap = () => {
    const temp = baselineInput;
    setBaselineInput(latestInput);
    setLatestInput(temp);
    setHasRunDiff(true);
    addToast('Inputs swapped.', 'info');
  };

  const handleLoadSample = () => {
    setBaselineInput(SAMPLE_BASELINE);
    setLatestInput(SAMPLE_UPDATED);
    setHasRunDiff(true);
    setActiveBaselineRecord(null);
    addToast('Sample dataset loaded.', 'success');
  };

  return (
    <div className="min-h-screen flex flex-col font-sans transition-colors duration-200 bg-app text-primary">
      <ToastContainer toasts={toasts} />
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        savedBaselines={savedBaselines}
        setIsBaselinesDrawerOpen={setIsBaselinesDrawerOpen}
      />
      <SubHeader
        activeBaselineRecord={activeBaselineRecord}
        handleLoadSample={handleLoadSample}
        setSaveBaselineModalOpen={setSaveBaselineModalOpen}
        handleUpdateActiveBaseline={handleUpdateActiveBaseline}
        activeTab={activeTab}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {activeTab === 'api' && (
          <ApiTester
            apiUrl={apiUrl} setApiUrl={setApiUrl} apiMethod={apiMethod} setApiMethod={setApiMethod}
            queryParams={queryParams} setQueryParams={setQueryParams}
            headers={headers} setHeaders={setHeaders}
            reqBody={reqBody} setReqBody={setReqBody}
            isFetching={isFetching} executeApiRequest={executeApiRequest}
            apiResponseMeta={apiResponseMeta} setCorsModalOpen={setCorsModalOpen}
          />
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <JsonEditor title="Known-Good Baseline Response" colorDot="bg-indigo-500" value={baselineInput} onChange={(v) => {setBaselineInput(v); setHasRunDiff(true);}} onClear={() => setBaselineInput('')} onPaste={async () => { try { setBaselineInput(await navigator.clipboard.readText()); } catch {} }} parseResult={baselineParseResult} placeholder="Paste known-good baseline JSON..." />
          <JsonEditor title="Latest Response (Deploy / Test)" colorDot="bg-cyan-400" value={latestInput} onChange={(v) => {setLatestInput(v); setHasRunDiff(true);}} onClear={() => setLatestInput('')} onPaste={async () => { try { setLatestInput(await navigator.clipboard.readText()); } catch {} }} parseResult={latestParseResult} placeholder="Paste updated API response..." />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button onClick={handleSwap} className="px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-mono flex items-center gap-1.5 transition-colors">
              <ArrowLeftRight className="w-3.5 h-3.5" /> Swap Baseline & Latest
            </button>
            <button onClick={() => { setBaselineInput(''); setLatestInput(''); }} className="px-3 py-1.5 rounded-lg border border-slate-800 text-slate-400 hover:text-rose-400 hover:bg-slate-900 text-xs transition-colors">Clear Both</button>
          </div>
          <button onClick={() => { setHasRunDiff(true); addToast('Differences re-computed.', 'info'); }} className="px-6 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs flex items-center gap-2 transition-all shadow-md shadow-indigo-600/20">
            <Play className="w-3.5 h-3.5 fill-current" /> Re-Compare Diff
          </button>
        </div>

        <IgnoreRules ignoreRules={ignoreRules} setIgnoreRules={setIgnoreRules} availableKeys={availableKeys} />

        <div className="border border-slate-800 rounded-3xl bg-slate-900/40 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-950 rounded-lg border border-slate-800 text-xs">
              <button onClick={() => setActiveDiffFilter('all')} className={`px-2.5 py-1 rounded font-medium ${activeDiffFilter === 'all' ? 'bg-slate-800 text-white' : 'text-slate-400'}`}>All ({stats.total})</button>
              <button onClick={() => setActiveDiffFilter(CHANGE_TYPES.TYPE_CHANGED)} className={`px-2.5 py-1 rounded font-medium ${activeDiffFilter === CHANGE_TYPES.TYPE_CHANGED ? 'bg-type-changed-bg text-type-changed' : 'text-slate-400'}`}>Type Changes ({stats.typeChanged})</button>
              <button onClick={() => setActiveDiffFilter(CHANGE_TYPES.REMOVED)} className={`px-2.5 py-1 rounded font-medium ${activeDiffFilter === CHANGE_TYPES.REMOVED ? 'bg-removed-bg text-removed' : 'text-slate-400'}`}>Removed ({stats.removed})</button>
              <button onClick={() => setActiveDiffFilter(CHANGE_TYPES.MODIFIED)} className={`px-2.5 py-1 rounded font-medium ${activeDiffFilter === CHANGE_TYPES.MODIFIED ? 'bg-modified-bg text-modified' : 'text-slate-400'}`}>Modified ({stats.modified})</button>
              <button onClick={() => setActiveDiffFilter(CHANGE_TYPES.ADDED)} className={`px-2.5 py-1 rounded font-medium ${activeDiffFilter === CHANGE_TYPES.ADDED ? 'bg-added-bg text-added' : 'text-slate-400'}`}>Added ({stats.added})</button>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative flex-1 sm:w-56">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input type="text" placeholder="Search..." value={diffSearchQuery} onChange={(e) => setDiffSearchQuery(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-indigo-500" />
              </div>
              <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-0.5">
                <button onClick={() => setDiffViewMode('tree')} className={`p-1.5 rounded ${diffViewMode === 'tree' ? 'bg-slate-800 text-white' : 'text-slate-400'}`}><ListTree className="w-3.5 h-3.5" /></button>
                <button onClick={() => setDiffViewMode('sideBySide')} className={`p-1.5 rounded ${diffViewMode === 'sideBySide' ? 'bg-slate-800 text-white' : 'text-slate-400'}`}><Split className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          </div>

          <div className="p-4 space-y-2">
            {filteredDifferences.map((diff, idx) => (
              <DiffTreeRow key={diff.path + idx} diff={diff} onCopyToast={addToast} />
            ))}
          </div>
        </div>
      </main>

      {/* Save Baseline Modal */}
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

      {/* Baselines Drawer */}
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
                    onClick={() => {
                      setActiveBaselineRecord(bl);
                      setBaselineInput(bl.payload);
                      if (bl.endpoint) {
                        setApiUrl(bl.endpoint);
                        if (bl.method) setApiMethod(bl.method);
                      }
                      setIsBaselinesDrawerOpen(false);
                      setHasRunDiff(true);
                      addToast(`Loaded baseline "${bl.name}"`, 'info');
                    }}
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
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
