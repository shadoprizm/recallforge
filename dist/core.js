const TYPE_RULES = [
    { type: "fix", weight: 5, terms: ["fixed", "fix", "resolved", "root cause", "patched", "regression", "bug"] },
    { type: "decision", weight: 4, terms: ["decided", "decision", "chose", "selected", "because", "tradeoff"] },
    { type: "command", weight: 3, terms: ["npm", "pnpm", "curl", "gh", "git", "sqlite3", "python3", "npx"] },
    { type: "todo", weight: 3, terms: ["todo", "next step", "follow up", "remaining", "needs", "blocked"] }
];
const MAX_EXCERPT_LENGTH = 480;
function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
// Word-boundary matching so short terms like "fix" or "git" only match whole
// words ("fix", "fixes") and not substrings inside unrelated words
// ("prefix", "suffix", "fixture", "legit", "chosen").
const TERM_MATCHERS = new Map();
function termMatches(lowered, term) {
    let regex = TERM_MATCHERS.get(term);
    if (!regex) {
        regex = new RegExp(`\\b${escapeRegExp(term)}\\b`);
        TERM_MATCHERS.set(term, regex);
    }
    return regex.test(lowered);
}
function truncateExcerpt(text) {
    if (text.length <= MAX_EXCERPT_LENGTH)
        return text;
    const cut = text.slice(0, MAX_EXCERPT_LENGTH);
    const lastBreak = Math.max(cut.lastIndexOf(" "), cut.lastIndexOf("\n"));
    const safeCut = lastBreak > MAX_EXCERPT_LENGTH * 0.6 ? cut.slice(0, lastBreak) : cut;
    return `${safeCut.trimEnd()}…`;
}
export function splitTranscript(text) {
    return text
        .replace(/\r\n/g, "\n")
        .split(/\n{2,}|(?<=\.)\s+(?=[A-Z0-9])/)
        .map((chunk) => chunk.trim())
        .filter((chunk) => chunk.length > 40);
}
export function extractMemoryCards(inputs, limit = 18) {
    const cards = [];
    for (const input of inputs) {
        const chunks = splitTranscript(input.text);
        chunks.forEach((chunk, index) => {
            const lowered = chunk.toLowerCase();
            const matches = TYPE_RULES
                .map((rule) => ({
                type: rule.type,
                score: rule.terms.reduce((sum, term) => sum + (termMatches(lowered, term) ? rule.weight : 0), 0)
            }))
                .filter((match) => match.score > 0)
                .sort((a, b) => b.score - a.score);
            if (matches.length === 0)
                return;
            const best = matches[0];
            const title = summarizeTitle(chunk, best.type);
            cards.push({
                id: `${slug(input.name)}-${index}-${best.type}`,
                source: input.name,
                type: best.type,
                title,
                excerpt: truncateExcerpt(chunk),
                score: best.score + Math.min(5, Math.floor(chunk.length / 180))
            });
        });
    }
    return cards.sort((a, b) => b.score - a.score).slice(0, limit);
}
export function searchCards(cards, query) {
    const terms = query
        .toLowerCase()
        .split(/\s+/)
        .map((term) => term.trim())
        .filter(Boolean);
    if (terms.length === 0)
        return cards;
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
export function exportMarkdown(cards) {
    const body = cards
        .map((card) => `## ${card.title}\n\n- Type: ${card.type}\n- Source: ${card.source}\n- Score: ${card.score}\n\n${card.excerpt}`)
        .join("\n\n");
    return `# RecallForge Memory Cards\n\n${body}\n`;
}
function summarizeTitle(chunk, type) {
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
function slug(value) {
    return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "transcript";
}
