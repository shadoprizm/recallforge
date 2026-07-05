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

console.log("core tests passed");
