"use client";

import { useEffect, useRef, useState } from "react";
import {
  RefreshCw,
  CheckCircle,
  XCircle,
  Loader2,
  Clock,
  ChevronDown,
  ChevronUp,
  Download,
  MessageSquare,
} from "lucide-react";
import { loadCognigyConfig } from "@/lib/store";
import { fetchBatches, fetchBatchTranscript } from "@/lib/cognigy";
import { SimulationBatch, ConversationTurn } from "@/lib/types";

const PAGE_SIZE = 20;
const POLL_INTERVAL = 5000;

export default function ResultsPage() {
  const [mounted, setMounted] = useState(false);
  const [batches, setBatches] = useState<SimulationBatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [transcripts, setTranscripts] = useState<Record<string, ConversationTurn[] | "loading" | "error">>({});
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function load(pageNum = 0, silent = false) {
    const config = loadCognigyConfig();
    if (!config?.baseUrl || !config?.apiKey || !config?.projectId) return;
    if (!silent) setLoading(true);
    setError("");
    try {
      const all = await fetchBatches(config.baseUrl, config.apiKey, config.projectId);
      // Client-side pagination since the batches endpoint doesn't paginate
      setTotal(all.length);
      const start = pageNum * PAGE_SIZE;
      setBatches(all.slice(start, start + PAGE_SIZE));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load results");
    } finally {
      if (!silent) setLoading(false);
    }
  }

  function startPolling() {
    if (pollRef.current) return;
    pollRef.current = setInterval(() => {
      // Check if any batch is still running before polling
      setBatches((current) => {
        const hasActive = current.some((b) => b.status === "RUNNING" || b.status === "PENDING");
        if (!hasActive) {
          stopPolling();
        } else {
          load(page, true);
        }
        return current;
      });
    }, POLL_INTERVAL);
  }

  function stopPolling() {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }

  useEffect(() => {
    setMounted(true);
    load(0);
    return () => stopPolling();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Start polling whenever there are active batches
  useEffect(() => {
    const hasActive = batches.some((b) => b.status === "RUNNING" || b.status === "PENDING");
    if (hasActive) {
      startPolling();
    } else {
      stopPolling();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batches]);

  async function loadTranscript(batchId: string) {
    const config = loadCognigyConfig();
    if (!config) return;
    setTranscripts((prev) => ({ ...prev, [batchId]: "loading" }));
    try {
      const turns = await fetchBatchTranscript(config.baseUrl, config.apiKey, batchId);
      setTranscripts((prev) => ({ ...prev, [batchId]: turns }));
    } catch {
      setTranscripts((prev) => ({ ...prev, [batchId]: "error" }));
    }
  }

  function toggleExpand(id: string) {
    if (expandedId === id) {
      setExpandedId(null);
    } else {
      setExpandedId(id);
      if (!transcripts[id]) loadTranscript(id);
    }
  }

  function changePage(next: number) {
    setPage(next);
    load(next);
  }

  function exportCSV() {
    const rows = [
      ["Name", "Persona", "Status", "Passed", "Failed", "Avg Turns", "Sentiment", "Success Rate %", "Created"],
    ];
    batches.forEach((b) => {
      const m = b.batchMetrics;
      rows.push([
        b.name,
        b.simulationFrozen?.personaName ?? "",
        b.status,
        String(m?.runResults?.succeeded ?? 0),
        String(m?.runResults?.failed ?? 0),
        String(m?.averageTurns ?? ""),
        m?.averageSentiment ?? "",
        String(m?.averageSuccessRateForRuns?.percentage ?? ""),
        formatDate(b.createdAt),
      ]);
    });
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cognigy-results-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!mounted) return null;

  const cog = loadCognigyConfig();
  if (!cog?.projectId) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-amber-800 text-sm">
        Configure Cognigy settings first.
      </div>
    );
  }

  const succeeded = batches.filter((b) => (b.batchMetrics?.runResults?.succeeded ?? 0) > 0 && (b.batchMetrics?.runResults?.failed ?? 0) === 0).length;
  const failed = batches.filter((b) => (b.batchMetrics?.runResults?.failed ?? 0) > 0).length;
  const active = batches.filter((b) => b.status === "RUNNING" || b.status === "PENDING").length;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Results</h1>
          <p className="text-sm text-gray-500 mt-1">
            Test run history.
            {active > 0 && (
              <span className="ml-2 text-indigo-600 inline-flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" />
                {active} running — auto-refreshing
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {batches.length > 0 && (
            <button onClick={exportCSV} className="btn-secondary flex items-center gap-2 text-xs">
              <Download className="w-3.5 h-3.5" /> Export CSV
            </button>
          )}
          <button onClick={() => load(page)} disabled={loading} className="btn-secondary flex items-center gap-2">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {batches.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <SummaryCard label="Total Runs" value={total} color="gray" />
          <SummaryCard label="Passed" value={succeeded} color="green" />
          <SummaryCard label="Failed" value={failed} color="red" />
          <SummaryCard label="Active" value={active} color="indigo" />
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 flex items-center gap-2">
          <XCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      {loading && batches.length === 0 && (
        <div className="flex items-center justify-center py-12 text-gray-400 gap-2 text-sm">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading results…
        </div>
      )}

      {!loading && batches.length === 0 && !error && (
        <div className="text-center py-12 text-gray-400 text-sm">
          No results yet. Run some simulators first.
        </div>
      )}

      <div className="space-y-3">
        {batches.map((batch) => (
          <BatchCard
            key={batch._id}
            batch={batch}
            expanded={expandedId === batch._id}
            onToggle={() => toggleExpand(batch._id)}
            transcript={transcripts[batch._id]}
          />
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">Page {page + 1} of {totalPages} ({total} total)</span>
          <div className="flex gap-2">
            <button onClick={() => changePage(page - 1)} disabled={page === 0} className="btn-secondary py-1 px-3 text-xs">Previous</button>
            <button onClick={() => changePage(page + 1)} disabled={page >= totalPages - 1} className="btn-secondary py-1 px-3 text-xs">Next</button>
          </div>
        </div>
      )}
    </div>
  );
}

function BatchCard({
  batch,
  expanded,
  onToggle,
  transcript,
}: {
  batch: SimulationBatch;
  expanded: boolean;
  onToggle: () => void;
  transcript?: ConversationTurn[] | "loading" | "error";
}) {
  const metrics = batch.batchMetrics;
  const passed = metrics?.runResults?.succeeded ?? 0;
  const failed = metrics?.runResults?.failed ?? 0;
  const total = passed + failed;
  const successPct = total > 0 ? Math.round((passed / total) * 100) : 0;
  const overall = failed > 0 ? "failed" : batch.status === "COMPLETED" ? "passed" : batch.status;

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <button onClick={onToggle} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-left">
        <StatusIcon status={overall} batchStatus={batch.status} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">{batch.name}</p>
          <p className="text-xs text-gray-400 mt-0.5">
            {batch.simulationFrozen?.personaName && <span className="mr-2">Persona: {batch.simulationFrozen.personaName}</span>}
            {formatDate(batch.createdAt)}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {batch.status === "COMPLETED" && (
            <>
              <Pill label={`${passed}/${total} passed`} color={failed > 0 ? "red" : "green"} />
              <Pill label={`${metrics?.averageTurns ?? 0} turns`} color="gray" />
              {metrics?.averageSentiment && <Pill label={metrics.averageSentiment} color="blue" />}
            </>
          )}
          {batch.status === "RUNNING" && <Pill label="Running…" color="indigo" />}
          {batch.status === "PENDING" && <Pill label="Pending" color="gray" />}
          {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-gray-100 px-4 py-4 bg-gray-50 space-y-4 text-sm">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <MetricBox label="Success Rate" value={`${successPct}%`} />
            <MetricBox label="Avg Turns" value={String(metrics?.averageTurns ?? "—")} />
            <MetricBox label="Sentiment" value={metrics?.averageSentiment ?? "—"} />
            <MetricBox label="Completed" value={batch.completedAt ? formatDate(batch.completedAt) : "—"} />
          </div>

          {batch.simulationFrozen?.mission && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">Mission</p>
              <p className="text-gray-700">{batch.simulationFrozen.mission}</p>
            </div>
          )}

          {metrics?.averageSuccessRateForRuns && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">Success Criteria Score</p>
              <p className="text-gray-700">
                {metrics.averageSuccessRateForRuns.fraction} ({metrics.averageSuccessRateForRuns.percentage}%)
              </p>
            </div>
          )}

          {/* Transcript */}
          <div>
            <p className="text-xs font-medium text-gray-500 mb-2 flex items-center gap-1">
              <MessageSquare className="w-3.5 h-3.5" /> Conversation Transcript
            </p>
            {transcript === "loading" && (
              <div className="flex items-center gap-2 text-gray-400 text-xs py-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading transcript…
              </div>
            )}
            {transcript === "error" && (
              <p className="text-xs text-red-500">Could not load transcript for this run.</p>
            )}
            {Array.isArray(transcript) && transcript.length === 0 && (
              <p className="text-xs text-gray-400">No transcript available for this run.</p>
            )}
            {Array.isArray(transcript) && transcript.length > 0 && (
              <div className="space-y-2 max-h-80 overflow-y-auto border border-gray-200 rounded-lg bg-white p-3">
                {transcript.map((turn, i) => {
                  const role = turn.role ?? (i % 2 === 0 ? "user" : "bot");
                  const text = turn.text ?? turn.inputText ?? turn.outputText ?? "";
                  const isUser = role === "user" || role === "customer";
                  return (
                    <div key={i} className={`flex gap-2 ${isUser ? "" : "flex-row-reverse"}`}>
                      <span className={`text-xs font-medium px-1.5 py-0.5 rounded shrink-0 ${isUser ? "bg-indigo-100 text-indigo-700" : "bg-gray-100 text-gray-600"}`}>
                        {isUser ? "User" : "Bot"}
                      </span>
                      <p className={`text-xs text-gray-700 bg-white border rounded px-2 py-1.5 max-w-prose ${isUser ? "border-indigo-100" : "border-gray-200"}`}>
                        {text}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex items-center gap-4 text-xs text-gray-400 font-mono">
            <span>Batch: {batch._id}</span>
            {batch.simulationReference && <span>Sim: {batch.simulationReference}</span>}
          </div>
        </div>
      )}
    </div>
  );
}

function StatusIcon({ status, batchStatus }: { status: string; batchStatus: string }) {
  if (batchStatus === "RUNNING") return <Loader2 className="w-5 h-5 text-indigo-500 animate-spin shrink-0" />;
  if (batchStatus === "PENDING") return <Clock className="w-5 h-5 text-gray-400 shrink-0" />;
  if (status === "passed") return <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />;
  return <XCircle className="w-5 h-5 text-red-500 shrink-0" />;
}

function SummaryCard({ label, value, color }: { label: string; value: number; color: "gray" | "green" | "red" | "indigo" }) {
  const colors = { gray: "bg-white text-gray-900", green: "bg-green-50 text-green-800", red: "bg-red-50 text-red-800", indigo: "bg-indigo-50 text-indigo-800" };
  return (
    <div className={`rounded-lg border border-gray-200 p-4 ${colors[color]}`}>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-sm mt-0.5 opacity-70">{label}</p>
    </div>
  );
}

function Pill({ label, color }: { label: string; color: "green" | "red" | "gray" | "blue" | "indigo" }) {
  const colors = { green: "bg-green-100 text-green-700", red: "bg-red-100 text-red-700", gray: "bg-gray-100 text-gray-600", blue: "bg-blue-100 text-blue-700", indigo: "bg-indigo-100 text-indigo-700" };
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colors[color]}`}>{label}</span>;
}

function MetricBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded border border-gray-100 p-3">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="font-semibold text-gray-900 mt-0.5">{value}</p>
    </div>
  );
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleString();
}
