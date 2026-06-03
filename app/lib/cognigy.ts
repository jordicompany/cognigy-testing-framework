import {
  CognigyProject,
  CognigySimulation,
  GeneratedSimulation,
  LLMModel,
  RunConfig,
  SimulationBatch,
  ConversationTurn,
} from "./types";

export async function fetchProjects(baseUrl: string, apiKey: string): Promise<CognigyProject[]> {
  const url = `${baseUrl}/new/v2.0/projects?limit=100&skip=0`;
  const res = await fetch(`/api/cognigy/proxy`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url, apiKey, method: "GET" }),
  });
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();
  return Array.isArray(data.items) ? data.items : Array.isArray(data) ? data : [];
}

export async function fetchSimulations(
  baseUrl: string,
  apiKey: string,
  projectId: string
): Promise<CognigySimulation[]> {
  const url = `${baseUrl}/testing/simulations?projectId=${projectId}`;
  const res = await fetch(`/api/cognigy/proxy`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url, apiKey, method: "GET" }),
  });
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();
  return Array.isArray(data.data) ? data.data : Array.isArray(data.items) ? data.items : Array.isArray(data) ? data : [];
}

export async function fetchSimulationsPage(
  baseUrl: string,
  apiKey: string,
  projectId: string,
  page: number,
  pageSize: number
): Promise<{ items: CognigySimulation[]; total: number }> {
  const skip = page * pageSize;
  const url = `${baseUrl}/testing/simulations?projectId=${projectId}&limit=${pageSize}&skip=${skip}`;
  const res = await fetch(`/api/cognigy/proxy`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url, apiKey, method: "GET" }),
  });
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();
  const items = Array.isArray(data.data) ? data.data : Array.isArray(data.items) ? data.items : [];
  const total = data.pagination?.total ?? data.total ?? items.length;
  return { items, total };
}

export async function createSimulation(
  baseUrl: string,
  apiKey: string,
  projectId: string,
  simulation: GeneratedSimulation
): Promise<{ _id: string }> {
  const url = `${baseUrl}/testing/simulations`;
  const res = await fetch(`/api/cognigy/proxy`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      url,
      apiKey,
      method: "POST",
      body: {
          ...simulation,
          projectReference: projectId,
          persona: `${simulation.persona}\n\nIMPORTANT: Always start the conversation with only "Hello!" and nothing else.`,
        },
    }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function scheduleSimulation(
  baseUrl: string,
  apiKey: string,
  simulationId: string,
  name: string,
  projectId: string,
  runConfig: RunConfig
): Promise<unknown> {
  const url = `${baseUrl}/testing/simulations/${simulationId}/schedule`;
  const res = await fetch(`/api/cognigy/proxy`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      url,
      apiKey,
      method: "POST",
      body: {
        name,
        projectReference: projectId,
        runConfig: {
          entrypoint: projectId,
          flowReferenceId: runConfig.flowReferenceId,
          localeReferenceId: runConfig.localeReferenceId,
          largeLanguageModelReferenceId: runConfig.largeLanguageModelReferenceId,
          data: {},
          enableMocking: false,
        },
        numberOfExecutions: 1,
      },
    }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function fetchLLMModels(
  baseUrl: string,
  apiKey: string,
  projectId: string
): Promise<LLMModel[]> {
  const url = `${baseUrl}/new/v2.0/largelanguagemodels?limit=100&projectId=${projectId}&skip=0&useCase=gptConversation`;
  const res = await fetch(`/api/cognigy/proxy`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url, apiKey, method: "GET" }),
  });
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();
  return Array.isArray(data.items) ? data.items : Array.isArray(data) ? data : [];
}

export async function fetchFlows(
  baseUrl: string,
  apiKey: string,
  projectId: string
): Promise<{ _id: string; name: string }[]> {
  const url = `${baseUrl}/new/v2.0/flows?limit=100&projectId=${projectId}&skip=0`;
  const res = await fetch(`/api/cognigy/proxy`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url, apiKey, method: "GET" }),
  });
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();
  return Array.isArray(data.items) ? data.items : Array.isArray(data) ? data : [];
}

export async function fetchLocales(
  baseUrl: string,
  apiKey: string,
  projectId: string
): Promise<{ _id: string; name: string }[]> {
  const url = `${baseUrl}/new/v2.0/locales?limit=100&projectId=${projectId}&skip=0`;
  const res = await fetch(`/api/cognigy/proxy`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url, apiKey, method: "GET" }),
  });
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();
  return Array.isArray(data.items) ? data.items : Array.isArray(data) ? data : [];
}

export async function fetchBatches(
  baseUrl: string,
  apiKey: string,
  projectId: string
): Promise<SimulationBatch[]> {
  const url = `${baseUrl}/testing/simulations/batches?projectId=${projectId}&sort=createdAt%3Adesc`;
  const res = await fetch(`/api/cognigy/proxy`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url, apiKey, method: "GET" }),
  });
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();
  return Array.isArray(data.data) ? data.data : [];
}

export async function fetchBatchTranscript(
  baseUrl: string,
  apiKey: string,
  batchId: string
): Promise<ConversationTurn[]> {
  const url = `${baseUrl}/testing/simulations/batches/${batchId}/runs`;
  const res = await fetch(`/api/cognigy/proxy`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url, apiKey, method: "GET" }),
  });
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();
  // Runs are nested: data.data[0].messages or data.data[0].turns — normalise both
  const runs: unknown[] = Array.isArray(data.data) ? data.data : Array.isArray(data) ? data : [];
  if (runs.length === 0) return [];
  const run = runs[0] as Record<string, unknown>;
  const turns =
    (run.messages as ConversationTurn[]) ??
    (run.turns as ConversationTurn[]) ??
    (run.conversation as ConversationTurn[]) ??
    [];
  return Array.isArray(turns) ? turns : [];
}
