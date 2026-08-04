const AIProvider = require("./aiProvider.interface");

const SYSTEM_PROMPT = `You are explaining a demand surge and stock rebalancing recommendation.
Rules:
- Explain the surge in one short paragraph.
- Reference only numbers present in the provided context. Never invent figures.
- State the recommended action and its expected effect.
- Keep it under 80 words.`;

class OpenAIProvider extends AIProvider {
  constructor({ apiKey, model }) {
    super();
    this.apiKey = apiKey;
    this.model = model || "gpt-4o-mini";
  }

  async generateRationale(context) {
    if (!this.apiKey) {
      throw new Error("OPENAI_KEY is not configured");
    }

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: JSON.stringify(context) },
        ],
        max_tokens: 150,
      }),
    });

    if (!res.ok) {
      throw new Error(`OpenAI request failed: ${res.status}`);
    }

    const data = await res.json();
    const rationale = data.choices?.[0]?.message?.content?.trim();

    if (!rationale) {
      throw new Error("OpenAI returned an empty response");
    }

    return { rationale, confidence: 0.8 };
  }
}

module.exports = OpenAIProvider;