# Codebase Overview - Little Thinker AI

## How This Application Works

### Architecture

This is a **React + TypeScript** application built with:
- **Frontend**: React 18 with Vite
- **Backend**: Supabase (PostgreSQL database + Edge Functions)
- **UI**: shadcn/ui components with Tailwind CSS
- **State Management**: React Context API
- **Routing**: React Router v6

### Core Functionality

The app is an **AI-powered educational assistant for children** that:

1. **Accepts Questions**: Via voice input (Web Speech API or custom recorder for iOS) or text input
2. **Processes Questions**: Uses AI (GPT/Gemini/Perplexity) to generate age-appropriate answers
3. **Provides Answers**: Text-to-speech output with optional visual media (AI-generated images)
4. **Manages Multiple Children**: Parents can create profiles for multiple children with different age ranges
5. **Tracks History**: Saves Q&A history to the database

### Key Components

#### Frontend Structure

```
src/
├── components/
│   ├── MainView.tsx          # Main app interface
│   ├── MicButton.tsx         # Voice input button
│   ├── QuestionBubble.tsx    # Displays questions
│   ├── AnswerBubble.tsx      # Displays answers
│   ├── MediaGallery.tsx      # Shows images
│   ├── ChildrenManager.tsx   # Manage child profiles
│   └── ui/                   # shadcn/ui components
├── hooks/
│   ├── useVoiceInput.ts      # Voice recognition logic
│   ├── useSpeechSynthesis.ts # Text-to-speech (native)
│   ├── useElevenLabsTTS.ts   # Premium TTS (ElevenLabs)
│   └── useAuth.ts            # Authentication
├── contexts/
│   └── SettingsContext.tsx   # Global app settings
└── pages/
    ├── Landing.tsx           # Public landing page
    ├── Auth.tsx              # Login/signup
    └── Index.tsx             # Main app (protected)
```

#### Backend Structure (Supabase Edge Functions)

```
supabase/functions/
├── answer/          # Main AI answer generation
├── articulate/      # Rephrases questions for clarity
├── transcribe/      # Converts audio to text (iOS)
├── generate-image/  # Creates AI images
├── elevenlabs-tts/  # Premium text-to-speech
└── media/           # Media management
```

### Data Flow

1. **User asks a question** (voice or text)
   - Voice → `useVoiceInput` → transcription → `handleQuestion`
   - Text → `handleQuestion` directly

2. **Question processing**
   - Question is sent to `articulate` function (optional, for display)
   - Question is sent to `answer` function with:
     - Age range
     - Conversation history
     - AI provider preference
     - Answer length preference

3. **Answer generation**
   - `answer` function calls AI provider (GPT/Gemini/Perplexity)
   - Response is cleaned (removes markdown, formatting)
   - Returns answer text

4. **Answer delivery**
   - Answer displayed in UI
   - If voice output enabled → text-to-speech
   - If media enabled → generates 3 AI images in parallel

5. **History saving**
   - Q&A pair saved to `qa_history` table
   - Also stored in localStorage for offline access

### Authentication Flow

1. User visits `/auth` → redirected to canonical domain if on preview
2. OAuth (Google) or email/password login
3. Supabase handles authentication
4. On success → redirect to `/app`
5. `AuthRedirectGuard` ensures auth happens on canonical domain

### Settings & Multi-Child Support

- Settings stored in:
  - **localStorage**: For offline/guest access
  - **Database** (`user_settings` table): For logged-in users
- Each user can have multiple children
- Active child's settings (name, age range) used for AI responses
- Settings sync between localStorage and database

### Voice Input Implementation

**Desktop/Android**: Uses Web Speech API
- Continuous recognition
- Auto-stops after 5 seconds of silence
- Max 8 seconds duration

**iOS**: Uses custom MediaRecorder
- Records audio → sends to `transcribe` function
- Uses OpenAI Whisper for transcription
- Required because iOS Safari blocks Web Speech API in iframes

### Text-to-Speech

**Two options**:
1. **Native** (`useSpeechSynthesis`): Browser's built-in TTS
   - Free, works offline
   - Limited voice quality
   - iOS requires special handling (chunking)

2. **ElevenLabs** (`useElevenLabsTTS`): Premium TTS
   - High-quality, natural voices
   - Requires API call
   - Child-friendly voice selection

### AI Providers

The app supports multiple AI providers:
- **GPT-5 Mini**: Default, fast, reliable
- **Gemini Flash**: Google's fast model
- **Gemini Pro**: More detailed responses
- **Perplexity**: Includes real-time web search and images

Provider selection is in settings, with automatic fallback to GPT if selected provider fails.

### Database Schema

Key tables:
- `user_settings`: User preferences
- `children`: Child profiles (name, age_range, avatar)
- `qa_history`: Question/answer history with child reference

### Security

- Supabase Row Level Security (RLS) protects data
- API keys stored as environment variables
- CORS configured for API endpoints
- Authentication required for protected routes

---

## GitHub Integration

### Can You Push Changes Back to GitHub?

**Yes!** This repository is connected to GitHub. Here's how:

1. **Check Git Status**:
   ```bash
   git status
   ```

2. **Stage Your Changes**:
   ```bash
   git add .
   # Or specific files:
   git add src/components/MainView.tsx
   ```

3. **Commit Your Changes**:
   ```bash
   git commit -m "Fix: Add missing dependencies in useCallback hooks"
   ```

4. **Push to GitHub**:
   ```bash
   git push origin main
   # Or your branch name if you're on a different branch
   ```

### Important Notes

- **Lovable Integration**: According to the README, this project is also connected to Lovable.dev. Changes made via Lovable will auto-commit to this repo, and changes pushed to GitHub will sync to Lovable.

- **Before Pushing**: 
  - Test your changes locally (`npm run dev`)
  - Check for linting errors (`npm run lint`)
  - Review the changes (`git diff`)

- **Branch Strategy**: If you want to be safe, create a branch first:
  ```bash
  git checkout -b bug-fixes
  # Make your changes
  git commit -m "Fix bugs"
  git push origin bug-fixes
  # Then create a PR on GitHub
  ```

### Current Changes Made

The following bug fixes have been applied:
1. ✅ Fixed missing dependencies in `useCallback` hooks
2. ✅ Fixed potential null reference in `main.tsx`
3. ✅ Improved race condition handling in media generation
4. ✅ Wrapped `handleTellMore` in `useCallback`

All changes are ready to be committed and pushed to GitHub!

