
/**
 * Cerebras Cloud SDK Wrapper for Supabase Edge Functions (Deno)
 * Uses standard fetch for lightweight and fast execution.
 */

export class CerebrasService {
  private apiKey: string;
  private model: string;
  private baseUrl: string = 'https://api.cerebras.ai/v1/chat/completions';

  constructor(apiKey: string, model: string = 'llama3.1-8b') {
    this.apiKey = apiKey;
    this.model = model;
  }

  /**
   * Perfoms a completion request to Cerebras
   */
  async chat(prompt: string, temperature: number = 0.1, maxTokens: number = 200): Promise<string> {
    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          messages: [{ role: 'user', content: prompt }],
          temperature,
          max_completion_tokens: maxTokens,
        }),
      });

      if (!response.ok) {
        const err = await response.text();
        throw new Error(`Cerebras API Error: ${response.status} - ${err}`);
      }

      const data = await response.json();
      return data.choices[0].message.content.trim();
    } catch (error) {
      console.error('Error calling Cerebras:', error);
      throw error;
    }
  }

  /**
   * Expands a user query to a list of technical/semantic keywords
   */
  async expandQuery(userQuery: string): Promise<string> {
    const prompt = `Você é um assistente técnico de busca. 
Reescreva a frase do usuário como uma lista curta de termos de busca técnicos e sinônimos relacionados ao serviço solicitado.
Mantenha em português do Brasil.

Frase do usuário: "${userQuery}"

Resposta (apenas os termos, sem introdução):`;
    return this.chat(prompt, 0.3, 100);
  }

  /**
   * Defines the intent/profession from the query
   */
  async classifyProfession(query: string, professions: {id: number, name: string}[]): Promise<number | null> {
    const professionsList = professions.map(p => `${p.id}: ${p.name}`).join('\n');
    const prompt = `Dada a lista de profissões abaixo:
${professionsList}

Classifique a query do usuário em exatamente UMA destas profissões pelo ID. 
Se não houver nenhuma correspondência clara, responda 0.

Query do usuário: "${query}"

ID da profissão correspondente (apenas o número):`;
    
    const result = await this.chat(prompt, 0.1, 10);
    const id = parseInt(result);
    return isNaN(id) || id === 0 ? null : id;
  }
}
