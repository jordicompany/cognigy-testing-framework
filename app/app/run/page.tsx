"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Play,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  ChevronDown,
  ChevronUp,
  PlayCircle,
  BarChart2,
  Search,
} from "lucide-react";
import { loadCognigyConfig } from "@/lib/store";
import {
  fetchSimulations,
  fetchSimulationsPage,
  scheduleSimulation,
  fetchLLMModels,
  fetchFlows,
  fetchLocales,
} from "@/lib/cognigy";
import { CognigySimulation, LLMModel, RunConfig } from "@/lib/types";

interface RunState {
  [id: string]: "idle" | "scheduling" | "scheduled" | "error";
}

const PAGE_SIZE = 25;

export default function RunPage() {
  const router = useRouter();
  const [simulations, setSimulations] = useState<CognigySimulation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [runStates, setRunStates] = useState<RunState>({});
  const [runningAll, setRunningAll] = useState(false);
  const [showConfig, setShowConfig] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [anyScheduled, setAnyScheduled] = useState(false);

  // Run config
  const [flows, setFlows] = useState<{ _id: string; name: string }[]>([]);
  const [locales, setLocales] = useState<{ _id: string; name: string }[]>([]);
  const [llmModels, setLlmModels] = useState<LLMModel[]>([]);
  const [flowId, setFlowId] = useState("");
  const [localeId, setLocaleId] = useState("");
  const [llmId, setLlmId] = useState("");
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [mounted, setMounted] = useState(false);

  const cog = mounted ? loadCognigyConfig() : null;

  const load = useCallback(async (pageNum = 0) => {
    const config = loadCognigyConfig();
    if (!config?.baseUrl || !config?.apiKey || !config?.projectId) return;
    setLoading(true);
    setError("");
    try {
      const result = await fetchSimulationsPage(
        config.baseUrl,
        config.apiKey,
        config.projectId,
        pageNum,
        PAGE_SIZE
      );
      setSimulations(result.items);
      setTotal(result.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load simulations");
    } finally {
      setLoading(false);
    }
  }, []);

  async function loadRunConfig() {
    const config = loadCognigyConfig();
    if (!config?.baseUrl || !config?.apiKey || !config?.projectId) return;
    setLoadingConfig(true);
    try {
      const [f, l, m] = await Promise.all([
        fetchFlows(config.baseUrl, config.apiKey, config.projectId),
        fetchLocales(config.baseUrl, config.apiKey, config.projectId),
        fetchLLMModels(config.baseUrl, config.apiKey, config.projectId),
      ]);
      setFlows(f);
      setLocales(l);
      setLlmModels(m);
      if (f.length > 0) setFlowId(f[0]._id);
      if (l.length > 0) setLocaleId(l[0]._id);
      if (m.length > 0) setLlmId(m[0]._id);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingConfig(false);
    }
  }

  useEffect(() => {
    setMounted(true);
    load(0);
    loadRunConfig();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function selectAll() {
    setSelected(new Set(filtered.map((s) => s._id)));
  }

  function deselectAll() {
    setSelected(new Set());
  }

  const runConfig: RunConfig = {
    flowReferenceId: flowId,
    localeReferenceId: localeId,
    largeLanguageModelReferenceId: llmId,
  };

  async function runSimulation(sim: CognigySimulation) {
    const config = loadCognigyConfig();
    if (!config) return;
    setRunStates((prev) => ({ ...prev, [sim._id]: "scheduling" }));
    try {
      await scheduleSimulation(config.baseUrl, config.apiKey, sim._id, sim.name, config.projectId, runConfig);
      setRunStates((prev) => ({ ...prev, [sim._id]: "scheduled" }));
      setAnyScheduled(true);
    } catch (e) {
      console.error(e);
      setRunStates((prev) => ({ ...prev, [sim._id]: "error" }));
    }
  }

  async function runSelected() {
    const config = loadCognigyConfig();
    if (!config || selected.size === 0) return;
    setRunningAll(true);
    const toRun = filtered.filter((s) => selected.has(s._id));
    for (const sim of toRun) {
      await runSimulation(sim);
    }
    setRunningAll(false);
  }

  function changePage(next: number) {
    setPage(next);
    load(next);
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const filtered = simulations.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase())
  );

  if (!mounted) return null;

  if (!cog?.projectId) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-amber-800 text-sm">
        Configure Cognigy settings first before running tests.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Run Tests</h1>
          <p className="text-sm text-gray-500 mt-1">
            Select simulators, configure the flow and model, then trigger runs.
          </p>
        </div>
        {anyScheduled && (
          <button
            onClick={() => router.push("/results")}
            className="btn-secondary flex items-center gap-2 text-indigo-600 border-indigo-200"
          >
            <BarChart2 className="w-4 h-4" />
            View Results
          </button>
        )}
      </div>

      {/* Run Config */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <button
          onClick={() => setShowConfig((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          <span className="flex items-center gap-2">
            <Play className="w-4 h-4 text-indigo-500" />
            Run Configuration
            {flowId && localeId && llmId && (
              <span className="text-xs text-green-600 flex items-center gap-0.5">
                <CheckCircle className="w-3 h-3" /> Ready
              </span>
            )}
          </span>
          {showConfig ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showConfig && (
          <div className="border-t border-gray-100 px-4 py-4 space-y-4 bg-gray-50">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <ConfigSelect label="Flow" value={flowId} onChange={setFlowId} options={flows} loading={loadingConfig} />
              <ConfigSelect label="Locale" value={localeId} onChange={setLocaleId} options={locales} loading={loadingConfig} />
              <ConfigSelect label="LLM Model" value={llmId} onChange={setLlmId} options={llmModels} loading={loadingConfig} />
            </div>
            <button onClick={loadRunConfig} disabled={loadingConfig} className="btn-secondary flex items-center gap-1.5 text-xs">
              <RefreshCw className={`w-3.5 h-3.5 ${loadingConfig ? "animate-spin" : ""}`} />
              Reload Options
            </button>
          </div>
        )}
      </div>

      {/* Simulator list */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b gap-3">
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-sm font-medium text-gray-700">{total} simulators</span>
            <button onClick={selectAll} className="text-xs text-indigo-600 hover:underline">All</button>
            <button onClick={deselectAll} className="text-xs text-gray-500 hover:underline">None</button>
          </div>

          {/* Search */}
          <div className="relative flex-1 max-w-xs">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter by name…"
              className="input pl-8 py-1 text-xs"
            />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button onClick={() => load(page)} disabled={loading} className="btn-secondary text-xs flex items-center gap-1.5 py-1">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
            <button
              onClick={runSelected}
              disabled={selected.size === 0 || runningAll || !flowId || !localeId || !llmId}
              className="btn-primary text-xs flex items-center gap-1.5 py-1 px-3"
            >
              {runningAll ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <PlayCircle className="w-3.5 h-3.5" />}
              Run Selected ({selected.size})
            </button>
          </div>
        </div>

        {error && (
          <div className="px-4 py-3 text-sm text-red-600 flex items-center gap-2 border-b">
            <XCircle className="w-4 h-4" /> {error}
          </div>
        )}

        {loading && simulations.length === 0 && (
          <div className="px-4 py-8 text-center text-gray-500 text-sm flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading simulators…
          </div>
        )}

        {!loading && simulations.length === 0 && !error && (
          <div className="px-4 py-8 text-center text-gray-400 text-sm">
            No simulators found. Create some first.
          </div>
        )}

        {!loading && simulations.length > 0 && filtered.length === 0 && (
          <div className="px-4 py-8 text-center text-gray-400 text-sm">
            No simulators match &quot;{search}&quot;.
          </div>
        )}

        <div className="divide-y divide-gray-100">
          {filtered.map((sim) => {
            const runState = runStates[sim._id] ?? "idle";
            const isChecked = selected.has(sim._id);
            return (
              <div key={sim._id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50">
                <input type="checkbox" checked={isChecked} onChange={() => toggleSelect(sim._id)} className="accent-indigo-600" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{sim.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Created {new Date(sim.createdAt).toLocaleDateString()}
                    <span className="ml-2 font-mono">{sim._id}</span>
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <RunStatusBadge state={runState} lastResult={sim.lastResult} />
                  <button
                    onClick={() => runSimulation(sim)}
                    disabled={runState === "scheduling" || !flowId || !localeId || !llmId}
                    className="btn-secondary text-xs py-1 px-2 flex items-center gap-1"
                  >
                    {runState === "scheduling" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                    Run
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50 text-sm">
            <span className="text-gray-500">
              Page {page + 1} of {totalPages} ({total} total)
            </span>
            <div className="flex gap-2">
              <button onClick={() => changePage(page - 1)} disabled={page === 0} className="btn-secondary py-1 px-3 text-xs">
                Previous
              </button>
              <button onClick={() => changePage(page + 1)} disabled={page >= totalPages - 1} className="btn-secondary py-1 px-3 text-xs">
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function RunStatusBadge({ state, lastResult }: { state: string; lastResult?: CognigySimulation["lastResult"] }) {
  if (state === "scheduling") return <span className="text-xs text-indigo-600 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Scheduling</span>;
  if (state === "scheduled") return <span className="text-xs text-green-600 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Scheduled</span>;
  if (state === "error") return <span className="text-xs text-red-500 flex items-center gap-1"><XCircle className="w-3 h-3" /> Error</span>;
  if (lastResult) {
    const { status } = lastResult;
    if (status === "success") return <span className="text-xs text-green-600 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Passed</span>;
    if (status === "failure") return <span className="text-xs text-red-500 flex items-center gap-1"><XCircle className="w-3 h-3" /> Failed</span>;
    if (status === "running") return <span className="text-xs text-indigo-500 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Running</span>;
  }
  return <span className="text-xs text-gray-400 flex items-center gap-1"><Clock className="w-3 h-3" /> —</span>;
}

function ConfigSelect({ label, value, onChange, options, loading }: {
  label: string; value: string; onChange: (v: string) => void;
  options: { _id: string; name: string }[]; loading: boolean;
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-gray-600">{label}</label>
      {loading ? (
        <div className="input flex items-center gap-2 text-gray-400"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading…</div>
      ) : (
        <select value={value} onChange={(e) => onChange(e.target.value)} className="input">
          <option value="">Select {label}</option>
          {options.map((o) => <option key={o._id} value={o._id}>{o.name}</option>)}
        </select>
      )}
    </div>
  );
}
