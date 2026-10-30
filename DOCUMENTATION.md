# Wuai - Technical Documentation

## Table of Contents
1. [Overview](#overview)
2. [Product Concept](#product-concept)
3. [Technology Stack](#technology-stack)
4. [Architecture](#architecture)
5. [Design System](#design-system)
6. [Features](#features)
7. [Backend Edge Functions](#backend-edge-functions)
8. [System Prompts](#system-prompts)
9. [Voice Implementation](#voice-implementation)
10. [Media Generation](#media-generation)
11. [Authentication & User Management](#authentication--user-management)
12. [Settings & Configuration](#settings--configuration)
13. [Database Schema](#database-schema)
14. [Platform-Specific Considerations](#platform-specific-considerations)

---

## Overview

**Wuai** is a mobile-first, single-page web application designed for children ages 3-12. It enables children to ask voice questions and receive age-appropriate spoken answers with supporting educational AI-generated media. The app is designed to run in a browser (iOS Safari, Android Chrome) and behave like a native app.

### Key Capabilities
- Voice input (speech-to-text)
- AI-generated educational answers
- Text-to-speech output (native + premium ElevenLabs voices)
- AI-generated educational images (realistic, cartoon, diagram styles)
- Multi-child profile support
- Parent controls and settings
- Q&A history tracking
- Visual sand timer for screen time management

---

## Product Concept

### Core Philosophy
- **Educational integrity**: All answers and media must be scientifically accurate and factually correct
- **Age-appropriate content**: Responses dynamically adjust complexity based on child's age range
- **Child-centered UX**: Minimal UI, maximum visual immersion, no scrolling, large touch targets
- **Parental control**: Parents manage settings, profiles, and can set screen time limits
- **Conversational context**: Follow-up questions maintain context for connected answers

### Target Experience
1. Child taps the "Ask" button
2. Child speaks their question
3. App immediately echoes the question back and says "Let me think, [Name]!"
4. AI generates an age-appropriate answer
5. Answer is spoken aloud while educational images display
6. Child can ask follow-up questions ("Why?", "Tell me more!")

---

## Technology Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for build tooling
- **Tailwind CSS** for styling
- **shadcn/ui** for component library
- **React Router** for navigation
- **Tanstack React Query** for data fetching

### Backend (Lovable Cloud / Supabase)
- **Supabase** for database, authentication, and edge functions
- **Deno** runtime for edge functions
- **PostgreSQL** database

### AI Services
- **Lovable AI Gateway** (primary) - Routes to:
  - `google/gemini-2.5-flash` (default for answers)
  - `google/gemini-2.5-flash-lite` (articulation, planning)
  - `google/gemini-2.5-flash-image-preview` (image generation)
  - `google/gemini-3-pro-image-preview` (MECE media generation)
  - `openai/gpt-5-mini` (fallback)
- **OpenAI Whisper** for speech-to-text (iOS transcription)
- **Perplexity API** (optional provider with image search)
- **ElevenLabs** for premium text-to-speech

### Typography
- **DM Sans** - Primary sans-serif font
- **Outfit** - Display/heading font
- **Fredoka** - Fun/playful font (used for "Wuai" logo)

---

## Architecture

### Application Structure
```
src/
├── components/           # React components
│   ├── ui/              # shadcn/ui components
│   ├── MainView.tsx     # Core app interface
│   ├── MediaGallery.tsx # Image display carousel
│   ├── MicButton.tsx    # Voice input button
│   ├── SquidMascot.tsx  # Animated mascot
│   └── ...
├── contexts/
│   └── SettingsContext.tsx  # Global settings state
├── hooks/
│   ├── useVoiceInput.ts     # Cross-platform voice input
│   ├── useSpeechSynthesis.ts # Native TTS
│   ├── useElevenLabsTTS.ts   # Premium TTS
│   └── useAuth.ts           # Authentication
├── pages/
│   ├── Index.tsx        # Main app entry
│   ├── Landing.tsx      # Marketing/demo page
│   ├── Auth.tsx         # Login/signup
│   └── AuthCallback.tsx # OAuth callback handler
├── utils/
│   └── platform.ts      # Platform detection
└── integrations/
    └── supabase/        # Supabase client & types

supabase/functions/      # Edge functions (backend)
├── answer/              # AI answer generation
├── articulate/          # Question rephrasing
├── generate-image/      # Single image generation
├── media/               # MECE image plan generation
├── transcribe/          # Audio transcription (Whisper)
├── elevenlabs-tts/      # Premium voice synthesis
└── unsplash/            # (legacy) Photo search
```

### Data Flow

```
[Child Voice] → [Voice Input Hook] → [Transcription]
                                           ↓
                              [Articulate Edge Function]
                                           ↓
                              [Answer Edge Function]
                                           ↓
                    [Generate-Image Edge Function (x3)]
                                           ↓
                    [Text-to-Speech] + [MediaGallery Display]
```

---

## Design System

### Color Palette

**Light Mode (Primary)**
| Token | HSL Value | Usage |
|-------|-----------|-------|
| `--primary` | `145 65% 42%` | Lime green - main brand color |
| `--accent` | `270 70% 60%` | Violet - accent/highlight |
| `--background` | `0 0% 100%` | White background |
| `--foreground` | `220 10% 25%` | Dark gray text |
| `--muted` | `220 5% 96%` | Light gray for muted elements |

**Semantic Colors**
- `--bubble-child`: Light lime background for question bubbles
- `--bubble-assistant`: White with shadow for answer bubbles
- `--mic-gradient-start/end`: Gradient for mic button
- `--mic-listening`: Violet for active listening state

### Typography Scale
- **font-sans**: DM Sans (body text)
- **font-display**: Outfit (headings)
- **font-fun**: Fredoka (playful elements, logo)

### Animation Tokens
- `animate-pulse-ring`: Pulsing ring effect for mic
- `animate-bounce-gentle`: Subtle bounce (2.5s cycle)
- `animate-float`: Floating effect (4s cycle)
- `animate-breathe`: Breathing scale (4s cycle)
- `animate-fade-in-up`: Entry animation

### Shadow Tokens
- `shadow-clean`: Subtle card shadow
- `shadow-clean-lg`: Larger shadow for elevated elements
- `shadow-glow`: Primary color glow
- `shadow-glow-accent`: Accent color glow

---

## Features

### 1. Voice Input
- **Web Speech API** (Chrome/Android): Native browser speech recognition
- **Custom Recorder** (iOS): MediaRecorder + OpenAI Whisper transcription
- **Timeouts**: 5s silence timeout, 8s max recording duration
- **Feedback**: Immediate question echo while processing

### 2. Question Articulation
Questions are rephrased for clarity and grammar while preserving meaning. This:
- Confirms the question was understood
- Teaches children proper question formation
- Provides cleaner input for AI answer generation

### 3. AI Answers
- Calibrated to child's age range (3-4, 5-6, 7-8, 9-10, 11-12)
- Adjustable length via `answerLength` setting (0.5x to 2.0x)
- Depth levels for follow-up questions (1-4)
- Conversation context maintained for connected answers
- No markdown or formatting (optimized for TTS)
- Personalized with child's name

### 4. Educational Media
Three AI-generated images per answer:
1. **Realistic**: Photo-style educational image
2. **Cartoon**: Educational animation style (scientifically accurate)
3. **Diagram**: Infographic or cross-section

### 5. Text-to-Speech
- **Native voices**: Browser's speechSynthesis API
- **Premium voices**: ElevenLabs with 6 curated child-friendly voices
- **Speed control**: 0.75x to 1.25x range
- **iOS resilience**: Chunked utterances to prevent 15s timeout

### 6. Sand Timer
- Visual countdown timer (1-60 minutes)
- Parent-configurable screen time limit
- Visible during active use

### 7. Multi-Child Profiles
- Up to 5 child profiles per parent account
- Quick-switch buttons in header
- Per-child age range and settings
- Q&A history tagged by child

### 8. Q&A History
- Persistent history for logged-in parents
- Color-coded by child
- Searchable/browsable in sheet panel
- Click to replay past questions

---

## Backend Edge Functions

### `/answer` - Answer Generation

**Purpose**: Generate age-appropriate educational answers

**Input**:
```typescript
{
  question: string,
  ageRange: "3-4" | "5-6" | "7-8" | "9-10" | "11-12",
  depthLevel: 1 | 2 | 3 | 4,
  aiProvider: "gemini-flash" | "gemini-pro" | "gpt" | "perplexity",
  conversationHistory: Array<{role: string, content: string}>,
  answerLength: number, // 0.5 to 2.0
  childName: string
}
```

**Output**:
```typescript
{
  answer: string,
  depthLevel: number,
  providerUsed: string,
  perplexityImages?: string[] // Only if using Perplexity
}
```

**AI Providers**:
| Provider | Gateway | Model |
|----------|---------|-------|
| gemini-flash | lovable | google/gemini-2.5-flash |
| gemini-pro | lovable | google/gemini-2.5-pro |
| gpt | lovable | openai/gpt-5-mini |
| perplexity | perplexity | sonar-pro |

---

### `/articulate` - Question Rephrasing

**Purpose**: Clean up and rephrase child's question

**Input**:
```typescript
{
  question: string,
  ageRange?: string
}
```

**Output**:
```typescript
{
  articulatedQuestion: string
}
```

**Model**: `google/gemini-2.5-flash-lite` (fast)

---

### `/generate-image` - Single Image Generation

**Purpose**: Generate one educational image

**Input**:
```typescript
{
  prompt: string,
  ageRange: string,
  imageType: "realistic" | "cartoon" | "diagram"
}
```

**Output**:
```typescript
{
  imageUrl: string,
  imageType: string,
  prompt: string
}
```

**Model**: `google/gemini-2.5-flash-image-preview`

---

### `/media` - MECE Image Planning

**Purpose**: Generate structured image prompt plan

**Input**:
```typescript
{
  question: string,
  imageIndex?: number,
  plan?: MECEImagePlan
}
```

**Step 1 Output** (no imageIndex):
```typescript
{
  plan: {
    prompt1: string, // Main concept
    prompt2: string, // How it works
    prompt3: string  // Example/context
  }
}
```

**Step 2 Output** (with imageIndex):
```typescript
{
  image: {
    url: string,
    alt: string,
    source: "ai-generated"
  },
  imageIndex: number
}
```

**Models**: 
- Planning: `google/gemini-2.5-flash-lite`
- Generation: `google/gemini-3-pro-image-preview`

---

### `/transcribe` - Audio Transcription

**Purpose**: Convert audio to text (iOS voice input)

**Input**:
```typescript
{
  audio: string, // Base64 encoded
  mimeType: string // "audio/webm" | "audio/mp4" | etc.
}
```

**Output**:
```typescript
{
  text: string
}
```

**Service**: OpenAI Whisper API (`whisper-1`)

---

### `/elevenlabs-tts` - Premium Text-to-Speech

**Purpose**: Generate high-quality spoken audio

**Input**:
```typescript
{
  text: string,
  voiceId: string,
  speed?: number
}
```

**Output**:
```typescript
{
  audioContent: string // Base64 MP3
}
```

**Service**: ElevenLabs API (`eleven_turbo_v2_5`)

---

## System Prompts

### Answer Generation System Prompt

```
You are a knowledgeable science educator for children.
You are talking to {ageDescription}
{nameInstruction}

RULES:
1. {depthInstruction}
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
12. Focus ONLY on answering the question - do not include any image descriptions, visual instructions, or keywords
```

**Age Descriptions**:
- `3-4`: "a 3-4 year old. Use simple words and short sentences. 2 sentences max."
- `5-6`: "a 5-6 year old. Use simple but accurate words. 2 sentences max."
- `7-8`: "a 7-8 year old. Use proper scientific terms with brief explanations. 3 sentences max."
- `9-10`: "a 9-10 year old. Use scientific terminology appropriately. 3 sentences max."
- `11-12`: "an 11-12 year old. Use full scientific vocabulary. 3 sentences max."

**Depth Instructions**:
- Level 1: "Give the simplest possible explanation."
- Level 2: "Add a bit more detail while staying age-appropriate."
- Level 3: "Provide a fuller explanation with more interesting facts."
- Level 4: "Give the most detailed age-appropriate explanation with examples and connections."

---

### Articulation System Prompt

```
You are helping a child learn to ask questions well. Take their question and rephrase it into a clear, well-formed question.

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
```

---

### Image Generation Prompts

**Realistic Style**:
```
Create a REALISTIC photograph-style image answering: "{question}"

Show the real thing as it appears in nature or reality. Like a high-quality educational photograph.

Style: {ageStyle}

CRITICAL REQUIREMENTS:
- Scientifically accurate and factually correct
- NO anthropomorphization (animals/objects must NOT have human expressions, clothing, or behaviors)
- Realistic proportions and anatomy even in stylized versions
- No text, labels, or watermarks burned into the image
- Safe for children, no scary or violent elements
- Clean composition that fits well in a mobile app view
- Square or landscape orientation preferred
```

**Cartoon Style**:
```
Create an EDUCATIONAL CARTOON/ANIMATION style illustration for: "{question}"

Make it visually engaging like a quality children's science show (Think: Magic School Bus educational accuracy, Pixar visual appeal). Must be scientifically accurate - animals look like real animals, just stylized. NO anthropomorphization.
```

**Diagram Style**:
```
Create an EDUCATIONAL DIAGRAM or INFOGRAPHIC showing: "{question}"

Show the inner workings, process, or structure. Use cross-sections, labeled visuals, or step-by-step illustrations to explain the concept clearly.
```

---

## Voice Implementation

### Cross-Platform Architecture

```typescript
// Platform detection (src/utils/platform.ts)
export const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
export const hasWebSpeech = "SpeechRecognition" in window || "webkitSpeechRecognition" in window;

// Use Web Speech API only on non-iOS platforms
export const useWebSpeech = !isIOS && hasWebSpeech;

// Use custom recorder + backend transcription on iOS
export const useCustomRecorder = isIOS;
```

### Web Speech API Path (Desktop/Android)
1. Initialize `SpeechRecognition` with `continuous: true`, `interimResults: true`
2. Set 5s silence timeout after last speech
3. Set 8s maximum recording duration
4. On `onend`, call transcription handler with final transcript

### Custom Recorder Path (iOS)
1. Check for embedded browser context (block in preview iframes)
2. Request microphone access via `getUserMedia`
3. Create `MediaRecorder` with best available format
4. Record audio chunks
5. On stop, convert to Base64 and send to `/transcribe` endpoint
6. OpenAI Whisper transcribes and returns text

### Text-to-Speech

**Native Speech Synthesis**:
- Uses `window.speechSynthesis` API
- Chunked utterances for iOS (prevents 15s timeout)
- Silent utterance on first interaction to unlock iOS audio

**ElevenLabs Premium Voices**:
```typescript
export const ELEVENLABS_VOICES = [
  { id: "EXAVITQu4vr4xnSDxMaL", name: "Sarah", gender: "female" },
  { id: "FGY2WhTYpPnrIDTdsKH5", name: "Laura", gender: "female" },
  { id: "pFZP5JQG7iQjIQuC4Bku", name: "Lily", gender: "female" },
  { id: "onwK4e9ZLuTAKqWW03F9", name: "Daniel", gender: "male" },
  { id: "JBFqnCBsd6RMkjVDRZzb", name: "George", gender: "male" },
  { id: "TX3LPaxmHKxFdv7VOQHJ", name: "Liam", gender: "male" },
];
```

---

## Media Generation

### Image Types

1. **Realistic** (`imageType: "realistic"`)
   - Photo-style educational imagery
   - High-quality, clear composition
   - Age-appropriate complexity

2. **Cartoon** (`imageType: "cartoon"`)
   - Educational animation style
   - Scientifically accurate (no anthropomorphization)
   - Pixar-inspired visual appeal

3. **Diagram** (`imageType: "diagram"`)
   - Infographics and cross-sections
   - Process explanations
   - Labeled visual elements

### Age-Appropriate Styling

| Age Range | Realistic | Cartoon | Diagram |
|-----------|-----------|---------|---------|
| 3-4, 5-6 | Gentle lighting, warm colors, simple | Simple shapes, friendly, Pixar-inspired | Very simple, clear shapes, soft colors |
| 7-8 | Clear details, educational | Clean lines, quality animation | Labels, step-by-step |
| 9-10, 11-12 | Highly realistic, detailed | Stylized but accurate | Technical, detailed infographics |

### Generation Flow
1. User asks question
2. Three parallel image generation requests (realistic, cartoon, diagram)
3. Each uses `/generate-image` with `google/gemini-2.5-flash-image-preview`
4. Images display progressively as they complete
5. Retry logic (up to 2 attempts) for failed generations

---

## Authentication & User Management

### OAuth Providers
- **Google** (primary)
- **Facebook**

### Authentication Flow
1. User clicks "Sign In" on Landing or Auth page
2. Supabase initiates OAuth flow
3. User authenticates with provider
4. Callback redirects to `/auth/callback`
5. `exchangeCodeForSession` finalizes session
6. Redirect to `/app` with authenticated user

### Session Management
- Supabase handles session persistence
- `onAuthStateChange` listener updates React state
- Settings sync to cloud when authenticated
- Guest mode supported (localStorage only)

---

## Settings & Configuration

### User Settings Schema

```typescript
interface Settings {
  ageRange: "3-4" | "5-6" | "7-8" | "9-10" | "11-12";
  childName: string;
  voiceInput: boolean;
  voiceOutput: boolean;
  selectedVoice: string; // Voice ID
  voiceSpeed: number; // 0.75 to 1.25
  showMedia: boolean;
  aiProvider: "gemini-flash" | "gemini-pro" | "gpt" | "perplexity";
  pin: string;
  timerMinutes: number; // 0-60
  answerLength: number; // 0.5 to 2.0 (default: 0.7)
  isLocked: boolean;
  questionHistory: QuestionHistoryItem[];
}
```

### Storage Strategy
- **Guest users**: localStorage only
- **Authenticated users**: localStorage + Supabase `user_settings` table
- Settings sync on login/update
- Child profiles stored in `children` table

---

## Database Schema

### Tables

**`profiles`**
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  email TEXT,
  display_name TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

**`children`**
```sql
CREATE TABLE children (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  age_range TEXT DEFAULT '5-6',
  avatar TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

**`user_settings`**
```sql
CREATE TABLE user_settings (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  age_range TEXT DEFAULT '5-6',
  child_name TEXT,
  voice_input BOOLEAN DEFAULT true,
  voice_output BOOLEAN DEFAULT true,
  selected_voice TEXT,
  voice_speed NUMERIC DEFAULT 1.0,
  show_media BOOLEAN DEFAULT true,
  ai_provider TEXT DEFAULT 'gpt',
  pin TEXT DEFAULT '1234',
  timer_minutes INTEGER DEFAULT 0,
  answer_length NUMERIC DEFAULT 0.7,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

**`qa_history`**
```sql
CREATE TABLE qa_history (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  child_id UUID REFERENCES children(id),
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  media_urls TEXT[],
  created_at TIMESTAMPTZ
);
```

---

## Platform-Specific Considerations

### iOS Safari
1. **Audio unlock**: Silent utterance required on first tap
2. **Speech synthesis timeout**: 15s max per utterance (chunked implementation)
3. **Web Speech API**: Not supported, use custom recorder + Whisper
4. **Embedded preview**: getUserMedia blocked, show friendly error

### iOS Chrome (CriOS)
- Same limitations as Safari (uses Safari's WebKit engine)

### Android Chrome
- Full Web Speech API support
- Standard speechSynthesis support
- No special handling needed

### Desktop Chrome
- Full feature support
- Best development/testing environment

---

## Environment Variables

### Client-Side (Vite)
```
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJ...
VITE_SUPABASE_PROJECT_ID=YOUR_PROJECT_REF
```

### Server-Side (Edge Function Secrets)
```
LOVABLE_API_KEY=***        # Lovable AI Gateway
OPENAI_API_KEY=***         # Whisper transcription
PERPLEXITY_API_KEY=***     # Optional: Perplexity provider
ELEVENLABS_API_KEY=***     # Premium TTS
UNSPLASH_ACCESS_KEY=***    # Legacy: photo search
```

---

## File Structure Reference

### Key Components
- `MainView.tsx`: Core app interface, question/answer flow
- `MediaGallery.tsx`: Image carousel with fullscreen support
- `MicButton.tsx`: Voice input trigger
- `SquidMascot.tsx`: Animated mascot SVG
- `AppMenu.tsx`: Parent settings menu
- `ChildrenManager.tsx`: Child profile CRUD
- `QAHistorySheet.tsx`: History panel
- `SandTimer.tsx`: Visual countdown timer

### Key Hooks
- `useVoiceInput.ts`: Cross-platform voice input
- `useSpeechSynthesis.ts`: Native TTS
- `useElevenLabsTTS.ts`: Premium TTS
- `useAuth.ts`: Authentication state

### Edge Functions
- `answer/index.ts`: AI answer generation
- `articulate/index.ts`: Question rephrasing
- `generate-image/index.ts`: Single image generation
- `media/index.ts`: MECE image planning
- `transcribe/index.ts`: Audio transcription
- `elevenlabs-tts/index.ts`: Premium TTS

---

## Version History

- **Current Name**: Wuai (formerly "Maiestro")
- **Primary Color**: Lime green (#2D9D5B)
- **Accent Color**: Violet
- **Font**: Fredoka (logo), DM Sans (body), Outfit (display)

---

*Documentation generated: December 2024*
