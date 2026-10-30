import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface MECEImagePlan {
  prompt1: string; // Main visual answer
  prompt2: string; // How/Why explanation
  prompt3: string; // Evidence/Example 1
}

// Montessori/techy aesthetic style suffix
const STYLE_SUFFIX = `Style: Modern Montessori educational illustration. Soft pastel earthy colors (sage green, warm sand, terracotta, cream). Clean minimalist design with gentle rounded shapes. Natural textures. Warm, inviting, child-friendly. No text or labels. High quality, professional illustration.`;

// Generate MECE prompts for AI image generation
async function generateMECEPlan(question: string, apiKey: string): Promise<MECEImagePlan> {
  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [{
          role: "user",
          content: `Child asked: "${question}"

Create 3 image generation prompts to visually teach this concept. Each should be a detailed scene description.

1. Main concept - the primary visual answer showing the key subject
2. How it works - showing the mechanism, process, or explanation
3. Example/context - showing the subject in its natural environment or a real-world example

Be specific and descriptive. Focus on what should be visible in each image.

JSON only:
{"prompt1":"...","prompt2":"...","prompt3":"..."}`
        }],
        max_tokens: 300,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || "";
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const plan = JSON.parse(jsonMatch[0]);
        console.log("MECE image prompts generated:", Object.values(plan).join(" | "));
        return plan;
      }
    }
  } catch (error) {
    console.error("MECE plan error:", error);
  }
  
  // Fallback plan
  const subject = question.replace(/^(what|how|why|where|when|who|is|are|do|does|can|could|would|should)\s+/i, '').trim();
  return {
    prompt1: `A ${subject}, centered in frame, detailed and realistic`,
    prompt2: `Diagram showing how ${subject} works, cross-section view`,
    prompt3: `${subject} in its natural environment, wide shot`,
  };
}

// Generate image using Nano Banana (Gemini image model)
async function generateImage(prompt: string, apiKey: string): Promise<string | null> {
  try {
    const fullPrompt = `${prompt}. ${STYLE_SUFFIX}`;
    console.log("Generating image with prompt:", fullPrompt.substring(0, 100) + "...");
    
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-pro-image-preview",
        messages: [{
          role: "user",
          content: fullPrompt
        }],
        modalities: ["image", "text"]
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Image generation error:", response.status, errorText);
      return null;
    }

    const data = await response.json();
    
    // Extract image from response
    const images = data.choices?.[0]?.message?.images;
    if (images && images.length > 0) {
      const imageUrl = images[0]?.image_url?.url;
      if (imageUrl) {
        console.log("Image generated successfully");
        return imageUrl;
      }
    }
    
    console.log("No image in response");
    return null;
  } catch (error) {
    console.error("Image generation error:", error);
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { question, imageIndex, plan } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY not configured" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 1: Generate MECE plan (called first with no imageIndex)
    if (imageIndex === undefined || imageIndex === null) {
      console.log(`Generating MECE visual answer plan for: ${question}`);
      const mecePlan = await generateMECEPlan(question, LOVABLE_API_KEY);
      
      return new Response(
        JSON.stringify({ plan: mecePlan }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 2: Generate individual AI images
    // Only generate 3 images now (reduced from 5 for speed)
    console.log(`Generating AI image ${imageIndex} for: ${question}`);
    
    if (imageIndex >= 3) {
      // Only generate 3 images
      return new Response(
        JSON.stringify({ image: null, imageIndex }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    const promptKey = `prompt${imageIndex + 1}` as keyof MECEImagePlan;
    const prompt = plan[promptKey];
    
    if (!prompt) {
      return new Response(
        JSON.stringify({ image: null, imageIndex, error: "No prompt for this index" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    const imageUrl = await generateImage(prompt, LOVABLE_API_KEY);
    
    if (imageUrl) {
      return new Response(
        JSON.stringify({ 
          image: {
            url: imageUrl,
            alt: prompt,
            source: "ai-generated"
          }, 
          imageIndex 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ image: null, imageIndex }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in media function:", error);
    return new Response(
      JSON.stringify({ error: "Media generation failed" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
