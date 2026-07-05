export type TranscriptInput = {
  name: string;
  text: string;
};

export type MemoryCard = {
  id: string;
  source: string;
  type: "decision" | "fix" | "command" | "todo";
  title: string;
  excerpt: string;
  score: number;
};

const TYPE_RULES: Array<{ type: MemoryCard["type"]; weight: number; terms: string[] }> = [
  { type: "fix", weight: 5, terms: ["fixed", "fix", "resolved", "root cause", "patched", "regression"] },
  { type: "decision", weight: 4, terms: ["decided", "decision", "chose", "selected", "because", "tradeoff"] },
  { type: "command", weight: 3, terms: ["npm ", "pnpm ", "curl ", "gh ", "git ", "sqlite3 ", "python3 "] },
  { type: "todo", weight: 3, terms: ["todo", "next step", "follow up", "remaining", "needs"] }
];

export function splitTranscript(text: string): string[] {
  return text
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}|(?<=\.)\s+(?=[A-Z0-9])/)
    .map((chunk) => chunk.trim())
    .filter((chunk) => chunk.length > 40);
}

export function extractMemoryCards(inputs: TranscriptInput[], limit = 18): MemoryCard[] {
  const cards: MemoryCard[] = [];

  for (const input of inputs) {
    const chunks = splitTranscript(input.text);
    chunks.forEach((chunk, index) => {
      const lowered = chunk.toLowerCase();
      const matches = TYPE_RULES
        .map((rule) => ({
          type: rule.type,
          score: rule.terms.reduce((sum, term) => sum + (lowered.includes(term) ? rule.weight : 0), 0)
        }))
        .filter((match) => match.score > 0)
        .sort((a, b) => b.score - a.score);

      if (matches.length === 0) return;

      const best = matches[0];
      const title = summarizeTitle(chunk, best.type);
      cards.push({
        id: `${slug(input.name)}-${index}-${best.type}`,
        source: input.name,
        type: best.type,
        title,
        excerpt: chunk.slice(0, 420),
        score: best.score + Math.min(5, Math.floor(chunk.length / 180))
      });
    });
  }

  return cards.sort((a, b) => b.score - a.score).slice(0, limit);
}

export function searchCards(cards: MemoryCard[], query: string): MemoryCard[] {
  const terms = query
    .toLowerCase()
    .split(/\s+/)
    .map((term) => term.trim())
    .filter(Boolean);

  if (terms.length === 0) return cards;

  return cards
    .map((card) => {
      const haystack = `${card.title} ${card.excerpt} ${card.source} ${card.type}`.toLowerCase();
      const hits = terms.reduce((sum, term) => sum + (haystack.includes(term) ? 1 : 0), 0);
      return { card, hits };
    })
    .filter((entry) => entry.hits > 0)
    .sort((a, b) => b.hits - a.hits || b.card.score - a.card.score)
    .map((entry) => entry.card);
}

export function exportMarkdown(cards: MemoryCard[]): string {
  const body = cards
    .map((card) => `## ${card.title}\n\n- Type: ${card.type}\n- Source: ${card.source}\n- Score: ${card.score}\n\n${card.excerpt}`)
    .join("\n\n");
  return `# RecallForge Memory Cards\n\n${body}\n`;
}

function summarizeTitle(chunk: string, type: MemoryCard["type"]): string {
  const cleaned = chunk.replace(/[`*_>#-]/g, "").replace(/\s+/g, " ").trim();
  const words = cleaned.split(" ").slice(0, 10).join(" ");
  const prefix = {
    decision: "Decision",
    fix: "Reusable Fix",
    command: "Command Pattern",
    todo: "Follow-up"
  }[type];
  return `${prefix}: ${words}${cleaned.split(" ").length > 10 ? "..." : ""}`;
}

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "transcript";
}
