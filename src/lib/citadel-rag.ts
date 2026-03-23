import type { DownloadedKnowledgePack, KnowledgeDocument } from '@/lib/citadel-storage';

export interface RankedDocument {
  packId: string;
  packTitle: string;
  doc: KnowledgeDocument;
  score: number;
}

function tokenize(input: string): string[] {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(token => token.length > 2);
}

function scoreDocument(queryTokens: string[], text: string): number {
  const haystack = text.toLowerCase();

  let score = 0;
  for (const token of queryTokens) {
    if (!haystack.includes(token)) {
      continue;
    }

    score += 1;

    const exactMatches = haystack.split(token).length - 1;
    score += Math.min(3, exactMatches) * 0.35;
  }

  return score;
}

export function rankKnowledgeDocuments(
  query: string,
  packs: DownloadedKnowledgePack[],
  limit = 4,
): RankedDocument[] {
  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) {
    return [];
  }

  const ranked: RankedDocument[] = [];

  for (const pack of packs) {
    for (const doc of pack.documents) {
      const text = `${doc.title}\n${doc.content}`;
      const score = scoreDocument(queryTokens, text);

      if (score > 0) {
        ranked.push({
          packId: pack.id,
          packTitle: pack.title,
          doc,
          score,
        });
      }
    }
  }

  ranked.sort((a, b) => b.score - a.score);
  return ranked.slice(0, limit);
}

export function buildKnowledgeContext(results: RankedDocument[]): string {
  if (results.length === 0) {
    return 'No matching offline documents were found for this prompt.';
  }

  const sections = results.map((result, index) => {
    const truncated = result.doc.content.length > 1500
      ? `${result.doc.content.slice(0, 1500)}...`
      : result.doc.content;

    return [
      `Source ${index + 1}: ${result.packTitle} / ${result.doc.title}`,
      truncated,
    ].join('\n');
  });

  return sections.join('\n\n---\n\n');
}
