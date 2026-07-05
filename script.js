const transcriptEl = document.querySelector("#transcript");
const cardsEl = document.querySelector("#cards");
const statsEl = document.querySelector("#stats");
const searchEl = document.querySelector("#search");
const typeFilterEl = document.querySelector("#type-filter");
const fileInputEl = document.querySelector("#file-input");
const apiKeyEl = document.querySelector("#api-key");

const rules = [
  { type: "fix", weight: 5, terms: ["fixed", "fix", "resolved", "root cause", "patched", "regression", "bug"] },
  { type: "decision", weight: 4, terms: ["decided", "decision", "chose", "selected", "because", "tradeoff"] },
  { type: "command", weight: 3, terms: ["npm", "pnpm", "curl", "gh", "git", "sqlite3", "python3", "npx"] },
  { type: "todo", weight: 3, terms: ["todo", "next step", "follow up", "remaining", "needs", "blocked"] }
];

const MAX_EXCERPT_LENGTH = 480;

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Word-boundary matching so short terms like "fix" or "git" only match whole words
// ("fix", "fixes") and not substrings inside unrelated words ("prefix", "fixture", "chosen").
const termMatchers = new Map();
function termMatches(lowered, term) {
  let regex = termMatchers.get(term);
  if (!regex) {
    regex = new RegExp(`\\b${escapeRegExp(term)}\\b`);
    termMatchers.set(term, regex);
  }
  return regex.test(lowered);
}

function truncateExcerpt(text) {
  if (text.length <= MAX_EXCERPT_LENGTH) return text;
  const cut = text.slice(0, MAX_EXCERPT_LENGTH);
  const lastBreak = Math.max(cut.lastIndexOf(" "), cut.lastIndexOf("\n"));
  const safeCut = lastBreak > MAX_EXCERPT_LENGTH * 0.6 ? cut.slice(0, lastBreak) : cut;
  return `${safeCut.trimEnd()}…`;
}

let cards = [];

const sample = `We fixed the GitHub Pages deployment regression by setting the Pages source to the /web directory and validating the public URL with curl before marking the product shipped.

Decision: chose a static browser-only MVP because the first version should not require accounts, a database, or backend hosting.

Command pattern: gh repo create shadoprizm/recallforge --public --source=. --push, then gh api repos/shadoprizm/recallforge/pages -X POST -f source.branch=main -f source.path=/web.

Next step: connect Stripe after proof of demand and add hosted sync only when teams ask for shared memory libraries.`;

document.querySelector("#load-sample").addEventListener("click", () => {
  transcriptEl.value = sample;
  extract();
});

document.querySelector("#extract").addEventListener("click", extract);
document.querySelector("#export").addEventListener("click", exportMarkdown);
document.querySelector("#ai-polish").addEventListener("click", polishTopCard);
searchEl.addEventListener("input", render);
typeFilterEl.addEventListener("change", render);

fileInputEl.addEventListener("change", async (event) => {
  const files = Array.from(event.target.files || []);
  const text = await Promise.all(files.map((file) => file.text().then((body) => `\n\n# ${file.name}\n${body}`)));
  transcriptEl.value = `${transcriptEl.value}\n${text.join("\n")}`.trim();
  extract();
});

function extract() {
  cards = extractCards([{ name: "browser-input", text: transcriptEl.value }]);
  render();
}

function extractCards(inputs) {
  const found = [];
  for (const input of inputs) {
    splitTranscript(input.text).forEach((chunk, index) => {
      const lowered = chunk.toLowerCase();
      const matches = rules
        .map((rule) => ({
          type: rule.type,
          score: rule.terms.reduce((sum, term) => sum + (termMatches(lowered, term) ? rule.weight : 0), 0)
        }))
        .filter((match) => match.score > 0)
        .sort((a, b) => b.score - a.score);

      if (!matches.length) return;
      const best = matches[0];
      found.push({
        id: `${input.name}-${index}-${best.type}`,
        source: input.name,
        type: best.type,
        title: summarizeTitle(chunk, best.type),
        excerpt: truncateExcerpt(chunk),
        score: best.score + Math.min(5, Math.floor(chunk.length / 180))
      });
    });
  }
  return found.sort((a, b) => b.score - a.score).slice(0, 24);
}

function splitTranscript(text) {
  return text
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}|(?<=\.)\s+(?=[A-Z0-9])/)
    .map((chunk) => chunk.trim())
    .filter((chunk) => chunk.length > 40);
}

function summarizeTitle(chunk, type) {
  const prefix = {
    decision: "Decision",
    fix: "Reusable Fix",
    command: "Command Pattern",
    todo: "Follow-up"
  }[type];
  const cleaned = chunk.replace(/[`*_>#-]/g, "").replace(/\s+/g, " ").trim();
  const words = cleaned.split(" ");
  return `${prefix}: ${words.slice(0, 10).join(" ")}${words.length > 10 ? "..." : ""}`;
}

function render() {
  const query = searchEl.value.trim().toLowerCase();
  const type = typeFilterEl.value;
  const visible = cards.filter((card) => {
    const matchesType = type === "all" || card.type === type;
    const haystack = `${card.title} ${card.excerpt} ${card.source}`.toLowerCase();
    const matchesQuery = !query || query.split(/\s+/).every((term) => haystack.includes(term));
    return matchesType && matchesQuery;
  });

  statsEl.textContent = cards.length
    ? `${visible.length} of ${cards.length} cards shown. ${cards.filter((card) => card.type === "fix").length} reusable fixes found.`
    : "No cards yet.";

  cardsEl.innerHTML = visible
    .map(
      (card) => `<article class="card">
        <div class="card-top"><span class="pill">${escapeHtml(card.type)}</span><span>${escapeHtml(card.source)} | score ${card.score}</span></div>
        <h3>${escapeHtml(card.title)}</h3>
        <p>${escapeHtml(card.excerpt)}</p>
      </article>`
    )
    .join("");
}

async function polishTopCard() {
  const key = apiKeyEl.value.trim();
  if (!key) {
    statsEl.textContent = "Add an OpenAI API key to polish the top card in your browser.";
    return;
  }
  if (!cards.length) extract();
  if (!cards.length) return;

  const top = cards[0];
  statsEl.textContent = "Polishing top card with your API key...";
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "Rewrite rough agent transcript notes into concise reusable engineering memory cards." },
          { role: "user", content: `Title: ${top.title}\nExcerpt: ${top.excerpt}\nReturn a better title and a 2 sentence reusable note.` }
        ],
        temperature: 0.2
      })
    });
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!response.ok || !content) throw new Error(data.error?.message || "No AI response");
    top.excerpt = content;
    top.title = "AI Polished: " + top.title.replace(/^AI Polished: /, "");
    render();
    statsEl.textContent = "Top card polished locally in your browser session.";
  } catch (error) {
    statsEl.textContent = `AI polish failed: ${error.message}`;
  }
}

function exportMarkdown() {
  if (!cards.length) extract();
  const markdown = `# RecallForge Memory Cards\n\n${cards
    .map((card) => `## ${card.title}\n\n- Type: ${card.type}\n- Source: ${card.source}\n- Score: ${card.score}\n\n${card.excerpt}`)
    .join("\n\n")}\n`;
  const blob = new Blob([markdown], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "recallforge-memory-cards.md";
  link.click();
  URL.revokeObjectURL(url);
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

transcriptEl.value = sample;
extract();
