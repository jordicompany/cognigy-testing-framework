"use client";

import { useEffect, useState } from "react";
import { Save, RefreshCw, CheckCircle, XCircle } from "lucide-react";
import {
  loadCognigyConfig,
  saveCognigyConfig,
  loadAzureConfig,
  saveAzureConfig,
} from "@/lib/store";
import { CognigyProject } from "@/lib/types";

export default function SettingsPage() {
  const [baseUrl, setBaseUrl] = useState("https://api-eu-dev-cai.cognigy.cloud");
  const [apiKey, setApiKey] = useState("");
  const [projectId, setProjectId] = useState("");
  const [projectName, setProjectName] = useState("");
  const [projects, setProjects] = useState<CognigyProject[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [projectsError, setProjectsError] = useState("");
  const [saved, setSaved] = useState(false);

  // Azure OpenAI
  const [azureEndpoint, setAzureEndpoint] = useState("");
  const [azureApiKey, setAzureApiKey] = useState("");
  const [azureDeployment, setAzureDeployment] = useState("");
  const [azureApiVersion, setAzureApiVersion] = useState("2024-02-01");

  useEffect(() => {
    const cog = loadCognigyConfig();
    if (cog) {
      setBaseUrl(cog.baseUrl);
      setApiKey(cog.apiKey);
      setProjectId(cog.projectId);
      setProjectName(cog.projectName);
    }
    const az = loadAzureConfig();
    if (az) {
      setAzureEndpoint(az.endpoint);
      setAzureApiKey(az.apiKey);
      setAzureDeployment(az.deploymentName);
      setAzureApiVersion(az.apiVersion || "2024-02-01");
    }
  }, []);

  async function fetchProjects() {
    setLoadingProjects(true);
    setProjectsError("");
    setProjects([]);
    try {
      const res = await fetch("/api/cognigy/proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: `${baseUrl}/new/v2.0/projects?limit=100&skip=0`,
          apiKey,
          method: "GET",
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      const list: CognigyProject[] = data.items ?? data ?? [];
      setProjects(list);
      if (list.length === 0) setProjectsError("No projects found for this API key.");
    } catch (e) {
      setProjectsError(e instanceof Error ? e.message : "Failed to fetch projects");
    } finally {
      setLoadingProjects(false);
    }
  }

  function selectProject(p: CognigyProject) {
    setProjectId(p._id);
    setProjectName(p.name);
  }

  function save() {
    saveCognigyConfig({ baseUrl, apiKey, projectId, projectName });
    saveAzureConfig({
      endpoint: azureEndpoint,
      apiKey: azureApiKey,
      deploymentName: azureDeployment,
      apiVersion: azureApiVersion,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">
          Configure your Cognigy and Azure OpenAI connections. Values are saved in browser local storage.
        </p>
      </div>

      <Section title="Cognigy API">
        <Field label="Base URL">
          <input
            type="url"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            className="input"
            placeholder="https://api-eu-dev-cai.cognigy.cloud"
          />
        </Field>
        <Field label="API Key">
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            className="input"
            placeholder="Your Cognigy API key"
          />
        </Field>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchProjects}
            disabled={!baseUrl || !apiKey || loadingProjects}
            className="btn-secondary flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loadingProjects ? "animate-spin" : ""}`} />
            {loadingProjects ? "Loading…" : "Load Projects"}
          </button>
          {projectId && (
            <span className="text-sm text-green-700 flex items-center gap-1">
              <CheckCircle className="w-4 h-4" /> {projectName}
            </span>
          )}
        </div>

        {projectsError && (
          <p className="text-sm text-red-600 flex items-center gap-1">
            <XCircle className="w-4 h-4" /> {projectsError}
          </p>
        )}

        {projects.length > 0 && (
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <p className="text-xs text-gray-500 px-3 py-2 bg-gray-50 border-b">Select a project</p>
            {projects.map((p) => (
              <button
                key={p._id}
                onClick={() => selectProject(p)}
                className={`w-full text-left px-3 py-2.5 text-sm hover:bg-indigo-50 border-b last:border-b-0 transition-colors ${
                  p._id === projectId ? "bg-indigo-50 text-indigo-700 font-medium" : "text-gray-700"
                }`}
              >
                {p.name}
                <span className="text-xs text-gray-400 ml-2">{p._id}</span>
              </button>
            ))}
          </div>
        )}
      </Section>

      <Section title="Azure OpenAI">
        <p className="text-sm text-gray-500">
          Used to generate simulator configs from your Excel test cases.
        </p>
        <Field label="Endpoint">
          <input
            type="url"
            value={azureEndpoint}
            onChange={(e) => setAzureEndpoint(e.target.value)}
            className="input"
            placeholder="https://your-resource.openai.azure.com"
          />
        </Field>
        <Field label="API Key">
          <input
            type="password"
            value={azureApiKey}
            onChange={(e) => setAzureApiKey(e.target.value)}
            className="input"
            placeholder="Azure OpenAI API key"
          />
        </Field>
        <Field label="Deployment Name">
          <input
            type="text"
            value={azureDeployment}
            onChange={(e) => setAzureDeployment(e.target.value)}
            className="input"
            placeholder="e.g. gpt-4o"
          />
        </Field>
        <Field label="API Version">
          <input
            type="text"
            value={azureApiVersion}
            onChange={(e) => setAzureApiVersion(e.target.value)}
            className="input"
            placeholder="2024-02-01"
          />
        </Field>
      </Section>

      <button onClick={save} className="btn-primary flex items-center gap-2">
        {saved ? <CheckCircle className="w-4 h-4" /> : <Save className="w-4 h-4" />}
        {saved ? "Saved!" : "Save Settings"}
      </button>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5 space-y-4">
      <h2 className="font-semibold text-gray-900">{title}</h2>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      {children}
    </div>
  );
}
