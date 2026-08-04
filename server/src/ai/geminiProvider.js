const AIProvider = require("./aiProvider.interface");

const SYSTEM_PROMPT = `You are explaining a demand surge and stock rebalancing recommendation.
Rules:
- Explain the surge in one short paragraph.
- Reference only numbers present in the provided context. Never invent figures.
- State the recommended action and its expected effect.
- Keep it under 80 words.`;

class GeminiProvider extends AIProvider {
  constructor({ apiKey, model }) {
    super();
    this.apiKey = apiKey;
    this.model = model || "gemini-2.0-flash";
  }

  async generateRationale(context) {
    if (!this.apiKey) {
      throw new Error("GEMINI_KEY is not configured");
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;

    const body = {
      contents: [
        {
          parts: [
            {
              text: `${SYSTEM_PROMPT}\n\nContext:\n${JSON.stringify(context, null, 2)}`,
            },
          ],
        },
      ],
    };

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      throw new Error(`Gemini request failed: ${res.status}`);
    }

    const data = await res.json();
    const rationale = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (!rationale) {
      throw new Error("Gemini returned an empty response");
    }

    return { rationale, confidence: 0.8 };
  }
}

module.exports = GeminiProvider;