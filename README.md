# Byte the Robot

A fun, kid-friendly chatbot for an elementary school career day. Byte is a cheerful blue robot who teaches kids ages 8–10 about coding, computers, and robots in 2–3 enthusiastic sentences.

Built with **Next.js 14**, **Tailwind CSS**, and the **Anthropic SDK** (`claude-sonnet-4-6`).

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Get an auth token

This app does **not** use an API key. Instead, generate an OAuth token with the Claude CLI:

```bash
claude setup-token
```

Copy the token it prints out.

### 3. Configure environment

Copy the example env file and paste in your token:

```bash
cp .env.local.example .env.local
```

Then edit `.env.local` so it reads:

```
ANTHROPIC_AUTH_TOKEN=...your token here...
```

### 4. Run the dev server

```bash
npm run dev
```

Open http://localhost:3000 and start chatting with Byte!

## How to use it on career day

- Tap one of the big yellow suggestion chips for a starter question.
- Or have a kid type their own question and press **Send** (or hit Enter).
- The robot's antenna glows yellow and his eyes wiggle while he's thinking.
- Designed with big fonts and bright colors for a projector.

## Project layout

```
app/
  page.tsx          # The robot UI (speech bubble, robot face, suggestions, input)
  layout.tsx        # Root layout + metadata
  globals.css       # Tailwind setup
  api/chat/route.ts # Server-side Anthropic API call
tailwind.config.ts  # Custom blue/yellow theme + animations
.env.local.example  # Where ANTHROPIC_AUTH_TOKEN goes
```

## Notes

- The system prompt and the model (`claude-sonnet-4-6`) are configured in `app/api/chat/route.ts`.
- Each request is independent — Byte does not remember previous turns. This keeps things simple and safe for a live demo.
- If the token expires, just rerun `claude setup-token` and update `.env.local`.
