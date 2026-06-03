import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  const { url, apiKey, method, body } = await request.json();

  if (!url || !apiKey) {
    return new Response("Missing url or apiKey", { status: 400 });
  }

  const res = await fetch(url, {
    method: method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "X-API-Key": apiKey,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  return new Response(text, {
    status: res.status,
    headers: { "Content-Type": "application/json" },
  });
}
