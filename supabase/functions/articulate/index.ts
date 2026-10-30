import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { question, ageRange = "5-6" } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log(`Articulating question for age ${ageRange}: ${question}`);

    // Use fast model for quick articulation
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          {
            role: "system",
            content: `You are helping a child learn to ask questions well. Take their question and rephrase it into a clear, well-formed question.

RULES:
1. Keep it SHORT - one sentence only
2. Keep the same meaning and topic
3. Fix grammar and make it clearer
4. Use simple words appropriate for a child
5. Do NOT add any extra information or answers
6. Do NOT use any special formatting, asterisks, or markdown
7. Just output the rephrased question, nothing else
8. End with a question mark

Examples:
- "why sky blue" → "Why is the sky blue?"
- "dinosaurs where" → "Where did dinosaurs live?"
- "what dog eat" → "What do dogs eat?"
- "how big is sun" → "How big is the sun?"
- "why is water wet" → "Why is water wet?"`,
          },
          {
            role: "user",
            content: question,
          },
        ],
        max_tokens: 100,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      throw new Error(`AI error: ${response.status}`);
    }

    const data = await response.json();
    let articulatedQuestion = data.choices?.[0]?.message?.content || question;
    
    // Clean up any formatting artifacts
    articulatedQuestion = articulatedQuestion
      .replace(/\*+/g, "")
      .replace(/`/g, "")
      .replace(/^["']|["']$/g, "")
      .trim();
    
    // Ensure it ends with a question mark
    if (!articulatedQuestion.endsWith("?")) {
      articulatedQuestion += "?";
    }

    console.log(`Articulated: "${question}" → "${articulatedQuestion}"`);

    return new Response(
      JSON.stringify({ articulatedQuestion }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error articulating question:", error);
    // On error, just return the original question
    const { question } = await req.json().catch(() => ({ question: "" }));
    return new Response(
      JSON.stringify({ articulatedQuestion: question }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
