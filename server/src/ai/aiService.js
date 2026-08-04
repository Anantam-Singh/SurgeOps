const GeminiProvider = require("./geminiProvider");
const OpenAIProvider = require("./openaiProvider");
const OfflineProvider = require("./offlineProvider");

const providers = {
  gemini: () => new GeminiProvider({ apiKey: process.env.GEMINI_KEY, model: process.env.AI_MODEL }),
  openai: () => new OpenAIProvider({ apiKey: process.env.OPENAI_KEY, model: process.env.AI_MODEL }),
  offline: () => new OfflineProvider(),
};

function getProvider(name) {
  const providerName = name || process.env.AI_PROVIDER || "offline";
  const factory = providers[providerName];
  if (!factory) {
    throw new Error(`Unknown AI_PROVIDER: ${providerName}`);
  }
  return { name: providerName, instance: factory() };
}

/**
 * Always resolves — never rejects. Uses the configured provider (gemini/openai/offline);
 * if a real LLM provider has no key or its call fails for any reason, transparently
 * falls back to the deterministic offline generator so every recommendation still gets
 * a grounded, non-null explanation.
 */
async function generateRationale(context) {
  const { name, instance } = getProvider();

  if (name !== "offline") {
    try {
      const result = await instance.generateRationale(context);
      return { ...result, provider: name };
    } catch (err) {
      console.warn(`AI_PROVIDER_FALLBACK: ${name} unavailable (${err.message}) — using offline reasoning`);
    }
  }

  const result = await providers.offline().generateRationale(context);
  return { ...result, provider: "offline" };
}

module.exports = { generateRationale };