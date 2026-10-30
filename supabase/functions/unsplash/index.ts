import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ImageSearchParams {
  query: string;
  perPage: number;
}

interface UnsplashImage {
  id: string;
  description: string | null;
  alt_description: string | null;
  thumbnail_url: string;
  full_url: string;
  photographer_name: string;
  photographer_profile_url: string;
}

// Helper: Extract topic from question
function extractTopic(question: string): string {
  // Remove common question words and punctuation
  const stopWords = [
    'why', 'how', 'what', 'when', 'where', 'who', 'which', 'is', 'are', 'do', 'does',
    'did', 'can', 'could', 'would', 'should', 'the', 'a', 'an', 'and', 'or', 'but',
    'to', 'of', 'in', 'on', 'for', 'with', 'about', 'me', 'tell', 'explain', 'please',
    'i', 'want', 'know', 'learn', 'understand', 'really', 'actually', 'just'
  ];
  
  let topic = question.toLowerCase()
    .replace(/[?!.,]/g, '')
    .split(' ')
    .filter(word => !stopWords.includes(word) && word.length > 2)
    .slice(0, 4)
    .join(' ');
  
  return topic || question.slice(0, 30);
}

// Helper: Build age-appropriate Unsplash search query
function buildUnsplashSearchParams(question: string, ageRange: string): ImageSearchParams {
  const topic = extractTopic(question);
  
  // Parse age from ageRange (e.g., "3-4" -> 3, "9-10" -> 9)
  const minAge = parseInt(ageRange.split('-')[0], 10) || 5;
  
  let styleModifiers: string[];
  
  if (minAge <= 5) {
    // Ages 3-5: Cute, cartoon-like, very kid-friendly
    styleModifiers = ['cute cartoon', 'illustration', 'for kids', 'colorful'];
  } else if (minAge <= 8) {
    // Ages 6-8: Illustrations and simple photos
    styleModifiers = ['illustration', 'simple diagram', 'for children', 'educational'];
  } else {
    // Ages 9-12: More realistic, educational
    styleModifiers = ['photo', 'diagram', 'educational', 'nature'];
  }
  
  // Build query with age-appropriate modifiers
  const query = `${topic} ${styleModifiers[0]} ${styleModifiers[1]}`.trim();
  
  console.log(`[Unsplash] Age range: ${ageRange}, Min age: ${minAge}, Query: "${query}"`);
  
  return {
    query,
    perPage: 5, // Fetch 5, return top 3
  };
}

// Fetch images from Unsplash API - optimized for speed
async function fetchUnsplashImages(params: ImageSearchParams, accessKey: string): Promise<UnsplashImage[]> {
  const url = new URL('https://api.unsplash.com/search/photos');
  url.searchParams.set('query', params.query);
  url.searchParams.set('per_page', '3'); // Only fetch 3
  url.searchParams.set('content_filter', 'high'); // Strictest content filter
  url.searchParams.set('orientation', 'landscape');
  
  console.log(`[Unsplash] Fetching: ${url.toString()}`);
  
  const response = await fetch(url.toString(), {
    headers: {
      'Authorization': `Client-ID ${accessKey}`,
      'Accept-Version': 'v1',
    },
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[Unsplash] API error: ${response.status} - ${errorText}`);
    throw new Error(`Unsplash API error: ${response.status}`);
  }
  
  const data = await response.json();
  console.log(`[Unsplash] Found ${data.results?.length || 0} images`);
  
  // Use 'regular' size (1080px) for good quality but fast loading
  const images: UnsplashImage[] = (data.results || []).map((photo: any) => ({
    id: photo.id,
    description: photo.description,
    alt_description: photo.alt_description || params.query,
    thumbnail_url: photo.urls?.small,
    full_url: photo.urls?.regular, // 1080px width - optimal for mobile
    photographer_name: photo.user?.name || 'Unknown',
    photographer_profile_url: photo.user?.links?.html || 'https://unsplash.com',
  }));
  
  return images;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    const { question, ageRange = '5-6' } = await req.json();
    
    if (!question) {
      return new Response(
        JSON.stringify({ error: 'Question is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const accessKey = Deno.env.get('UNSPLASH_ACCESS_KEY');
    if (!accessKey) {
      console.error('[Unsplash] UNSPLASH_ACCESS_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Unsplash not configured', images: [] }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log(`[Unsplash] Processing question: "${question}" for age range: ${ageRange}`);
    
    // Build age-appropriate search params
    const searchParams = buildUnsplashSearchParams(question, ageRange);
    
    // Fetch images from Unsplash
    const images = await fetchUnsplashImages(searchParams, accessKey);
    
    console.log(`[Unsplash] Returning ${images.length} images`);
    
    return new Response(
      JSON.stringify({ images }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Unsplash] Error:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage, images: [] }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
