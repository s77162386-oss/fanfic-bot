import { logger } from "../lib/logger";
import type { Character } from "./story";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "llama-3.1-8b-instant";

interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

export async function generateStory(messages: Message[]): Promise<string> {
  const apiKey = process.env["GROQ_API_KEY"];
  if (!apiKey) {
    throw new Error("GROQ_API_KEY não configurada.");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);

  try {
    const response = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages,
        max_tokens: 300,
        temperature: 0.9,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const text = await response.text();
      logger.error({ status: response.status, text }, "Groq API error");
      throw new Error(`Groq error: ${response.status}`);
    }

    const data = (await response.json()) as {
      choices: { message: { content: string } }[];
    };

    const content = data.choices[0]?.message?.content ?? "";
    if (!content) throw new Error("Resposta vazia da IA");
    return content;
  } catch (err) {
    if ((err as Error).name === "AbortError") {
      throw new Error("A IA demorou demais para responder (timeout).");
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

export function buildSystemPrompt(character: Character): string {
  return `Você é um narrador de fanfics interativas em português brasileiro.
Crie histórias envolventes com o personagem do usuário como protagonista.

Personagem:
- Nome: ${character.name}
- Classe: ${character.classe}
- Traço: ${character.trait}

Regras OBRIGATÓRIAS:
- Escreva em português brasileiro
- Máximo 2 parágrafos curtos por resposta
- Ao final inclua EXATAMENTE 3 opções numeradas:
  [1] (opção curta)
  [2] (opção curta)
  [3] (opção curta)
- Cada opção: máximo 10 palavras
- Seja direto e envolvente`;
}
