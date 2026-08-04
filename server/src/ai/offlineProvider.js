const AIProvider = require("./aiProvider.interface");

/**
 * OfflineProvider
 * Deterministic, template-based reasoning generator — no external API, no
 * cost, never unavailable. It is the default provider (AI_PROVIDER=offline)
 * and also the automatic fallback when a real LLM provider errors out, so
 * every recommendation gets a natural-language explanation regardless of
 * whether an API key is configured. Only references numbers already present
 * in the context object (same rule the LLM providers are prompted with).
 */
class OfflineProvider extends AIProvider {
  async generateRationale(context) {
    const {
      area,
      category,
      transferQty,
      reorderBufferPct,
      source,
      targetDeficitUnits,
      mlForecast,
    } = context;

    const sentences = [];

    if (mlForecast?.predictedDemandNextWindow != null) {
      const driverText = mlForecast.topDrivers?.length
        ? ` driven mainly by ${formatDrivers(mlForecast.topDrivers)}`
        : "";
      sentences.push(
        `The demand forecast model predicts ${mlForecast.predictedDemandNextWindow} units of ${category} demand in ${area} over the next window${driverText}, at ${Math.round(
          (mlForecast.confidence ?? 0) * 100
        )}% model confidence.`
      );
    } else {
      sentences.push(`${capitalize(category)} demand in ${area} has crossed the surge threshold for this window.`);
    }

    if (transferQty > 0 && source?.area) {
      sentences.push(
        `Recommending a transfer of ${transferQty} units from ${source.area} (${source.surplusUnits} units surplus, ${source.distanceKm}km away) to close a ${targetDeficitUnits}-unit gap against the ${reorderBufferPct}% reorder buffer.`
      );
    } else if (transferQty > 0) {
      sentences.push(
        `Recommending a transfer of ${transferQty} units to close a ${targetDeficitUnits}-unit gap against the ${reorderBufferPct}% reorder buffer.`
      );
    } else {
      sentences.push(
        `No fulfillment center currently has enough surplus stock to cover the ${targetDeficitUnits}-unit gap — flagging for manual procurement.`
      );
    }

    return { rationale: sentences.join(" "), confidence: mlForecast?.confidence ?? 0.6 };
  }
}

function capitalize(text) {
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : text;
}

function formatDrivers(drivers) {
  if (drivers.length === 1) return drivers[0];
  return `${drivers.slice(0, -1).join(", ")} and ${drivers[drivers.length - 1]}`;
}

module.exports = OfflineProvider;
