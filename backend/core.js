const path = require("node:path");
const crypto = require("node:crypto");
const safeName = (value) =>
  value
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^\w_]/g, "")
    .slice(0, 40);
const hash = (value) =>
  crypto
    .createHash("sha256")
    .update(JSON.stringify(value))
    .digest("hex")
    .slice(0, 20);
function fail(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  error.publicMessage = true;
  throw error;
}
function text(value, max = 3000) {
  return (
    typeof value === "string" && value.trim().length > 0 && value.length <= max
  );
}
function strings(value, max = 60) {
  return (
    Array.isArray(value) && value.length <= max && value.every((v) => text(v))
  );
}
function validateRecipe(r) {
  if (
    !r ||
    !text(r.id, 120) ||
    !/^[a-z0-9-]+$/.test(r.id) ||
    !text(r.name, 160) ||
    typeof r.description !== "string" ||
    r.description.length > 2000 ||
    !["warm drinks", "cold drinks"].includes(r.category) ||
    !Number.isFinite(r.portion) ||
    r.portion <= 0 ||
    r.portion > 100 ||
    typeof r.image !== "string" ||
    !/^[\w-]+\.png$/.test(r.image) ||
    !strings(r.steps, 40) ||
    !r.steps.length ||
    !Array.isArray(r.ingredients) ||
    !r.ingredients.length ||
    r.ingredients.length > 60 ||
    !r.ingredients.every((i) => i && text(i.name, 160) && text(i.amount, 160))
  )
    fail("The recipe is incomplete or invalid.");
  return r;
}
function imageReference(value, directories) {
  if (
    typeof value !== "string" ||
    !/^\/(images|media|assets)\/[\w().-]+\.(png|webp)$/.test(value)
  )
    fail("Invalid image reference.");
  const [, kind, filename] = value.split("/");
  if (!directories[kind]) fail("Invalid image reference.");
  const root = path.resolve(directories[kind]);
  const resolved = path.resolve(root, filename);
  if (path.dirname(resolved) !== root) fail("Invalid image reference.");
  return resolved;
}
function singleFlight() {
  const tasks = new Map();
  return (key, task) => {
    if (!tasks.has(key)) {
      const work = Promise.resolve()
        .then(task)
        .finally(() => tasks.delete(key));
      tasks.set(key, work);
    }
    return tasks.get(key);
  };
}
// Joined work runs once and is aborted only when every caller that passed a
// signal has abandoned it; callers without a signal keep it running.
function sharedFlight() {
  const flights = new Map();
  return (key, task, signal) => {
    if (signal?.aborted) return Promise.reject(signal.reason);
    let flight = flights.get(key);
    if (!flight || flight.controller.signal.aborted) {
      const created = { controller: new AbortController(), holders: 0, settled: false };
      created.promise = Promise.resolve()
        .then(() => task(created.controller.signal))
        .finally(() => {
          created.settled = true;
          if (flights.get(key) === created) flights.delete(key);
        });
      flights.set(key, created);
      flight = created;
    }
    const joined = flight;
    joined.holders++;
    return new Promise((resolve, reject) => {
      const abandon = () => {
        if (--joined.holders === 0 && !joined.settled) joined.controller.abort(signal.reason);
        reject(signal.reason);
      };
      signal?.addEventListener("abort", abandon, { once: true });
      joined.promise.then(resolve, reject).finally(() => signal?.removeEventListener("abort", abandon));
    });
  };
}
function createQueue(limit = 2, maxWaiting = 12, waitTimeout = 30000) {
  let active = 0;
  const waiting = [];
  return async (task, signal) => {
    signal?.throwIfAborted();
    if (active >= limit) {
      if (waiting.length >= maxWaiting)
        fail("The illustration queue is full. Please try again shortly.", 429);
      await new Promise((resolve, reject) => {
        const remove = () => {
          const position = waiting.indexOf(entry);
          if (position !== -1) waiting.splice(position, 1);
        };
        const abort = () => {
          clearTimeout(timer);
          remove();
          reject(signal.reason);
        };
        const entry = () => {
          clearTimeout(timer);
          signal?.removeEventListener("abort", abort);
          resolve();
        };
        const timer = setTimeout(() => {
          remove();
          signal?.removeEventListener("abort", abort);
          const error = new Error(
            "The illustration queue is busy. Please try again shortly.",
          );
          error.status = 503;
          error.publicMessage = true;
          reject(error);
        }, waitTimeout);
        signal?.addEventListener("abort", abort, { once: true });
        waiting.push(entry);
      });
    } else active++;
    try {
      return await task();
    } finally {
      const next = waiting.shift();
      if (next) next();
      else active--;
    }
  };
}
const ingredientSchema = {
  type: "object",
  properties: { name: { type: "string" }, amount: { type: "string" } },
  required: ["name", "amount"],
};
const recipeSchema = {
  type: "object",
  properties: {
    id: { type: "string" },
    name: { type: "string" },
    description: { type: "string" },
    category: { type: "string", enum: ["warm drinks", "cold drinks"] },
    portion: { type: "number" },
    ingredients: { type: "array", items: ingredientSchema },
    steps: { type: "array", items: { type: "string" } },
    image: { type: "string" },
  },
  required: [
    "id",
    "name",
    "description",
    "category",
    "portion",
    "ingredients",
    "steps",
    "image",
  ],
};
module.exports = {
  safeName,
  hash,
  fail,
  text,
  strings,
  validateRecipe,
  imageReference,
  singleFlight,
  sharedFlight,
  createQueue,
  recipeSchema,
};
