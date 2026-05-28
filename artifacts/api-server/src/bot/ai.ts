import { logger } from "../lib/logger";
import type { Character } from "./story";

const POLLINATIONS_URL = "https://text.pollinations.ai/openai";

interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

export async function generateStory(messages: Message[]): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25000);

  try {
    const response = await fetch(POLLINATIONS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "openai",
        messages,
        max_tokens: 220,
        temperature: 0.9,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const text = await response.text();
      logger.error({ status: response.status, text }, "Pollinations API error");
      throw new Error(`AI error: ${response.status}`);
    }

    const data = (await response.json()) as {
      choices: { message: { content: string } }[];
    };
    return data.choices[0]?.message?.content ?? "";
  } catch (err) {
    if ((err as Error).name === "AbortError") {
      throw new Error("A IA demorou demais para responder (timeout de 25s).");
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

export function buildSystemPrompt(character: Character): string {
  return `Você é um narrador de fanfics interativas em português brasileiro.
Seu trabalho é criar histórias envolventes e empolgantes com o personagem do usuário como protagonista.

Personagem do jogador:
- Nome: ${character.name}
- Classe: ${character.classe}
- Traço de personalidade: ${character.trait}

Regras OBRIGATÓRIAS:
- Escreva em português brasileiro
- O protagonista é sempre ${character.name}, um(a) ${character.classe} ${character.trait}
- Cada trecho deve ter NO MÁXIMO 1 parágrafo curto (máximo 3 frases)
- Ao final de CADA resposta, inclua EXATAMENTE 3 opções de escolha numeradas assim:
  [1] (texto curto da opção 1)
  [2] (texto curto da opção 2)
  [3] (texto curto da opção 3)
- As opções devem ser curtas (máximo 10 palavras cada)
- Mantenha consistência com as escolhas anteriores
- Seja direto e conciso — brevidade é essencial`;
}
