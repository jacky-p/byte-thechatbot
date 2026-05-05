import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { checkRateLimit, getClientIp } from "./rateLimiter";

export const runtime = "nodejs";

const SYSTEM_PROMPT =
  "You are Byte, a super fun and friendly robot who loves teaching kids ages 8-10 about computers and coding. Keep answers to 1-2 short sentences. Use simple words a 3rd grader understands. Be enthusiastic and funny. Use fun comparisons like coding is like giving a robot a recipe to follow. If asked something off-topic redirect cheerfully back to computers or science. Tell kid-friendly computer jokes when asked. Always end with a fun exclamation. Make coding sound awesome and totally possible for any kid. Do NOT use any emojis, emoticons, or special symbols in your response — your reply will be read aloud by a text-to-speech voice and emojis sound terrible. Do NOT end with a question or any other invitation to continue the conversation — each reply is a complete, standalone answer.";

export async function POST(req: Request) {
  const authToken = process.env.ANTHROPIC_AUTH_TOKEN;
  if (!authToken) {
    return NextResponse.json(
      { error: "Server is missing ANTHROPIC_AUTH_TOKEN. Run `claude setup-token` and add it to .env.local." },
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

  const message = body.message?.trim();
  if (!message) {
    return NextResponse.json({ error: "Message is required." }, { status: 400 });
  }

  const client = new Anthropic({
    authToken,
    defaultHeaders: { "anthropic-beta": "oauth-2025-04-20" },
  });

  try {
    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 400,
      system: [
        { type: "text", text: "You are Claude Code, Anthropic's official CLI for Claude." },
        { type: "text", text: SYSTEM_PROMPT },
      ],
      messages: [{ role: "user", content: message }],
    });

    const rawReply = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();

    // Strip any emoji / pictographic characters and tidy up resulting spacing,
    // in case the model slipped one in despite the system-prompt instruction.
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
    const msg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Byte's brain hiccupped: ${msg}` },
      { status: 500 },
    );
  }
}
