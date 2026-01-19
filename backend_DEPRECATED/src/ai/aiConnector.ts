import axios from "axios";
import prisma from "../database/prisma";
import dotenv from "dotenv";

dotenv.config();

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:8787";

let cachedProfessions: any[] | null = null;
let lastCacheTime = 0;

async function getProfessions() {
  const now = Date.now();
  if (cachedProfessions && (now - lastCacheTime < 300000)) return cachedProfessions;

  const rows = await prisma.professions.findMany({
    include: { service_categories: { select: { name: true } } }
  });

  cachedProfessions = rows.map(r => ({
    id: r.id, name: r.name, category_id: r.category_id, service_type: r.service_type, category_name: r.service_categories?.name
  }));
  lastCacheTime = now;
  return cachedProfessions;
}

export async function classifyText(text: string) {
  try {
    const useRemote = process.env.USE_REMOTE_AI === 'true';
    const url = useRemote ? `${AI_SERVICE_URL}/classify` : 'http://localhost:8787/classify';

    console.log(`[AI Connector] Classification request for "${text}" to ${url}`);

    const response = await axios.post(url, { text }, {
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const data = response.data;
    console.log(`[AI Connector] IA Service returned: id=${data.id}, name=${data.name}, score=${data.score}`);

    if (!data.id || data.id === 0 || data.score < 0.25) {
      console.log(`[AI Connector] Low score or no ID returned (${data.score}). Returning empty match.`);
      return { id: 0, name: "", score: data.score || 0 };
    }

    const professions = await getProfessions();
    const match = professions.find(p => Number(p.id) === Number(data.id));

    if (!match) {
      console.log(`[AI Connector] Profession ID ${data.id} (${data.name}) not found in DB cache. This might cause issues in the mobile app.`);
    } else {
      console.log(`[AI Connector] Local DB Match found: ${match.name} (ID: ${match.id})`);
    }

    return {
      id: data.id,
      name: data.name,
      score: data.score,
      category_id: match?.category_id || data.category_id,
      category_name: match?.category_name || data.category_name,
      service_type: match?.service_type || data.service_type || 'on_site',
      task_id: data.task_id,
      task_name: data.task_name,
      price: data.price,
      pricing_type: data.pricing_type,
      unit_name: data.unit_name,
      candidates: data.candidates || []
    };
  } catch (error: any) {
    console.error("[AI Connector] Error:", error.message);
    if (error.response) {
      console.error("[AI Connector] Response Error Data:", error.response.data);
    }
    return { id: 0, name: "", score: 0 };
  }
}

export async function findBestTask(userText: string, tasks: any[]) {
  return { task_id: null, confidence: 0, reasoning: "Fallback" };
}

export async function clearCache() { cachedProfessions = null; }
