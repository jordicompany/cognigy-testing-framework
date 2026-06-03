"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Settings, Upload, Play, CheckCircle, AlertCircle, Bot } from "lucide-react";
import { loadCognigyConfig, loadAzureConfig } from "@/lib/store";

export default function Dashboard() {
  const [cognigyOk, setCognigyOk] = useState(false);
  const [azureOk, setAzureOk] = useState(false);

  useEffect(() => {
    const cog = loadCognigyConfig();
    const az = loadAzureConfig();
    setCognigyOk(!!(cog?.baseUrl && cog?.apiKey && cog?.projectId));
    setAzureOk(!!(az?.endpoint && az?.apiKey && az?.deploymentName));
  }, []);

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <Bot className="w-8 h-8 text-indigo-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cognigy Testing Framework</h1>
          <p className="text-gray-500">
            Upload Excel test cases, generate Cognigy simulators via AI, and run them.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatusCard
          title="Cognigy Connection"
          ok={cognigyOk}
          message={cognigyOk ? "Connected and project selected" : "Configure API URL, key and project"}
        />
        <StatusCard
          title="Azure OpenAI"
          ok={azureOk}
          message={azureOk ? "Endpoint and deployment configured" : "Required to generate test scenarios"}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StepCard
          step={1}
          href="/settings"
          icon={Settings}
          title="Configure Settings"
          description="Set your Cognigy URL, API key, project, and Azure OpenAI credentials."
        />
        <StepCard
          step={2}
          href="/create"
          icon={Upload}
          title="Create Simulators"
          description="Upload an Excel file. AI generates simulator configs for each test case and pushes them to Cognigy."
        />
        <StepCard
          step={3}
          href="/run"
          icon={Play}
          title="Run Tests"
          description="Browse all simulators, configure flow & model, and trigger runs."
        />
      </div>
    </div>
  );
}

function StatusCard({ title, ok, message }: { title: string; ok: boolean; message: string }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 flex items-start gap-3">
      {ok ? (
        <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 shrink-0" />
      ) : (
        <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
      )}
      <div>
        <p className="font-medium text-gray-900">{title}</p>
        <p className="text-sm text-gray-500">{message}</p>
      </div>
    </div>
  );
}

function StepCard({
  step,
  href,
  icon: Icon,
  title,
  description,
}: {
  step: number;
  href: string;
  icon: React.ElementType;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="bg-white rounded-lg border border-gray-200 p-5 hover:border-indigo-300 hover:shadow-sm transition-all group block"
    >
      <div className="flex items-center gap-3 mb-3">
        <span className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center">
          {step}
        </span>
        <Icon className="w-5 h-5 text-indigo-600" />
      </div>
      <h3 className="font-semibold text-gray-900 group-hover:text-indigo-700">{title}</h3>
      <p className="mt-1 text-sm text-gray-500">{description}</p>
    </Link>
  );
}
