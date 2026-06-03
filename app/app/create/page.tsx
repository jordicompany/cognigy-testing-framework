"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Upload,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Plus,
  CheckCircle,
  XCircle,
  Loader2,
  Eye,
  EyeOff,
  AlertTriangle,
} from "lucide-react";
import { parseExcel, SheetSummary } from "@/lib/excel";
import { ExcelRow, SimulationPreview } from "@/lib/types";
import { loadCognigyConfig, loadAzureConfig } from "@/lib/store";
import { createSimulation, fetchSimulations } from "@/lib/cognigy";

export default function CreatePage() {
  const [sheets, setSheets] = useState<SheetSummary[]>([]);
  const [selectedSheet, setSelectedSheet] = useState("");
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [previews, setPreviews] = useState<SimulationPreview[]>([]);
  const [generating, setGenerating] = useState(false);
  const [creatingAll, setCreatingAll] = useState(false);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [configOk, setConfigOk] = useState(false);
  const [existingNames, setExistingNames] = useState<Set<string>>(new Set());
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const cog = loadCognigyConfig();
    const az = loadAzureConfig();
    const ok = !!(cog?.baseUrl && cog?.apiKey && cog?.projectId && az?.apiKey && az?.endpoint && az?.deploymentName);
    setConfigOk(ok);
    if (ok && cog) {
      fetchSimulations(cog.baseUrl, cog.apiKey, cog.projectId)
        .then((sims) => setExistingNames(new Set(sims.map((s) => s.name.toLowerCase()))))
        .catch(() => {});
    }
  }, []);

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const buffer = ev.target?.result as ArrayBuffer;
      const parsed = parseExcel(buffer);
      setSheets(parsed);
      if (parsed.length > 0) {
        setSelectedSheet(parsed[0].name);
        setSelectedRows(new Set());
        setPreviews([]);
      }
    };
    reader.readAsArrayBuffer(file);
  }

  const currentRows = sheets.find((s) => s.name === selectedSheet)?.rows ?? [];

  function toggleRow(idx: number) {
    setSelectedRows((prev) => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  }

  function selectAll() {
    setSelectedRows(new Set(currentRows.map((_, i) => i)));
  }

  function deselectAll() {
    setSelectedRows(new Set());
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const buffer = ev.target?.result as ArrayBuffer;
      const parsed = parseExcel(buffer);
      setSheets(parsed);
      if (parsed.length > 0) {
        setSelectedSheet(parsed[0].name);
        setSelectedRows(new Set());
        setPreviews([]);
      }
    };
    reader.readAsArrayBuffer(file);
  }, []);

  async function generatePreviews() {
    if (selectedRows.size === 0) return;
    const az = loadAzureConfig();
    if (!az?.apiKey) return;

    const rows = currentRows.filter((_, i) => selectedRows.has(i));
    setGenerating(true);
    setPreviews(rows.map((row) => ({ row, generated: null as never, status: "pending" })));

    for (let i = 0; i < rows.length; i++) {
      setPreviews((prev) =>
        prev.map((p, idx) => (idx === i ? { ...p, status: "creating" } : p))
      );
      try {
        const res = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ row: rows[i], azureConfig: az }),
        });
        if (!res.ok) throw new Error(await res.text());
        const generated = await res.json();
        setPreviews((prev) =>
          prev.map((p, idx) => (idx === i ? { ...p, generated, status: "pending" } : p))
        );
      } catch (e) {
        setPreviews((prev) =>
          prev.map((p, idx) =>
            idx === i
              ? { ...p, status: "error", error: e instanceof Error ? e.message : "Error" }
              : p
          )
        );
      }
    }
    setGenerating(false);
  }

  async function doCreate(i: number) {
    const cog = loadCognigyConfig();
    const p = previews[i];
    if (!cog || !p.generated) return;
    setPreviews((prev) => prev.map((x, idx) => (idx === i ? { ...x, status: "creating" } : x)));
    try {
      const result = await createSimulation(cog.baseUrl, cog.apiKey, cog.projectId, p.generated);
      setExistingNames((prev) => new Set([...prev, p.generated.name.toLowerCase()]));
      setPreviews((prev) =>
        prev.map((x, idx) => (idx === i ? { ...x, status: "created", cognigyId: result._id } : x))
      );
    } catch (e) {
      setPreviews((prev) =>
        prev.map((x, idx) =>
          idx === i
            ? { ...x, status: "error", error: e instanceof Error ? e.message : "Error" }
            : x
        )
      );
    }
  }

  async function createAll() {
    setCreatingAll(true);
    for (let i = 0; i < previews.length; i++) {
      const p = previews[i];
      if (p.status === "created" || p.status === "error" || !p.generated) continue;
      await doCreate(i);
    }
    setCreatingAll(false);
  }

  const readyToCreate = previews.some((p) => p.generated && p.status === "pending");
  const allCreated = previews.length > 0 && previews.every((p) => p.status === "created" || p.status === "error");
  const duplicateCount = previews.filter(
    (p) => p.generated && existingNames.has(p.generated.name.toLowerCase()) && p.status !== "created"
  ).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Create Simulators</h1>
        <p className="text-sm text-gray-500 mt-1">
          Upload an Excel file, select test cases, and let AI generate Cognigy simulator configs.
        </p>
      </div>

      {!configOk && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
          Configure Cognigy and Azure OpenAI settings before creating simulators.
        </div>
      )}

      {/* File upload */}
      <div
        onDrop={onDrop}
        onDragOver={(e) => e.preventDefault()}
        className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-indigo-400 transition-colors cursor-pointer bg-white"
        onClick={() => fileRef.current?.click()}
      >
        <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
        <p className="text-sm font-medium text-gray-700">Drop Excel file here or click to upload</p>
        <p className="text-xs text-gray-400 mt-1">.xlsx files supported</p>
        <input ref={fileRef} type="file" accept=".xlsx" className="hidden" onChange={onFile} />
      </div>

      {sheets.length > 0 && (
        <>
          {/* Sheet tabs */}
          <div className="flex gap-2 flex-wrap">
            {sheets.map((s) => (
              <button
                key={s.name}
                onClick={() => {
                  setSelectedSheet(s.name);
                  setSelectedRows(new Set());
                  setPreviews([]);
                }}
                className={`px-3 py-1.5 rounded-md text-sm font-medium border transition-colors ${
                  selectedSheet === s.name
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "bg-white text-gray-600 border-gray-200 hover:border-indigo-300"
                }`}
              >
                {s.name}
                <span className="ml-1.5 text-xs opacity-70">({s.rows.length})</span>
              </button>
            ))}
          </div>

          {/* Row selector */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b">
              <span className="text-sm font-medium text-gray-700">
                {selectedRows.size} of {currentRows.length} selected
              </span>
              <div className="flex gap-2">
                <button onClick={selectAll} className="text-xs text-indigo-600 hover:underline">All</button>
                <button onClick={deselectAll} className="text-xs text-gray-500 hover:underline">None</button>
              </div>
            </div>
            <div className="max-h-72 overflow-y-auto divide-y divide-gray-100">
              {currentRows.map((row, i) => (
                <label key={i} className="flex items-start gap-3 px-4 py-2.5 hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedRows.has(i)}
                    onChange={() => toggleRow(i)}
                    className="mt-0.5 accent-indigo-600"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">
                      <span className="text-indigo-600 mr-2">{row.tcId}</span>
                      {row.testCase}
                    </p>
                    {row.expectedResult && (
                      <p className="text-xs text-gray-400 truncate mt-0.5">{row.expectedResult}</p>
                    )}
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={generatePreviews}
              disabled={selectedRows.size === 0 || generating || !configOk}
              className="btn-primary flex items-center gap-2"
            >
              {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {generating ? "Generating…" : `Generate ${selectedRows.size > 0 ? `(${selectedRows.size})` : ""}`}
            </button>

            {readyToCreate && (
              <button onClick={createAll} disabled={creatingAll} className="btn-success flex items-center gap-2">
                {creatingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                {creatingAll ? "Creating…" : "Create All in Cognigy"}
              </button>
            )}
          </div>
        </>
      )}

      {/* Previews */}
      {previews.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">
              Generated Simulators ({previews.filter((p) => p.status === "created").length}/{previews.length} created)
            </h2>
            {duplicateCount > 0 && (
              <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2.5 py-1 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                {duplicateCount} duplicate name{duplicateCount > 1 ? "s" : ""} detected
              </span>
            )}
          </div>

          {previews.map((p, i) => (
            <PreviewCard
              key={i}
              preview={p}
              expanded={expandedIdx === i}
              isDuplicate={!!(p.generated && existingNames.has(p.generated.name.toLowerCase()) && p.status !== "created")}
              onToggle={() => setExpandedIdx(expandedIdx === i ? null : i)}
              onCreateSingle={() => doCreate(i)}
            />
          ))}

          {allCreated && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800 flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              All simulators created! Go to Run Tests to execute them.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PreviewCard({
  preview,
  expanded,
  isDuplicate,
  onToggle,
  onCreateSingle,
}: {
  preview: SimulationPreview;
  expanded: boolean;
  isDuplicate: boolean;
  onToggle: () => void;
  onCreateSingle: () => void;
}) {
  const { row, generated, status, error, cognigyId } = preview;

  const statusIcon = {
    pending: <span className="w-2 h-2 rounded-full bg-gray-300 mt-1.5" />,
    creating: <Loader2 className="w-4 h-4 text-indigo-500 animate-spin mt-0.5" />,
    created: <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />,
    error: <XCircle className="w-4 h-4 text-red-500 mt-0.5" />,
  }[status];

  return (
    <div className={`bg-white rounded-lg border overflow-hidden ${isDuplicate ? "border-amber-300" : "border-gray-200"}`}>
      <div className="flex items-start gap-3 px-4 py-3">
        <div className="shrink-0 mt-0.5">{statusIcon}</div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900">
            <span className="text-indigo-600 mr-2">{row.tcId}</span>
            {generated?.name ?? row.testCase}
          </p>
          {isDuplicate && (
            <p className="text-xs text-amber-600 mt-0.5 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> A simulator with this name already exists in Cognigy
            </p>
          )}
          {cognigyId && <p className="text-xs text-gray-400 mt-0.5">ID: {cognigyId}</p>}
          {error && <p className="text-xs text-red-600 mt-0.5">{error}</p>}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {generated && status === "pending" && (
            <button onClick={onCreateSingle} className="btn-secondary text-xs py-1 px-2 flex items-center gap-1">
              <Plus className="w-3 h-3" /> Create
            </button>
          )}
          {generated && (
            <button onClick={onToggle} className="text-gray-400 hover:text-gray-600 p-1">
              {expanded ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          )}
          <button onClick={onToggle} className="text-gray-400 hover:text-gray-600 p-1">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {expanded && generated && (
        <div className="border-t border-gray-100 px-4 py-3 bg-gray-50 space-y-3 text-sm">
          <DetailRow label="Persona" value={`${generated.personaName} — ${generated.persona}`} />
          <DetailRow label="Mission" value={generated.mission} />
          <div>
            <span className="font-medium text-gray-700">Success Criteria</span>
            <ul className="mt-1 space-y-1">
              {generated.successCriteria.map((sc, i) => (
                <li key={i} className="text-gray-600 text-xs bg-white border border-gray-100 rounded p-2">
                  <span className="font-medium">{sc.params.name}:</span> {sc.params.text}
                </li>
              ))}
            </ul>
          </div>
          <DetailRow label="Max Turns" value={String(generated.maxTurns)} />
        </div>
      )}

      {expanded && !generated && (
        <div className="border-t border-gray-100 px-4 py-3 bg-gray-50 space-y-1 text-sm text-gray-600">
          <DetailRow label="Test Case" value={row.testCase} />
          <DetailRow label="Steps" value={row.stepsToExecute} />
          <DetailRow label="Expected" value={row.expectedResult} />
        </div>
      )}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="font-medium text-gray-700">{label}: </span>
      <span className="text-gray-600 whitespace-pre-wrap">{value}</span>
    </div>
  );
}
