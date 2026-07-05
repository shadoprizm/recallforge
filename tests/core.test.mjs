import assert from "node:assert/strict";
import { extractMemoryCards, exportMarkdown, searchCards } from "../dist/core.js";

const sample = [
  {
    name: "agent-run.md",
    text: `We fixed the deployment regression by moving GitHub Pages to the web directory and validating with curl.

Decision: chose a static client-side app because the first product should not require accounts or a database.

Next step: connect Stripe after proof of demand and add hosted sync only when teams request it.`
  }
];

const cards = extractMemoryCards(sample);

assert.equal(cards.length, 3);
assert.ok(cards.some((card) => card.type === "fix"));
assert.ok(cards.some((card) => card.type === "decision"));
assert.equal(searchCards(cards, "deployment")[0].type, "fix");
assert.ok(exportMarkdown(cards).includes("RecallForge Memory Cards"));

// Regression: word-boundary matching must not treat "fix" as a substring hit
// inside unrelated words like "prefix", "suffix", or "fixture".
const falsePositiveSample = [
  {
    name: "false-positive.md",
    text: `The config uses a naming prefix for every environment variable and the storage layer applies a project name suffix.
    A new database fixture was added for the integration tests and the migrations directory remained unchanged this sprint.`
  }
];
assert.equal(extractMemoryCards(falsePositiveSample).length, 0);

// Regression: long chunks must truncate on a word boundary with an ellipsis
// marker, not silently cut mid-word.
const longChunkSample = [
  {
    name: "long.md",
    text: `Fixed the ingest worker by rewriting the retry loop so that transient network failures back off exponentially instead of hammering the upstream API every second, which had been the root cause of the rate-limit bans reported by three separate customers over the last two weeks and was finally patched after a long investigation into the connection pool exhaustion pattern that only showed up under sustained load in production traffic across every region we operate in including the ones added most recently for the expansion into new markets this year`
  }
];
const [longCard] = extractMemoryCards(longChunkSample);
assert.ok(longCard.excerpt.length <= 481);
assert.ok(longCard.excerpt.endsWith("…"));
assert.ok(!longCard.excerpt.slice(0, -1).endsWith(" ") && !/\S-$/.test(longCard.excerpt.slice(0, -1)));

console.log("core tests passed");
