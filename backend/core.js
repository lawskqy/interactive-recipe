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
    !/^\/(images|media)\/[\w().-]+\.(png|webp)$/.test(value)
  )
    fail("Invalid image reference.");
  const [, kind, filename] = value.split("/");
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
function createQueue(limit = 2, maxWaiting = 12, waitTimeout = 30000) {
  let active = 0;
  const waiting = [];
  return async (task) => {
    if (active >= limit) {
      if (waiting.length >= maxWaiting)
        fail("The illustration queue is full. Please try again shortly.", 429);
      await new Promise((resolve, reject) => {
        const entry = () => {
          clearTimeout(timer);
          resolve();
        };
        const timer = setTimeout(() => {
          const position = waiting.indexOf(entry);
          if (position !== -1) waiting.splice(position, 1);
          const error = new Error(
            "The illustration queue is busy. Please try again shortly.",
          );
          error.status = 503;
          error.publicMessage = true;
          reject(error);
        }, waitTimeout);
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
  createQueue,
  recipeSchema,
};
