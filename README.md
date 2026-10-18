# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

## AI Assistant

An in-app AI assistant (nav → **Assistant**) that helps with daily work:

- **Follow-ups** — list overdue/due-today items, create and update CRM follow-ups via chat
- **Quotes** — draft quotations in chat and download them as formatted Excel (`.xlsx`) files
- **Mind maps** — ask for a growth plan or time allocation; it is rendered as a mind map

It runs on a Vercel serverless function (`/api/agent`) using **free** LLM APIs, with a tool loop over your Supabase data.

### Setup

1. **Database** — run the `AGENT: quotes` and `AGENT: plans` sections at the bottom of [`supabase/schema.sql`](supabase/schema.sql) in the Supabase SQL Editor (safe to run on an existing install).

2. **Free LLM key** (one is enough):
   - [Google AI Studio](https://aistudio.google.com/api-key) — recommended, most generous free tier → env var `GEMINI_API_KEY`
   - [Groq Console](https://console.groq.com/keys) — fast fallback → env var `GROQ_API_KEY`

3. **Environment variables** (Vercel → Project → Settings → Environment Variables; locally in `.env.local`):

   | Variable | Required | Purpose |
   | --- | --- | --- |
   | `GEMINI_API_KEY` | yes* | Free Gemini API key (*or `GROQ_API_KEY`) |
   | `GROQ_API_KEY` | no | Fallback LLM (30 req/min, 1k req/day free) |
   | `QUOTE_COMPANY_NAME` | no | Company name on quote Excel (default "ELV Services") |
   | `CRON_SECRET` | no | Protects the daily digest cron (Vercel sends it automatically if set) |
   | `GEMINI_MODEL` / `GROQ_MODEL` | no | Override default models (`gemini-2.5-flash` / `llama-3.3-70b-versatile`) |

4. **Deploy** — push to Vercel; `/api/*` functions build automatically. A daily follow-up digest cron (06:00 UTC) is defined in `vercel.json` and shown as chips on the Assistant page.

### Local development

`npm run dev` serves the frontend only. To exercise the API functions locally, use [`vercel dev`](https://vercel.com/docs/cli/dev) with the same env vars. Type-check the API with `npm run typecheck:api`.

### Notes

- The assistant is visible to users with CRM access (`crm:view`).
- Free-tier rate limits apply (Gemini quotas are per project, shown in AI Studio). Gemini free-tier content may be used by Google to improve its services — avoid pasting highly sensitive data.
- API security currently matches the rest of the app (anon Supabase key); harden with real auth before exposing publicly.
