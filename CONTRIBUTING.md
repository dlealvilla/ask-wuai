# Contributing to Ask Wuai

Thanks for wanting to help! Ask Wuai answers kids' "but why?" questions out loud, with age-appropriate words and pictures. Contributions of any size are welcome.

## Getting started

1. Fork the repo and clone your fork.
2. Install dependencies: `npm install`
3. Copy your Supabase project URL and anon key into a local `.env` (see `DEPLOYMENT.md` for the variables).
4. Run the app: `npm run dev`
5. Before opening a PR, run `npm run lint` and `npm run build`.

The frontend is React + Vite. Paid AI, speech and image calls live in Supabase Edge Functions under `supabase/functions/`, so provider keys never reach the browser. Please keep it that way.

## Picking something to work on

- Look for issues labelled [good first issue](https://github.com/dlealvilla/askwuai/labels/good%20first%20issue) or [help wanted](https://github.com/dlealvilla/askwuai/labels/help%20wanted).
- Comment on the issue before you start so work isn't duplicated.
- Have an idea that isn't listed? Open an issue first so we can talk it through.

## Pull requests

- Open PRs against `main`, and keep each one small and focused.
- Describe what changed and how you tested it; screenshots help for UI changes.
- Remember the audience is young children: keep copy, images and answers kind and age-appropriate.

## Security

Please don't open public issues for security problems. Contact [@dlealvilla](https://github.com/dlealvilla) privately instead.
