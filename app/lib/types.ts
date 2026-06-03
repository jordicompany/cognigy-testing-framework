export interface CognigyConfig {
  baseUrl: string;
  apiKey: string;
  projectId: string;
  projectName: string;
}

export interface AzureOpenAIConfig {
  endpoint: string;
  apiKey: string;
  deploymentName: string;
  apiVersion: string;
}

export interface CognigyProject {
  _id: string;
  name: string;
}

export interface ExcelRow {
  tcId: string;
  testCase: string;
  stepsToExecute: string;
  expectedResult: string;
  sheet: string;
  rowIndex: number;
}

export interface GeneratedSimulation {
  name: string;
  persona: string;
  personaName: string;
  mission: string;
  successCriteria: SuccessCriteria[];
  maxTurns: number;
  flowId: null;
}

export interface SuccessCriteria {
  type: "text";
  params: {
    name: string;
    text: string;
  };
}

export interface SimulationPreview {
  row: ExcelRow;
  generated: GeneratedSimulation;
  status: "pending" | "creating" | "created" | "error";
  cognigyId?: string;
  error?: string;
}

export interface CognigySimulation {
  _id: string;
  name: string;
  projectReference: string;
  persona?: string;
  mission?: string;
  maxTurns?: number;
  createdAt: string;
  lastResult?: SimulationResult;
}

export interface SimulationResult {
  status: "success" | "failure" | "running" | "pending" | "scheduled";
  completedAt?: string;
  score?: number;
}

export interface LLMModel {
  _id: string;
  name: string;
}

export interface CognigyFlow {
  _id: string;
  name: string;
}

export interface CognigyLocale {
  _id: string;
  name: string;
}

export interface RunConfig {
  flowReferenceId: string;
  localeReferenceId: string;
  largeLanguageModelReferenceId: string;
}

export interface ScheduleResult {
  simulationId: string;
  status: "scheduled" | "error";
  error?: string;
}

export interface ConversationTurn {
  inputText?: string;
  outputText?: string;
  text?: string;
  role?: string;
  index?: number;
}

export interface SimulationBatch {
  _id: string;
  name: string;
  status: "COMPLETED" | "RUNNING" | "FAILED" | "PENDING" | string;
  simulationReference: string;
  numberOfExecutions: number;
  createdAt: number;
  completedAt?: number;
  simulationFrozen: {
    personaName: string;
    mission: string;
    persona: string;
  };
  batchMetrics: {
    successRate: number;
    averageTurns: number;
    averageSentiment: string;
    runResults: {
      succeeded: number;
      failed: number;
    };
    averageSuccessRateForRuns: {
      percentage: number;
      fraction: string;
    };
  };
}
