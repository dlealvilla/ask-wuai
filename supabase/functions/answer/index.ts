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
    const { question, ageRange, depthLevel = 1, aiProvider = "gpt", conversationHistory = [], answerLength = 1.0, childName = "" } = await req.json();
    
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
