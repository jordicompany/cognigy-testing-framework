"use client";

import { CognigyConfig, AzureOpenAIConfig } from "./types";

const COGNIGY_KEY = "cognigy_config";
const AZURE_KEY = "azure_openai_config";

export function saveCognigyConfig(config: CognigyConfig) {
  localStorage.setItem(COGNIGY_KEY, JSON.stringify(config));
}

export function loadCognigyConfig(): CognigyConfig | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(COGNIGY_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function saveAzureConfig(config: AzureOpenAIConfig) {
  localStorage.setItem(AZURE_KEY, JSON.stringify(config));
}

export function loadAzureConfig(): AzureOpenAIConfig | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(AZURE_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function clearConfigs() {
  localStorage.removeItem(COGNIGY_KEY);
  localStorage.removeItem(AZURE_KEY);
}
