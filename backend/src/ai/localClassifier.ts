export async function classifyText(text: string) {
  return {
    id: 1,
    name: "Eletricista",
    score: 0.99,
    category_id: 1,
    category_name: "Manutenção",
  };
}

export async function embedTexts(texts: string[]): Promise<number[][]> {
  // Mock embedding - return random 384-dim vectors or zeros to satisfy build
  // In real app, this would call an embedding service
  return texts.map(() => Array(384).fill(0));
}

export function normalizeVec(vec: number[]): number[] {
  const mag = Math.sqrt(vec.reduce((sum, val) => sum + val * val, 0));
  return mag === 0 ? vec : vec.map((v) => v / mag);
}

export async function teachAI(
  text: string,
  categoryOrId: string | number,
  profession?: string,
) {
  console.log("[LocalClassifier] teachAI mock", text, categoryOrId, profession);
  return true;
}

export function clearCache() {
  console.log("[LocalClassifier] clearCache mock");
}
