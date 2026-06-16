/**
 * OpenRouter API wrapper — server-side only.
 * Reads OPENROUTER_API_KEY and OPENROUTER_MODEL from environment.
 */

export class OpenRouterError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly retryable: boolean = false,
  ) {
    super(message);
    this.name = "OpenRouterError";
  }
}

export async function callLLM(
  systemPrompt: string,
  userMessages: string,
): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const model = process.env.OPENROUTER_MODEL;

  if (!apiKey) throw new OpenRouterError("OPENROUTER_API_KEY is not set", 500);
  if (!model) throw new OpenRouterError("OPENROUTER_MODEL is not set", 500);

  const response = await fetch(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: "Bearer " + apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessages },
        ],
      }),
    },
  );

  if (response.status === 429) {
    throw new OpenRouterError("Rate limited by OpenRouter", 429, true);
  }

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new OpenRouterError(
      "OpenRouter error " + response.status + ": " + body,
      response.status,
      response.status >= 500,
    );
  }

  const data = (await response.json()) as {
    choices: { message: { content: string } }[];
  };

  return data.choices[0]?.message?.content ?? "";
}
