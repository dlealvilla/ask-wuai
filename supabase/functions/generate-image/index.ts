import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Build age-appropriate visual style guidelines
function getAgeStyle(ageRange: string, imageType: string): string {
  const baseAge = ageRange || "5-6";
  
  // Different base styles for different image types
  if (imageType === "realistic") {
    switch (baseAge) {
      case "3-4":
      case "5-6":
        return "realistic photograph style, gentle lighting, clear and simple composition, warm colors, friendly but accurate, no scary elements";
      case "7-8":
        return "realistic photograph or scientific illustration, clear details, educational, accurate proportions";
      default:
        return "highly realistic photograph or scientific rendering, detailed, accurate, educational";
    }
  }
  
  if (imageType === "cartoon") {
    switch (baseAge) {
      case "3-4":
      case "5-6":
        return "educational cartoon style like a children's science show, simple shapes, warm friendly colors, scientifically accurate proportions, NO anthropomorphization, Pixar-inspired but educational";
      case "7-8":
        return "educational animated style, clean lines, accurate scientific details shown in accessible way, like a quality educational animation";
      default:
        return "stylized educational illustration, modern clean animation style, scientifically accurate, detailed but accessible";
    }
  }
  
  if (imageType === "diagram") {
    switch (baseAge) {
      case "3-4":
      case "5-6":
        return "simple educational diagram, clear shapes, labeled parts shown visually, soft colors, very simple and clear";
      case "7-8":
        return "educational diagram or cross-section, clear visual labels, step-by-step if process, scientific illustration style";
      default:
        return "detailed scientific diagram, cross-section or technical illustration, educational infographic style, clear and informative";
    }
  }
  
  return "educational, realistic, scientifically accurate";
}

// Create an interpretive prompt for each image type
function createInterpretivePrompt(question: string, imageType: string, ageRange: string): string {
  const ageStyle = getAgeStyle(ageRange, imageType);
  
  // Core educational requirements
  const coreRequirements = `
CRITICAL REQUIREMENTS:
- Scientifically accurate and factually correct
- NO anthropomorphization (animals/objects must NOT have human expressions, clothing, or behaviors)
- Realistic proportions and anatomy even in stylized versions
- No text, labels, or watermarks burned into the image
- Safe for children, no scary or violent elements
- Clean composition that fits well in a mobile app view
- Square or landscape orientation preferred
`.trim();

  switch (imageType) {
    case "realistic":
      return `Create a REALISTIC photograph-style image answering: "${question}"

Show the real thing as it appears in nature or reality. Like a high-quality educational photograph.

Style: ${ageStyle}
${coreRequirements}`;

    case "cartoon":
      return `Create an EDUCATIONAL CARTOON/ANIMATION style illustration for: "${question}"

Make it visually engaging like a quality children's science show (Think: Magic School Bus educational accuracy, Pixar visual appeal). Must be scientifically accurate - animals look like real animals, just stylized. NO anthropomorphization.

Style: ${ageStyle}
${coreRequirements}`;

    case "diagram":
      return `Create an EDUCATIONAL DIAGRAM or INFOGRAPHIC showing: "${question}"

Show the inner workings, process, or structure. Use cross-sections, labeled visuals, or step-by-step illustrations to explain the concept clearly.

Style: ${ageStyle}
${coreRequirements}`;

    default:
      return `Educational illustration: ${question}. Style: ${ageStyle}. ${coreRequirements}`;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, ageRange, imageType = "main" } = await req.json();
    
    if (!prompt) {
      return new Response(
        JSON.stringify({ error: "Prompt is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Create the interpretive educational prompt
    const enhancedPrompt = createInterpretivePrompt(prompt, imageType, ageRange || "5-6");
    
    console.log(`Generating ${imageType} image for age ${ageRange}:`, enhancedPrompt.substring(0, 200));

    // Use latest Gemini image generation model with timeout
    let imageUrl: string | null = null;
    let modelUsed: string | null = null;
    const GENERATION_TIMEOUT = 30000; // 30 seconds max
    
    // Try latest Gemini 3 Pro image model first, fallback to Gemini 2.5 Flash
    const modelsToTry = [
      "google/gemini-3-pro-image-preview", // Latest model
      "google/gemini-2.5-flash-image-preview", // Fallback
    ];
    
    let lastError: Error | null = null;
    
    for (const model of modelsToTry) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), GENERATION_TIMEOUT);
        
        console.log(`Attempting image generation with model: ${model}`);
        
        const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: model,
            messages: [
              {
                role: "user",
                content: `Generate an image (DO NOT describe it, CREATE the actual image): ${enhancedPrompt}`,
              },
            ],
            modalities: ["image", "text"],
          }),
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Model ${model} error:`, response.status, errorText);
          
          if (response.status === 429) {
            return new Response(
              JSON.stringify({ error: "Rate limit exceeded, please try again later" }),
              { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
          if (response.status === 402) {
            return new Response(
              JSON.stringify({ error: "AI credits exhausted" }),
              { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
          
          // If this isn't the last model, try the next one
          if (model !== modelsToTry[modelsToTry.length - 1]) {
            console.log(`Model ${model} failed, trying next model...`);
            lastError = new Error(`Model ${model} failed: ${response.status}`);
            continue; // Try next model
          }
          
          throw new Error(`Image generation failed: ${response.status}`);
        }

        const data = await response.json();
        imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

        if (!imageUrl) {
          console.log(`Model ${model} returned text instead of image`);
          if (model !== modelsToTry[modelsToTry.length - 1]) {
            lastError = new Error("Model returned text instead of image");
            continue; // Try next model
          }
          throw new Error("Model returned text instead of image");
        }
        
        // Success! Track which model was used and break out of the loop
        modelUsed = model;
        console.log(`Successfully generated image using model: ${model}`);
        break;
        
      } catch (fetchError: any) {
        if (fetchError.name === 'AbortError') {
          console.error("Image generation timeout after 30 seconds");
          if (model !== modelsToTry[modelsToTry.length - 1]) {
            lastError = new Error("Image generation timed out");
            continue; // Try next model
          }
          throw new Error("Image generation timed out");
        }
        
        // If this isn't the last model, try the next one
        if (model !== modelsToTry[modelsToTry.length - 1]) {
          console.log(`Model ${model} error, trying next model:`, fetchError.message);
          lastError = fetchError;
          continue;
        }
        
        throw fetchError;
      }
    }

    if (!imageUrl) {
      console.error(`Failed to generate image with all models. Last error:`, lastError?.message);
      return new Response(
        JSON.stringify({ error: lastError?.message || "Image generation unavailable, please try again" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Format model name for display
    let modelDisplayName = "Unknown";
    if (modelUsed) {
      if (modelUsed.includes("gemini-3-pro")) {
        modelDisplayName = "Gemini 3 Pro";
      } else if (modelUsed.includes("gemini-2.5-flash")) {
        modelDisplayName = "Gemini 2.5 Flash";
      } else {
        modelDisplayName = modelUsed.replace("google/", "").replace("-image-preview", "").replace(/-/g, " ");
      }
    }

    console.log(`Successfully generated ${imageType} image using ${modelUsed || "unknown"}`);

    return new Response(
      JSON.stringify({ 
        imageUrl, 
        imageType, 
        prompt: enhancedPrompt,
        modelName: modelDisplayName
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in generate-image function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
