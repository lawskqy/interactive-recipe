// Pre-commit guard: refuse local leftovers and artwork changes in a commit.
const { execFileSync } = require("node:child_process");

const staged = execFileSync("git", ["diff", "--cached", "--name-only", "--diff-filter=ACMRD", "-z"], { encoding: "utf8" })
  .split("\0").filter(Boolean);

const junk = [
  /(^|\/)node_modules\//, /(^|\/)dist(-ssr)?\//, /(^|\/)test-results\//, /(^|\/)playwright-report\//,
  /^backend\/generated\//, /^backend\/my_agent\//, /^(notes|output)\//, /^scripts\/segmentation\//,
  /\.local(\/|$)/, /(^|\/)__pycache__\//, /\.pyc$/, /\.log$/, /\.tmp$/, /(^|\/)\.DS_Store$/,
  /(^|\/)\.env(\.(?!example$)[^/]+)?$/,
];
const artwork = [/^frontend\/public\/(images|assets|thumbnails)\//, /^frontend\/public\/asset-manifest\.json$/];

const blockedJunk = staged.filter((file) => junk.some((pattern) => pattern.test(file)));
const blockedArt = process.env.ALLOW_ARTWORK === "1" ? [] : staged.filter((file) => artwork.some((pattern) => pattern.test(file)));

if (blockedJunk.length || blockedArt.length) {
  if (blockedJunk.length) console.error("Local files that do not belong in the project:\n  " + blockedJunk.join("\n  "));
  if (blockedArt.length) console.error("Artwork changes (generated live, never committed):\n  " + blockedArt.join("\n  ") +
    "\nSet ALLOW_ARTWORK=1 to commit artwork on purpose.");
  console.error("\nUnstage them with: git restore --staged <file>");
  process.exit(1);
}
