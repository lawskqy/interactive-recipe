// Scan current project text, never print matched credential values.
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const ignored = new Set([".git", "node_modules", "dist", "test-results", "playwright-report", "generated", ".env"]);
const patterns = [/AIza[0-9A-Za-z_-]{35}/, /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/, /\bgh[pousr]_[A-Za-z0-9]{30,}\b/];
const failures = [];
function visit(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ignored.has(entry.name) || entry.name.startsWith(".env." ) && entry.name !== ".env.example") continue;
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) visit(file);
    else if (/\.(?:[cm]?js|tsx?|json|ya?ml|md|py|example)$/.test(entry.name)) {
      const content = fs.readFileSync(file, "utf8");
      if (patterns.some((pattern) => pattern.test(content))) failures.push(path.relative(root, file));
    }
  }
}
visit(root);
if (failures.length) { console.error("Possible secrets in: " + failures.join(", ")); process.exitCode = 1; }
else console.log("No supported secret patterns found in current project text. History and ignored environment files are not scanned.");
