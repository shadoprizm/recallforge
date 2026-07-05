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
export declare function splitTranscript(text: string): string[];
export declare function extractMemoryCards(inputs: TranscriptInput[], limit?: number): MemoryCard[];
export declare function searchCards(cards: MemoryCard[], query: string): MemoryCard[];
export declare function exportMarkdown(cards: MemoryCard[]): string;
