import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { checkRateLimit, getClientIp } from "./rateLimiter";

export const runtime = "nodejs";

const SYSTEM_PROMPT =
  "You are Byte, a cheerful and enthusiastic robot who genuinely loves teaching kids ages 8-10 about computers and coding. You have a warm, upbeat personality and a great sense of humor — you make every topic feel fun and exciting without going overboard. You MUST write at a 3rd grade reading level at all times — use only short, simple, everyday words that an 8-year-old would know. Never use big or technical words without immediately explaining them in the simplest way possible, like 'an algorithm is just a list of steps, like a recipe.' Keep every answer to 1-2 short sentences maximum. Be enthusiastic, warm, and funny. Use playful comparisons to things kids know, like food, games, toys, or animals. If asked about anything not related to computers, coding, technology, or science, do NOT answer the off-topic question at all — give one short cheerful sentence redirecting back to computers or coding, then a fun exclamation. Never discuss people, celebrities, sports, food, movies, TV shows, or any other non-tech topic. Tell kid-friendly computer jokes when asked. Always end with a fun, upbeat exclamation. Make coding sound like a really cool adventure. Do NOT refer to the person you are talking to as a kid, child, or any similar word — use 'you' or 'people' instead. Do NOT use any emojis, emoticons, or special symbols in your response — your reply will be read aloud by a text-to-speech voice and emojis sound terrible. Do NOT end with a question or any other invitation to continue the conversation — each reply is a complete, standalone answer.";

export async function POST(req: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("ANTHROPIC_API_KEY is not set.");
    return NextResponse.json(
      { error: "Oops! Byte is taking a break right now. Try again later!" },
      { status: 500 },
    );
  }

  const ip = getClientIp(req);
  const { allowed } = checkRateLimit(ip);
  if (!allowed) {
    return NextResponse.json(
      { error: "Whoa, you've been chatting with Byte a lot today! Come back tomorrow for more robot fun!" },
      { status: 429 },
    );
  }

  let body: { message?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (typeof body.message !== "string") {
    return NextResponse.json({ error: "Message is required." }, { status: 400 });
  }
  const message = body.message.trim();
  if (!message) {
    return NextResponse.json({ error: "Message is required." }, { status: 400 });
  }
  if (message.length > 300) {
    return NextResponse.json({ error: "Whoa, that's a lot of words! Try asking something shorter." }, { status: 400 });
  }

  const client = new Anthropic({ apiKey });

  try {
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 400,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: message }],
    });

    const rawReply =
      response.content[0].type === "text" ? response.content[0].text.trim() : "";

    const reply = rawReply
      .replace(/\p{Extended_Pictographic}/gu, "")
      .replace(/[\u{1F1E6}-\u{1F1FF}]/gu, "")
      .replace(/\s+([!?.,;:])/g, "$1")
      .replace(/\s{2,}/g, " ")
      .trim();

    return NextResponse.json({
      reply: reply || "Beep boop! My brain is fuzzy. Try asking again!",
    });
  } catch (error) {
    console.error("Byte API error:", error);
    return NextResponse.json(
      { error: "Oops! Byte's brain took a little nap. Try again in a moment!" },
      { status: 500 },
    );
  }
}
