import { NextRequest } from "next/server";
import { AzureOpenAI } from "openai";
import { ExcelRow, GeneratedSimulation, AzureOpenAIConfig } from "@/lib/types";

const SYSTEM_PROMPT = `You are an expert at creating Cognigy AI simulator test scenarios.
Given a test case from an Excel sheet, you will generate a simulator configuration that accurately represents the test scenario.

Rules:
- persona: describe the caller's role, traits, and technical familiarity based on the test context
- personaName: a realistic first name for the persona
- mission: a clear, specific description of what this persona needs to accomplish in the conversation
- successCriteria: 1-3 AI judge checks that verify the bot behaved correctly. Each check should be specific and verifiable from the conversation transcript
- maxTurns: estimate how many conversation turns this scenario needs (between 5 and 20)
- Keep all text in the same language as the test case (German if German, English if English)

Respond ONLY with valid JSON matching the schema, no markdown, no explanation.`;

const SCHEMA = `{
  "name": "string (concise test name)",
  "persona": "string (persona description)",
  "personaName": "string (first name)",
  "mission": "string (what the persona needs to accomplish)",
  "successCriteria": [
    {
      "type": "text",
      "params": {
        "name": "string (judge name)",
        "text": "string (what the AI judge checks)"
      }
    }
  ],
  "maxTurns": number,
  "flowId": null
}`;

export async function POST(request: NextRequest) {
  const { row, azureConfig }: { row: ExcelRow; azureConfig: AzureOpenAIConfig } =
    await request.json();

  if (!azureConfig?.endpoint || !azureConfig?.apiKey || !azureConfig?.deploymentName) {
    return new Response("Missing Azure OpenAI configuration", { status: 400 });
  }

  const client = new AzureOpenAI({
    endpoint: azureConfig.endpoint,
    apiKey: azureConfig.apiKey,
    apiVersion: azureConfig.apiVersion || "2024-02-01",
    deployment: azureConfig.deploymentName,
  });

  const userMessage = `Generate a Cognigy simulator configuration for this test case:

TC#: ${row.tcId}
Test Case: ${row.testCase}
Steps to Execute:
${row.stepsToExecute}

Expected Result:
${row.expectedResult}

Output schema:
${SCHEMA}`;

  const completion = await client.chat.completions.create({
    model: azureConfig.deploymentName,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userMessage },
    ],
    max_tokens: 1024,
  });

  const text = completion.choices[0]?.message?.content ?? "";

  let parsed: GeneratedSimulation;
  try {
    parsed = JSON.parse(text);
  } catch {
    return new Response(`Failed to parse LLM response: ${text}`, { status: 500 });
  }

  return Response.json(parsed);
}
