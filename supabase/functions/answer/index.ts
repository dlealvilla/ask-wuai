import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Base sentence counts for ~15 second read time (default answerLength = 1.0)
const baseSentenceCounts: Record<string, { base: number; age: string }> = {
  "3-4": { base: 2, age: "a 3-4 year old. Use simple words and short sentences." },
  "5-6": { base: 2, age: "a 5-6 year old. Use simple but accurate words." },
  "7-8": { base: 3, age: "a 7-8 year old. Use proper scientific terms with brief explanations." },
  "9-10": { base: 3, age: "a 9-10 year old. Use scientific terminology appropriately." },
  "11-12": { base: 3, age: "an 11-12 year old. Use full scientific vocabulary." },
};

function getAgeDescription(ageRange: string, answerLength: number): string {
  const config = baseSentenceCounts[ageRange] || baseSentenceCounts["5-6"];
  const sentences = Math.max(1, Math.round(config.base * answerLength));
  return `${config.age} ${sentences} sentences max.`;
}

const providerModels: Record<string, { gateway: string; model: string }> = {
  "gemini-pro": { gateway: "lovable", model: "google/gemini-2.5-pro" },
  "gpt": { gateway: "lovable", model: "openai/gpt-5-mini" },
  "perplexity": { gateway: "perplexity", model: "sonar" },
};


const ALLOWED_AGE_RANGES = new Set(Object.keys(baseSentenceCounts));
const DEFAULT_AGE_RANGE = "5-6";
const ALLOWED_PROVIDERS = new Set(Object.keys(providerModels));
const MAX_QUESTION_CHARS = 2000;
const MAX_CHILD_NAME_CHARS = 80;
const MAX_HISTORY_MESSAGES = 20;
const MAX_HISTORY_CONTENT_CHARS = 4000;
const MIN_DEPTH = 1;
const MAX_DEPTH = 4;
const MIN_ANSWER_LENGTH = 0.5;
const MAX_ANSWER_LENGTH = 2;

type HistoryMessage = { role?: unknown; content?: unknown };

function jsonError(message: string, status = 400): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/** Validate and normalise the answer Edge Function body. Returns 400 Response on bad input. */
function parseAnswerBody(raw: unknown):
  | {
      ok: true;
      question: string;
      ageRange: string;
      depthLevel: number;
      aiProvider: string;
      conversationHistory: { role: string; content: string }[];
      answerLength: number;
      childName: string;
    }
  | { ok: false; response: Response } {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, response: jsonError("Request body must be a JSON object") };
  }
  const body = raw as Record<string, unknown>;

  if (typeof body.question !== "string") {
    return { ok: false, response: jsonError("question must be a non-empty string") };
  }
  const question = body.question.trim();
  if (!question) {
    return { ok: false, response: jsonError("question must be a non-empty string") };
  }
  if (question.length > MAX_QUESTION_CHARS) {
    return {
      ok: false,
      response: jsonError(`question must be at most ${MAX_QUESTION_CHARS} characters`),
    };
  }

  // Unknown or missing ageRange falls back to the default band (matches
  // getAgeDescription) so older child profiles stored as e.g. "4-6" keep working.
  const ageRange =
    typeof body.ageRange === "string" && ALLOWED_AGE_RANGES.has(body.ageRange)
      ? body.ageRange
      : DEFAULT_AGE_RANGE;

  // Unknown provider → 400 (document: reject, do not silently coerce)
  if (body.aiProvider !== undefined && body.aiProvider !== null) {
    if (typeof body.aiProvider !== "string" || !ALLOWED_PROVIDERS.has(body.aiProvider)) {
      return {
        ok: false,
        response: jsonError(
          `aiProvider must be one of: ${[...ALLOWED_PROVIDERS].join(", ")}`,
        ),
      };
    }
  }
  const aiProvider =
    typeof body.aiProvider === "string" ? body.aiProvider : "gpt";

  let depthLevel = 1;
  if (body.depthLevel !== undefined && body.depthLevel !== null) {
    if (typeof body.depthLevel !== "number" || !Number.isFinite(body.depthLevel)) {
      return { ok: false, response: jsonError("depthLevel must be a number from 1 to 4") };
    }
    depthLevel = Math.round(body.depthLevel);
    if (depthLevel < MIN_DEPTH || depthLevel > MAX_DEPTH) {
      return { ok: false, response: jsonError("depthLevel must be a number from 1 to 4") };
    }
  }

  let answerLength = 1.0;
  if (body.answerLength !== undefined && body.answerLength !== null) {
    if (typeof body.answerLength !== "number" || !Number.isFinite(body.answerLength)) {
      return {
        ok: false,
        response: jsonError(
          `answerLength must be a number between ${MIN_ANSWER_LENGTH} and ${MAX_ANSWER_LENGTH}`,
        ),
      };
    }
    answerLength = Math.min(
      MAX_ANSWER_LENGTH,
      Math.max(MIN_ANSWER_LENGTH, body.answerLength),
    );
  }

  let childName = "";
  if (body.childName !== undefined && body.childName !== null) {
    if (typeof body.childName !== "string") {
      return { ok: false, response: jsonError("childName must be a string") };
    }
    childName = body.childName.trim().slice(0, MAX_CHILD_NAME_CHARS);
  }

  let conversationHistory: { role: string; content: string }[] = [];
  if (body.conversationHistory !== undefined && body.conversationHistory !== null) {
    if (!Array.isArray(body.conversationHistory)) {
      return { ok: false, response: jsonError("conversationHistory must be an array") };
    }
    // The browser must not be able to inject system messages into the prompt.
    const allowedRoles = new Set(["user", "assistant"]);
    const sliced = body.conversationHistory.slice(-MAX_HISTORY_MESSAGES);
    for (const item of sliced as HistoryMessage[]) {
      if (!item || typeof item !== "object") {
        return {
          ok: false,
          response: jsonError("conversationHistory entries must be objects with role and content"),
        };
      }
      if (typeof item.role !== "string" || !allowedRoles.has(item.role)) {
        return {
          ok: false,
          response: jsonError("conversationHistory role must be user or assistant"),
        };
      }
      if (typeof item.content !== "string") {
        return {
          ok: false,
          response: jsonError("conversationHistory content must be a string"),
        };
      }
      const content = item.content.slice(0, MAX_HISTORY_CONTENT_CHARS);
      conversationHistory.push({ role: item.role, content });
    }
  }

  return {
    ok: true,
    question,
    ageRange,
    depthLevel,
    aiProvider,
    conversationHistory,
    answerLength,
    childName,
  };
}

async function callLovableAI(messages: any[], model: string, apiKey: string) {
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model, messages }),
  });

  if (!response.ok) {
    throw new Error(`Lovable AI error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}

async function callPerplexity(messages: any[], model: string, apiKey: string, ageDescription: string) {
  // Build Perplexity-specific system prompt with age filtering
  const perplexitySystemPrompt = `You are answering questions for ${ageDescription}

RULES:
1. Use simple, age-appropriate language
2. Be factual and educational
3. NEVER include reference numbers like [1], [2], etc. in your response
4. NEVER use markdown formatting, asterisks, or special characters
5. Write in plain conversational text only
6. Keep answers concise and engaging for children
7. NEVER discuss inappropriate topics for children`;

  // Replace system message with Perplexity-specific one
  const perplexityMessages = messages.map((msg, index) => 
    index === 0 && msg.role === "system" 
      ? { role: "system", content: perplexitySystemPrompt }
      : msg
  );

  const response = await fetch("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "sonar-pro", // Use sonar-pro for better image results
      messages: perplexityMessages,
      temperature: 0.7,
      max_tokens: 1000,
      return_images: true,
      return_related_questions: false,
      // Include high-quality educational image sources
      image_domain_filter: [
        "wikimedia.org",
        "britannica.com",
        "nationalgeographic.com",
        "smithsonianmag.com",
        "nasa.gov",
        "-gettyimages.com",  // Exclude watermarked images
        "-shutterstock.com"
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Perplexity error:", response.status, errorText);
    throw new Error(`Perplexity error: ${response.status}`);
  }

  const data = await response.json();
  console.log("Perplexity response images count:", data.images?.length || 0);
  const content = data.choices?.[0]?.message?.content || "";
  const images = data.images || [];
  
  return { content, images };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return jsonError("Request body must be valid JSON");
    }

    const parsed = parseAnswerBody(rawBody);
    if (!parsed.ok) {
      return parsed.response;
    }
    const {
      question,
      ageRange,
      depthLevel,
      aiProvider,
      conversationHistory,
      answerLength,
      childName,
    } = parsed;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const PERPLEXITY_API_KEY = Deno.env.get("PERPLEXITY_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log(`Processing question with ${aiProvider} for age ${ageRange}, depth ${depthLevel}, length ${answerLength}, child: ${childName}: ${question}`);
    console.log(`Conversation history length: ${conversationHistory.length}`);
    console.log(`🔍 Answer function received childName: "${childName}" (type: ${typeof childName}, length: ${childName?.length || 0})`);

    const ageDescription = getAgeDescription(ageRange, answerLength);
    // Only include name instruction if childName is provided and not empty
    const nameInstruction = childName && childName.trim() ? `The child's name is ${childName.trim()}. You may occasionally use their name naturally in your response to make it more personal, but don't overuse it.` : "";
    
    console.log(`🔍 System prompt nameInstruction: "${nameInstruction}"`);

    const depthInstructions = {
      1: "Give the simplest possible explanation.",
      2: "Add a bit more detail while staying age-appropriate.",
      3: "Provide a fuller explanation with more interesting facts.",
      4: "Give the most detailed age-appropriate explanation with examples and connections.",
    };

    const systemPrompt = `You are a knowledgeable science educator for children.
You are talking to ${ageDescription}
${nameInstruction}

RULES:
1. ${depthInstructions[depthLevel as keyof typeof depthInstructions] || depthInstructions[1]}
2. Be factual and scientific - give real information, not dumbed-down fluff
3. Use proper terminology but explain it briefly if needed for the age
4. Be concise and direct - no filler words or excessive enthusiasm
5. Treat the child as intelligent and curious, never condescending
6. NEVER discuss: violence, sexual content, scary topics, or inappropriate content
7. If asked about inappropriate topics, redirect to a related safe topic
8. NEVER use asterisks, markdown, or any special formatting - your response will be read aloud by text-to-speech
9. Write in plain conversational text only
10. If the child asks follow-up questions like "why?" or "how?" or "what about...?", use the conversation context to give a relevant connected answer
11. Make learning fun and engaging while staying accurate and educational
12. Focus ONLY on answering the question - do not include any image descriptions, visual instructions, or keywords`;

    // Build messages with conversation history for context
    const messages: any[] = [
      { role: "system", content: systemPrompt },
    ];

    // Add conversation history (previous Q&A pairs give context for follow-ups)
    for (const msg of conversationHistory) {
      messages.push({ role: msg.role, content: msg.content });
    }

    // Add current question
    messages.push({ role: "user", content: question });

    let fullAnswer = "";
    let providerUsed = aiProvider;
    let perplexityImages: string[] = [];

    // Determine which provider to use
    const providerConfig = providerModels[aiProvider] || providerModels["gpt"];

    try {
      if (providerConfig.gateway === "perplexity" && PERPLEXITY_API_KEY) {
        const result = await callPerplexity(messages, providerConfig.model, PERPLEXITY_API_KEY, ageDescription);
        fullAnswer = result.content;
        perplexityImages = result.images || [];
        console.log(`Used Perplexity successfully, got ${perplexityImages.length} images`);
      } else if (providerConfig.gateway === "perplexity" && !PERPLEXITY_API_KEY) {
        // Fallback to GPT if Perplexity not configured
        console.log("Perplexity not configured, falling back to GPT");
        fullAnswer = await callLovableAI(messages, "openai/gpt-5-mini", LOVABLE_API_KEY);
        providerUsed = "gpt";
      } else {
        // Use Lovable AI (Gemini or GPT)
        fullAnswer = await callLovableAI(messages, providerConfig.model, LOVABLE_API_KEY);
        console.log(`Used ${providerConfig.model} successfully`);
      }
    } catch (providerError) {
      // Fallback to GPT on any error
      console.error(`Provider ${aiProvider} failed, falling back to GPT:`, providerError);
      fullAnswer = await callLovableAI(messages, "openai/gpt-5-mini", LOVABLE_API_KEY);
      providerUsed = "gpt";
    }

    if (!fullAnswer) {
      fullAnswer = "Hmm, I'm not sure about that. Can you ask me something else?";
    }

    // Clean up any formatting artifacts - the answer should be plain text for TTS
    let answer = fullAnswer
      .replace(/\s*\[\s*\]\s*/g, "")           // Empty brackets
      .replace(/\[\d+\]/g, "")                 // Reference indices [1], [2], etc.
      .replace(/\*\*([^*]+)\*\*/g, "$1")       // **bold** -> text
      .replace(/\*([^*]+)\*/g, "$1")           // *italic* -> text  
      .replace(/\*+/g, "")                     // Stray asterisks
      .replace(/_([^_]+)_/g, "$1")             // _italic_ -> text
      .replace(/`([^`]+)`/g, "$1")             // `code` -> text
      .replace(/#{1,6}\s*/g, "")               // # headings
      .replace(/\n{2,}/g, " ")                 // Multiple newlines
      .replace(/\s{2,}/g, " ")                 // Multiple spaces
      .trim();

    console.log(`Answer generated with ${providerUsed}`);
    console.log(`Cleaned answer length: ${answer.length}`);

    return new Response(
      JSON.stringify({ 
        answer, 
        depthLevel, 
        providerUsed,
        perplexityImages,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in answer function:", error);
    return new Response(
      JSON.stringify({ 
        error: "Oops, I got a little confused. Can you try asking again?",
        answer: "Oops, I got a little confused. Can you try asking again?" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
