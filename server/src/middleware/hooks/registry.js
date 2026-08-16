/**
 * registry.js
 * See doc §5.4 — Developer Hooks & Middleware
 * Lets future features (SMS alerts, auto-purchase, the surge engine itself)
 * attach to lifecycle events WITHOUT editing this module's controller/service.
 *
 * Usage elsewhere (e.g. the engine, once Person B builds it):
 *   const hooks = require("../../middleware/hooks/registry");
 *   hooks.register("post", "order.created", async (ctx) => {
 *     await surgeEngine.detect(ctx.order);
 *   });
 */

const hooks = { pre: {}, post: {} };

function register(phase, event, fn) {
  (hooks[phase][event] ||= []).push(fn);
}

async function run(phase, event, ctx) {
  for (const fn of hooks[phase][event] || []) {
    try {
      await fn(ctx);
    } catch (err) {
      // A hook failing should never break the main request/response cycle
      console.error(`Hook error [${phase}:${event}]:`, err);
    }
  }
}

module.exports = { register, run };