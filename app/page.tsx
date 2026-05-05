"use client";

import { useEffect, useRef, useState } from "react";

const SUGGESTIONS = [
  "What is coding?",
  "How do computers think?",
  "Tell me a robot joke!",
  "What can I build with code?",
  "Are robots taking over?",
];

const GREETING = "Hi there, friend! I'm Byte! Ask me anything about computers, coding, or robots!";

// Friendly-sounding voices we'll auto-pick if available, in priority order.
// These tend to be the most natural kid-friendly voices on Mac/Windows/Chrome.
const FRIENDLY_VOICE_PATTERNS = [
  /google us english/i,
  /samantha/i,
  /karen/i,
  /moira/i,
  /tessa/i,
  /google uk english female/i,
  /microsoft (zira|aria|jenny)/i,
];

export default function Home() {
  const [message, setMessage] = useState(GREETING);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [voiceOn, setVoiceOn] = useState(true);
  const [speaking, setSpeaking] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voiceName, setVoiceName] = useState<string>("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);
  // Browsers block speech synthesis until the user interacts with the page,
  // so we skip speaking the initial greeting and only speak from the first
  // send onward.
  const userInteracted = useRef(false);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Load available voices.
  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    const loadVoices = () => {
      const all = window.speechSynthesis.getVoices().filter((v) => v.lang.startsWith("en"));
      setVoices(all);
      setVoiceName((current) => {
        if (current && all.some((v) => v.name === current)) return current;
        for (const pattern of FRIENDLY_VOICE_PATTERNS) {
          const match = all.find((v) => pattern.test(v.name));
          if (match) return match.name;
        }
        return all[0]?.name ?? "";
      });
    };
    loadVoices();
    window.speechSynthesis.addEventListener("voiceschanged", loadVoices);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", loadVoices);
  }, []);

  // Close settings dropdown on outside click or Escape.
  useEffect(() => {
    if (!settingsOpen) return;
    const onClick = (e: MouseEvent) => {
      if (!settingsRef.current?.contains(e.target as Node)) setSettingsOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSettingsOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [settingsOpen]);

  function speak(text: string) {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    const chosen = voices.find((v) => v.name === voiceName);
    if (chosen) utterance.voice = chosen;
    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(utterance);
  }

  // Speak Byte's reply whenever `message` changes (after the first interaction).
  useEffect(() => {
    if (!userInteracted.current) return;
    if (loading || !voiceOn || !message) return;
    speak(message);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [message, loading, voiceOn, voiceName]);

  // Stop any in-flight speech if the user mutes mid-sentence.
  useEffect(() => {
    if (!voiceOn && typeof window !== "undefined") {
      window.speechSynthesis?.cancel();
      setSpeaking(false);
    }
  }, [voiceOn]);

  function testVoice() {
    userInteracted.current = true;
    speak("Hi! I'm Byte! Coding is super fun!");
  }

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    userInteracted.current = true;
    if (typeof window !== "undefined") window.speechSynthesis?.cancel();
    setLoading(true);
    setMessage("");
    setInput("");
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error || "Beep boop! Something went wonky. Try again!");
      } else {
        setMessage(data.reply);
      }
    } catch {
      setMessage("Uh oh! My circuits got tangled. Try again in a second!");
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  return (
    <main className="relative h-[100dvh] w-screen flex flex-col overflow-hidden px-4 py-3">
      {/* Decorative background layer — sits behind everything, ignores clicks */}
      <BackgroundDecor />

      {/* Header */}
      <header className="relative z-30 flex items-center justify-between gap-4 shrink-0">
        <div className="flex flex-col items-center">
          <h1 className="text-2xl md:text-4xl font-extrabold text-byteblue tracking-tight drop-shadow-sm">
            Byte the Robot
          </h1>
          <p className="text-sm md:text-base text-byteblueDark">
            Your friendly coding buddy!
          </p>
        </div>

        {/* Settings dropdown */}
        <div ref={settingsRef} className="relative">
          <button
            type="button"
            onClick={() => setSettingsOpen((o) => !o)}
            aria-expanded={settingsOpen}
            aria-haspopup="true"
            className="flex items-center gap-2 px-4 py-2 rounded-full border-4 border-byteblue bg-white text-byteblue text-sm md:text-base font-bold shadow-md hover:bg-byteyellow hover:text-byteblueDark active:scale-95 transition-transform"
          >
            <Gear className={`w-5 h-5 ${settingsOpen ? "animate-spinslow" : ""}`} />
            Settings
          </button>

          {settingsOpen && (
            <div className="absolute right-0 mt-3 w-72 max-w-[calc(100vw-2rem)] bg-white border-4 border-byteblue rounded-2xl shadow-xl p-4 z-20">
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-base font-bold text-byteblueDark">Voice</span>
                  <button
                    type="button"
                    onClick={() => setVoiceOn((v) => !v)}
                    aria-pressed={voiceOn}
                    className={`px-3 py-1.5 rounded-full border-4 border-byteblue text-sm font-bold transition-transform active:scale-95 ${
                      voiceOn ? "bg-byteyellow text-byteblueDark" : "bg-white text-byteblue"
                    }`}
                  >
                    {voiceOn ? "On" : "Off"}
                  </button>
                </div>

                <label className="flex flex-col gap-1">
                  <span className="text-sm font-bold text-byteblueDark">Pick a voice</span>
                  <select
                    value={voiceName}
                    onChange={(e) => setVoiceName(e.target.value)}
                    disabled={voices.length === 0}
                    className="px-3 py-2 rounded-xl border-4 border-byteblue bg-white text-byteblue text-sm font-bold shadow-sm focus:outline-none focus:ring-4 focus:ring-byteyellow disabled:opacity-50"
                  >
                    {voices.length === 0 && <option>Loading voices...</option>}
                    {voices.map((v) => (
                      <option key={v.name} value={v.name}>
                        {v.name}
                      </option>
                    ))}
                  </select>
                </label>

                <button
                  type="button"
                  onClick={testVoice}
                  disabled={!voiceOn || voices.length === 0}
                  className="px-3 py-2 rounded-xl border-4 border-byteblue bg-byteyellow text-byteblueDark text-sm font-bold shadow-sm active:scale-95 disabled:opacity-50"
                >
                  Try this voice
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Middle: stacked on mobile, side by side on desktop */}
      <section className="relative z-10 flex-1 flex flex-col md:flex-row items-center justify-center gap-6 md:gap-10 min-h-0 my-3">
        <RobotWithHalo loading={loading} speaking={speaking} />
        <SpeechBubble text={loading ? "Thinking..." : message} loading={loading} />
      </section>

      {/* Bottom: suggestions + input */}
      <footer className="relative z-10 shrink-0 flex flex-col gap-3">
        <div className="flex md:flex-wrap overflow-x-auto md:overflow-visible justify-start md:justify-center gap-2 md:gap-3 -mx-4 px-4 md:mx-0 md:px-0 pb-1 md:pb-0 shrink-0">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => send(s)}
              disabled={loading}
              className="shrink-0 px-4 py-2 md:px-5 md:py-3 bg-byteyellow text-byteblueDark text-sm md:text-lg font-bold rounded-full shadow-md border-4 border-byteblue hover:scale-105 hover:bg-yellow-300 active:scale-95 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {s}
            </button>
          ))}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="flex gap-3 w-full max-w-5xl mx-auto"
        >
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a question for Byte..."
            disabled={loading}
            className="flex-1 px-4 py-3 text-lg md:text-xl border-4 border-byteblue rounded-2xl outline-none focus:ring-4 focus:ring-byteyellow disabled:opacity-50 bg-white"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="px-6 md:px-8 py-3 bg-byteblue text-white text-lg md:text-xl font-bold rounded-2xl shadow-md hover:bg-byteblueDark active:scale-95 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </form>
      </footer>
    </main>
  );
}

/* ---------- Background decoration ---------- */

function BackgroundDecor() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
      style={{
        // Subtle dot pattern across the whole page.
        backgroundImage:
          "radial-gradient(circle, rgba(30, 99, 255, 0.12) 1.5px, transparent 1.5px)",
        backgroundSize: "28px 28px",
      }}
    >
      {/* Big yellow gear, top-left */}
      <Gear className="absolute -top-10 -left-10 w-44 h-44 text-byteyellow opacity-40 animate-spinslow" />
      {/* Big blue gear, bottom-right */}
      <Gear className="absolute -bottom-12 -right-12 w-52 h-52 text-byteblue opacity-25 animate-spinslowrev" />

      {/* Floating code-y symbols. Hidden on smaller screens to avoid clutter. */}
      <span className="hidden md:block absolute top-16 right-24 text-byteblue opacity-40 text-5xl font-extrabold animate-floaty select-none">
        {"<>"}
      </span>
      <span
        className="hidden md:block absolute top-1/2 left-10 text-byteblueDark opacity-30 text-4xl font-extrabold animate-floaty select-none"
        style={{ animationDelay: "1.5s" }}
      >
        {"{ }"}
      </span>
      <span
        className="hidden md:block absolute bottom-40 left-1/3 text-byteyellow opacity-70 text-4xl font-extrabold animate-floaty select-none"
        style={{ animationDelay: "0.8s", textShadow: "0 0 4px rgba(0,0,0,0.15)" }}
      >
        {"01"}
      </span>
      <span
        className="hidden md:block absolute top-32 left-1/3 text-byteblue opacity-30 text-3xl font-extrabold animate-floaty select-none"
        style={{ animationDelay: "2.2s" }}
      >
        {"10"}
      </span>
      <span
        className="hidden md:block absolute top-24 right-1/3 text-byteblueDark opacity-25 text-4xl font-extrabold animate-floaty select-none"
        style={{ animationDelay: "3s" }}
      >
        {";"}
      </span>

      {/* Twinkling stars */}
      <Star className="absolute top-12 left-1/2 w-6 h-6 text-byteyellow animate-twinkle" />
      <Star
        className="absolute top-1/3 right-12 w-5 h-5 text-byteblue animate-twinkle"
        style={{ animationDelay: "0.6s" }}
      />
      <Star
        className="absolute bottom-44 right-1/4 w-7 h-7 text-byteyellow animate-twinkle"
        style={{ animationDelay: "1.2s" }}
      />
      <Star
        className="absolute bottom-32 left-20 w-5 h-5 text-byteblue animate-twinkle"
        style={{ animationDelay: "1.8s" }}
      />
    </div>
  );
}

function Gear({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
      <g fill="currentColor">
        {/* Eight teeth around the gear */}
        {Array.from({ length: 8 }).map((_, i) => (
          <rect
            key={i}
            x="46"
            y="2"
            width="8"
            height="18"
            rx="2"
            transform={`rotate(${i * 45} 50 50)`}
          />
        ))}
        <circle cx="50" cy="50" r="32" />
      </g>
      {/* Hollow center */}
      <circle cx="50" cy="50" r="12" fill="white" />
    </svg>
  );
}

function Star({
  className,
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <svg viewBox="0 0 24 24" className={className} style={style} aria-hidden="true">
      <path
        d="M12 2 L14.4 9.2 L22 9.6 L16 14.4 L18 22 L12 17.8 L6 22 L8 14.4 L2 9.6 L9.6 9.2 Z"
        fill="currentColor"
      />
    </svg>
  );
}


/* ---------- Speech bubble ---------- */

function SpeechBubble({ text, loading }: { text: string; loading: boolean }) {
  return (
    <div className="relative w-full md:flex-1 max-w-2xl">
      <div className="bg-white border-4 border-byteblue rounded-3xl px-5 py-4 md:px-8 md:py-6 shadow-xl flex items-center justify-center">
        <p
          className={`text-lg md:text-3xl text-byteblueDark text-center leading-snug ${
            loading ? "animate-pulse" : ""
          }`}
        >
          {text}
        </p>
      </div>
      {/* Desktop: tail points left toward robot */}
      <div className="hidden md:block absolute top-1/2 -translate-y-1/2 -left-5 w-0 h-0 border-t-[18px] border-t-transparent border-b-[18px] border-b-transparent border-r-[22px] border-r-byteblue" />
      <div className="hidden md:block absolute top-1/2 -translate-y-1/2 -left-[14px] w-0 h-0 border-t-[12px] border-t-transparent border-b-[12px] border-b-transparent border-r-[16px] border-r-white" />
      {/* Mobile: tail points up toward robot */}
      <div className="md:hidden absolute -top-[22px] left-1/2 -translate-x-1/2 w-0 h-0 border-l-[18px] border-l-transparent border-r-[18px] border-r-transparent border-b-[22px] border-b-byteblue" />
      <div className="md:hidden absolute -top-[14px] left-1/2 -translate-x-1/2 w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-b-[16px] border-b-white" />
    </div>
  );
}

/* ---------- Robot ---------- */

function RobotWithHalo({ loading, speaking }: { loading: boolean; speaking: boolean }) {
  return (
    <div className="relative shrink-0">
      {/* Soft yellow halo glow behind the robot */}
      <div
        className="absolute inset-0 -m-12 rounded-full bg-byteyellow opacity-30 blur-2xl"
        aria-hidden="true"
      />
      {/* Twinkling sparkles next to the robot */}
      <Star className="absolute -top-2 -left-6 w-5 h-5 text-byteyellow animate-twinkle" />
      <Star
        className="absolute top-10 -right-8 w-4 h-4 text-byteyellow animate-twinkle"
        style={{ animationDelay: "0.7s" }}
      />
      <Star
        className="absolute bottom-2 -left-8 w-5 h-5 text-byteyellow animate-twinkle"
        style={{ animationDelay: "1.4s" }}
      />
      <div className="relative">
        <Robot loading={loading} speaking={speaking} />
      </div>
    </div>
  );
}

function Robot({ loading, speaking }: { loading: boolean; speaking: boolean }) {
  return (
    <div className="relative flex flex-col items-center animate-bob shrink-0">
      {/* Antenna */}
      <div className="flex flex-col items-center mb-[-6px]">
        <div
          className={`w-5 h-5 rounded-full bg-byteyellow ${
            loading || speaking ? "animate-wiggle" : "animate-glow"
          }`}
        />
        <div className="w-2 h-7 bg-gray-700" />
      </div>

      {/* Head */}
      <div className="relative w-36 h-36 md:w-56 md:h-56 bg-byteblue rounded-3xl border-4 border-byteblueDark shadow-2xl flex flex-col items-center justify-center">
        {/* Bolts in corners */}
        <div className="absolute top-2 left-2 w-2.5 h-2.5 rounded-full bg-byteblueDark" />
        <div className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full bg-byteblueDark" />
        <div className="absolute bottom-2 left-2 w-2.5 h-2.5 rounded-full bg-byteblueDark" />
        <div className="absolute bottom-2 right-2 w-2.5 h-2.5 rounded-full bg-byteblueDark" />

        {/* Eyes */}
        <div className="flex gap-3 md:gap-7 mb-2">
          <Eye loading={loading} />
          <Eye loading={loading} />
        </div>

        {/* Mouth — single SVG always rendered; morphs from smile to open crescent when speaking */}
        <div className="mt-1 w-20 md:w-28 h-7 md:h-11 flex items-center justify-center">
          <svg viewBox="0 0 80 36" className="w-full h-full text-byteblueDark" aria-hidden="true">
            {/* Idle smile stroke — fades out when speaking */}
            <path
              d="M 6 6 Q 40 40 74 6"
              stroke="currentColor"
              strokeWidth="6"
              strokeLinecap="round"
              fill="none"
              style={{ opacity: speaking ? 0 : 1, transition: "opacity 0.15s" }}
            />
            {/* Yellow accent (idle) — fades out when speaking */}
            <path
              d="M 24 22 Q 40 32 56 22"
              stroke="#FFE94A"
              strokeWidth="3"
              strokeLinecap="round"
              fill="none"
              style={{ opacity: speaking ? 0 : 0.9, transition: "opacity 0.15s" }}
            />
            {/* Talking crescent — morphs open/closed via CSS d-property animation */}
            <path
              d="M 6 6 Q 40 40 74 6 Q 40 42 6 6 Z"
              fill="currentColor"
              style={{ opacity: speaking ? 1 : 0, transition: "opacity 0.15s" }}
              className={speaking ? "animate-mouth-talk" : ""}
            />
          </svg>
        </div>

        {/* Rosy cheeks for a friendlier face */}
        <div className="absolute bottom-7 md:bottom-9 left-3 w-4 h-2.5 md:w-5 md:h-3 rounded-full bg-pink-300 opacity-70 blur-[1px]" />
        <div className="absolute bottom-7 md:bottom-9 right-3 w-4 h-2.5 md:w-5 md:h-3 rounded-full bg-pink-300 opacity-70 blur-[1px]" />
      </div>

      {/* Neck + shoulders */}
      <div className="w-10 h-2.5 md:w-12 md:h-3 bg-byteblueDark" />
      <div className="w-44 md:w-64 h-4 md:h-5 bg-byteblueDark rounded-b-2xl" />
    </div>
  );
}

function Eye({ loading }: { loading: boolean }) {
  return (
    <div className="w-10 h-10 md:w-14 md:h-14 bg-white rounded-full border-4 border-byteblueDark flex items-center justify-center animate-blink overflow-hidden">
      <div
        className={`w-4 h-4 md:w-6 md:h-6 rounded-full bg-byteblueDark ${
          loading ? "animate-wiggle" : ""
        }`}
      >
        <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-white mt-0.5 ml-0.5 md:mt-1 md:ml-1" />
      </div>
    </div>
  );
}
