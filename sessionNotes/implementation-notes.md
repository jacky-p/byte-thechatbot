# Byte the Robot — Implementation Notes

## Overview

Byte is a single-page, kid-focused chatbot (ages 8–10) built on Next.js. A child types or taps a question; the frontend sends it to a Next.js API route that calls Claude; the reply is displayed in a speech bubble and read aloud via the Web Speech API. The app is a demo and is rate-limited to 5 requests per IP per day.

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS 3.4 |
| AI | Anthropic SDK (`@anthropic-ai/sdk`) via Claude Sonnet 4.6 |
| TTS | Web Speech API (`SpeechSynthesis`) — browser-native, no cost |
| Testing | Jest + `@swc/jest` |
| Hosting target | Railway or Render (persistent Node.js server) |

---

## File Structure

```
byte-chatbot/
├── app/
│   ├── layout.tsx              # Root layout, metadata
│   ├── page.tsx                # Entire frontend — one "use client" page
│   ├── globals.css             # Tailwind base + mouth-talk keyframe
│   ├── icon.svg                # Favicon (robot face, auto-picked by Next.js)
│   └── api/
│       └── chat/
│           ├── route.ts        # POST /api/chat — calls Claude
│           └── rateLimiter.ts  # In-memory IP rate limiter
├── __tests__/
│   └── rateLimiter.test.ts     # Jest unit tests for rate limiter
├── tailwind.config.ts          # Theme colours + all custom keyframes
├── jest.config.js              # Jest + SWC config
└── next.config.mjs             # Minimal Next.js config (no overrides)
```

---

## API Layer

### `app/api/chat/route.ts`

- Runs on the Node.js runtime (`export const runtime = "nodejs"`), required because the in-memory rate limiter must persist across requests within the same process.
- **Request flow:**
  1. Verify `ANTHROPIC_AUTH_TOKEN` env var exists.
  2. Extract client IP and check rate limit — returns `429` if exhausted.
  3. Parse and validate request body.
  4. Call Claude with the system prompt and user message.
  5. Post-process the reply: strip any emoji the model included despite instructions, tidy spacing.
  6. Return `{ reply }` on success or `{ error }` on failure.
- **System prompt design:** Byte is instructed to answer in 1–2 short sentences, avoid emojis (TTS reads them aloud as garbage), and never end with a question (each reply is self-contained). The prompt also redirects off-topic questions back to computers/coding.
- **Emoji stripping (server-side):** Even with the system prompt, Claude occasionally slips in an emoji. The server strips them with Unicode property escapes (`\p{Extended_Pictographic}`) before returning the reply. This is a belt-and-suspenders guard on top of the prompt instruction.
- **Known quirk:** The system array contains a first entry `"You are Claude Code, Anthropic's official CLI for Claude."` which is a leftover from the original scaffolding. It has no meaningful effect since `SYSTEM_PROMPT` immediately overrides the persona, but it could be cleaned up.

### `app/api/chat/rateLimiter.ts`

- Module-level `Map<string, { count, resetAt }>` — lives in Node.js server memory.
- **Limit:** 5 requests per IP per 24-hour sliding window.
- **IP extraction:** Reads `x-forwarded-for` header (first IP in a comma-separated list). Railway and Render both inject this header. Falls back to `127.0.0.1` for local dev.
- **Why in-memory is safe here:** The app targets Railway/Render, which run a single persistent Node.js process. All requests share the same `Map`. This would break on serverless platforms (e.g. Vercel) where each function instance has its own memory — on those platforms a shared store like Upstash Redis would be needed.
- **Testing hook:** `_resetStore()` is exported solely for tests to clear state between cases.
- **Note:** The store is never pruned of expired entries, so long-running servers will slowly accumulate stale keys. Not a concern at demo scale, but worth noting for production.

---

## Frontend — `app/page.tsx`

The entire UI is one `"use client"` component file. No routing, no additional pages.

### State

| State | Type | Purpose |
|---|---|---|
| `message` | `string` | Currently displayed text in the speech bubble |
| `input` | `string` | Controlled value of the text input |
| `loading` | `boolean` | True while waiting for API response |
| `voiceOn` | `boolean` | Whether TTS is enabled |
| `speaking` | `boolean` | True while TTS is actively speaking |
| `voices` | `SpeechSynthesisVoice[]` | Available English voices from the browser |
| `voiceName` | `string` | Name of the currently selected voice |
| `settingsOpen` | `boolean` | Whether the settings dropdown is open |

Two `useRef` values handle things that should not trigger re-renders:
- `inputRef` — focuses the text input after each send.
- `userInteracted` — blocks the auto-speak effect from firing on the initial greeting (browsers block speech synthesis until a user gesture has occurred).

### Speech Synthesis

- Voices are loaded on mount via `speechSynthesis.getVoices()` and re-loaded on the `voiceschanged` event (Chrome fires this asynchronously).
- Auto-selection priority: Google US English → Samantha → Karen → Moira → Tessa → Google UK English Female → Microsoft voices → first available English voice.
- The `speak()` function always calls `cancel()` before creating a new utterance, preventing overlap if a reply arrives while the previous one is still playing.
- `speaking` state is driven by `utterance.onstart` / `utterance.onend` / `utterance.onerror`, which animate Byte's talking mouth.
- A `useEffect` on `[message, loading, voiceOn, voiceName]` triggers auto-play whenever a new reply arrives. The `userInteracted` ref guard prevents it from firing on the initial greeting render.
- Muting mid-sentence: a separate `useEffect` on `voiceOn` immediately calls `cancel()` when the user turns voice off.

### Send Flow

```
user submits → cancel any in-flight speech
             → setLoading(true), clear message and input
             → POST /api/chat
             → on success: setMessage(reply)
             → on failure: setMessage(error text)
             → finally: setLoading(false), re-focus input
             → useEffect detects message changed → speak()
```

### UI Components

All components are co-located in `page.tsx`. There is no component library.

| Component | Responsibility |
|---|---|
| `Home` | Root, all state lives here |
| `BackgroundDecor` | Purely decorative — dot pattern, spinning gears, floating code symbols, twinkling stars. `pointer-events-none` so it never intercepts clicks |
| `RobotWithHalo` | Wraps `Robot` with a blurred yellow glow and sparkle stars |
| `Robot` | Byte's animated robot face: antenna, head, eyes, mouth, neck, shoulders |
| `Eye` | Single eye with blink animation and wiggle-on-loading |
| `SpeechBubble` | White bordered bubble + directional tail (left on desktop, upward on mobile) |
| `Gear` | Reused SVG for both background decorations and the settings button icon |
| `Star` | Simple star polygon SVG, used in background and around robot |

### Robot Mouth Animation

The mouth is always a single SVG element — no conditional rendering that would cause a layout jump.

- **Idle:** A stroked quadratic bezier smile (`M 6 6 Q 40 40 74 6`) with a short yellow accent curve beneath it.
- **Talking:** A filled closed crescent path (`Q 40 42`) cross-fades in (0.15s opacity transition) while the stroke smile fades out. The crescent is then animated via the CSS `d` property (`@keyframes mouth-talk` in `globals.css`), morphing the lower arc control point from `y=42` (barely open) to `y=62` (wide open) at 0.4s per cycle.
- The CSS `d` property animation is the correct approach for SVG path morphing and is supported in Chrome 88+, Firefox 72+, Edge 88+, and Safari 16.2+.

### Settings Panel

- The settings button and dropdown share a `settingsRef` div.
- Outside-click detection uses `mousedown` (not `click`) on `document`, checking `settingsRef.current.contains(e.target)`. Using `mousedown` ensures the check runs before the click event fires, preventing race conditions.
- The header has `z-30` vs the section/footer's `z-10`. This was a deliberate fix: when header and section shared `z-10`, the section (later in DOM order) painted on top of the dropdown, making its buttons unclickable despite being visually visible.
- Dropdown is constrained to `max-w-[calc(100vw-2rem)]` so it cannot overflow on very small screens.

---

## Styling

### Tailwind Theme (`tailwind.config.ts`)

Custom colours:
- `byteblue: #1E63FF` — primary blue for borders, robot head, buttons
- `byteblueDark: #0A3FBA` — dark blue for text, pupils, shadows
- `byteyellow: #FFE94A` — accent yellow for antenna, highlights, hover states

Custom animations (all defined as Tailwind keyframes + animation utilities):

| Name | Effect | Used on |
|---|---|---|
| `glow` | Pulsing yellow box-shadow | Antenna ball (idle) |
| `bob` | Gentle vertical float | Entire robot |
| `blink` | Periodic vertical scale to ~0 | Eyes |
| `wiggle` | Left-right rotation | Eyes (loading), antenna (speaking) |
| `spinslow` | Slow 18s clockwise rotation | Background gear (yellow), settings icon (open) |
| `spinslowrev` | Slow 22s counter-clockwise | Background gear (blue) |
| `floaty` | Vertical float + slight rotate | Background code symbols |
| `twinkle` | Opacity + scale pulse | Stars |

### `globals.css`

Contains the `mouth-talk` keyframe, which must live here rather than in `tailwind.config.ts` because it animates the SVG `d` CSS property — Tailwind's keyframe object syntax does not correctly serialize the `d: path("...")` value.

---

## Mobile Responsiveness

The app uses a mobile-first approach with `md:` breakpoints for desktop upgrades.

Key responsive decisions:
- **Layout:** Middle section stacks vertically on mobile (`flex-col md:flex-row`) — robot above speech bubble.
- **Viewport height:** `h-[100dvh]` (dynamic viewport height) handles mobile browser chrome (address bar, bottom nav bar) correctly. `h-screen` / `100vh` would be clipped on mobile.
- **Robot size:** Head is `w-36 md:w-56`, with eyes, mouth, and shoulders scaled down proportionally. The font sizes, gaps, and padding all use `base md:larger` patterns throughout.
- **Speech bubble tail:** Points left on desktop (toward robot on left), points up on mobile (toward robot above). Implemented with two sets of CSS border triangles toggled with `hidden md:block` / `md:hidden`.
- **Suggestions:** On mobile, suggestions scroll horizontally (`overflow-x-auto`, `shrink-0` on each button) rather than wrapping into multiple rows, preserving vertical space. The row uses negative margin (`-mx-4 px-4`) to extend the scroll area flush to the screen edges.
- **Background decorations:** Code symbols (`<>`, `{ }`, `01`, `10`, `;`) are `hidden md:block` to avoid clutter on small screens.

---

## Testing

Tests live in `__tests__/rateLimiter.test.ts` and are run with `npm test`.

**Coverage:**
- Requests 1–5 from the same IP are allowed.
- The 6th request is blocked (`allowed: false`).
- `remaining` count decrements correctly.
- Different IPs have independent counters.
- Counter resets after the 24-hour window (tested with `jest.useFakeTimers()`).
- `x-forwarded-for` with comma-separated list returns only the first IP.
- Missing header falls back to `127.0.0.1`.
- Single IP with no comma is handled correctly.

The API route itself and the full request/response cycle are not integration-tested. Mocking the Anthropic client would be the next step if coverage is expanded.

---

## Favicon

`app/icon.svg` — an SVG depicting Byte's face (yellow antenna, blue rounded head, white eyes, yellow smile). Next.js App Router automatically generates the `<link rel="icon">` tag from any `icon.*` file placed in the `app/` directory.

---

## Known Issues & Future Considerations

| Issue | Detail |
|---|---|
| Stale rate limit entries | The in-memory store never prunes expired entries. At demo scale this is harmless; for a long-lived server, periodic cleanup would prevent memory growth. |
| No conversation history | Each message is sent as a standalone user turn with no prior context. Byte cannot remember what was said earlier in the session. |
| No persistent storage | All state is in-memory and resets on server restart. Intentional for a demo. |
| `ANTHROPIC_AUTH_TOKEN` in system prompt | There is a stale "You are Claude Code" entry in the system array. It doesn't affect behaviour but should be removed. |
| TTS on iOS Safari | iOS Safari requires the `speak()` call to originate from within a user gesture handler. The current flow (speak triggered by a `useEffect` after an async fetch) may be blocked on iOS. Testing on iOS is recommended before mobile launch. |
| Rate limit bypass | A determined user can bypass the IP limit by switching networks or using a VPN. Acceptable for a demo; session-based or account-based limiting would be needed for production. |
| No loading skeleton | The speech bubble shows "Thinking..." with an `animate-pulse` during loading. A more polished loading state could improve the feel. |
