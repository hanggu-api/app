import axios from "axios";
import pool from "../database/db";
import dotenv from "dotenv";

dotenv.config();

// Configuration for Local AI Service
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:8787";

// Cache professions to avoid hitting DB on every request (simple cache)
let cachedProfessions: any[] | null = null;
let lastCacheTime = 0;
const CACHE_TTL = 1000 * 60 * 5; // 5 minutes

async function getProfessions() {
  const now = Date.now();
  if (cachedProfessions && (now - lastCacheTime < CACHE_TTL)) {
    return cachedProfessions;
  }

  try {
    const [rows] = await pool.query(`
      SELECT p.id, p.name, p.category_id, p.service_type, c.name as category_name 
      FROM professions p 
      LEFT JOIN categories c ON p.category_id = c.id
    `);
    cachedProfessions = rows as any[];
    lastCacheTime = now;
    return cachedProfessions;
  } catch (error) {
    console.error("Error fetching professions:", error);
    return [];
  }
}

export async function classifyText(
  text: string,
): Promise<{
  id: number;
  name: string;
  score: number;
  category_id?: number;
  category_name?: string;
  explanation?: string;
  search_term?: string;
  task_id?: number;
  task_name?: string;
  price?: number;
  service_type?: string;
}> {
  try {
    console.log(`[AI Connector] Sending request to Local AI: ${text}`);
    
    // Call Local AI Service
    const response = await axios.post(`${AI_SERVICE_URL}/classify`, { text });
    const data = response.data;

    console.log(`[AI Connector] Response:`, data);

    // If score is too low, return empty
    if (data.score < 0.25) { // Adjusted threshold for cosine similarity
        return { id: 0, name: "", score: data.score };
    }

    // Enhance response with Category Name if missing (Local AI might not return it fully)
    let categoryName = data.category_name;
    let categoryId = data.category_id;
    let serviceType = 'on_site';

    // ALWAYS fetch professions to get service_type, even if AI returned category
    const professions = await getProfessions();
    const match = professions?.find(p => p.id === data.id);
    if (match) {
        if (!categoryName || categoryName === 'Geral') {
             categoryName = match.category_name;
             categoryId = match.category_id;
        }
        serviceType = match.service_type || 'on_site';
    }

    // Extract search term manually if AI doesn't provide it (Local AI doesn't yet)
    // Simple heuristic: remove stop words
    const stopwords = ["quero", "fazer", "uma", "um", "a", "o", "de", "da", "do", "em", "para", "com", "por", "preciso", "necessito", "gostaria", "busco", "prokuro", "serviço", "contratar", "fui"];
    const keywords = text
          .toLowerCase()
          .split(/[\s,.]+/)
          .filter(w => w.length > 2 && !stopwords.includes(w));
    
    const searchTerm = keywords.length > 0 ? keywords.join(" ") : text;

    return {
      id: data.id,
      name: data.name,
      score: data.score,
      category_id: categoryId,
      category_name: categoryName,
      explanation: `Identificado via IA Local (Score: ${data.score.toFixed(2)})`,
      search_term: searchTerm,
      task_id: data.task_id,
      task_name: data.task_name,
      price: data.price,
      service_type: serviceType
    };

  } catch (error) {
    console.error("AI Classification Error (Local AI):", error);
    // Fallback: If local AI fails, return empty so the backend can use SQL fallback
    return { id: 0, name: "", score: 0 };
  }
}

export async function findBestTask(
  userText: string,
  tasks: any[]
): Promise<{ task_id: number | null; confidence: number; reasoning: string }> {
  // Local AI doesn't support task matching yet, so we return null to force SQL fallback
  // or we could implement a basic embedding comparison here if needed.
  // For now, let's rely on the SQL fallback in services.ts which works well with keywords.
  return { task_id: null, confidence: 0, reasoning: "Local AI task matching not implemented yet" };
}

export async function clearCache() {
  cachedProfessions = null;
  console.log("[AI Connector] Cache cleared");
}

export async function teachAI(
  text: string,
  categoryOrId: string | number,
  profession?: string,
) {
  console.log("[AI Connector] teachAI: Logging feedback for future fine-tuning", { text, categoryOrId, profession });
  return true;
}
