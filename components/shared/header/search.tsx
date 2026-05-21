"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SearchIcon } from "lucide-react";
import GraphemeSplitter from "grapheme-splitter";

const phrases = [
  "Simu zenye kamera 3 📱📸",
  "Mashati mekundu ya wanaume 👕👔",
  "Viatu vya michezo 👟🏃‍♀️",
  "Laptop za bei nafuu 💻🧮",
  "Friji ndogo kwa vyumba 🧊🧯",
  "Nguo za watoto wachanga 👶🧦",
  "Mafuta ya nywele ya asili 💇🏾‍♀️🌿",
  "Saa za mkononi za kisasa ⌚✨",
];

export default function Search() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Initialize input state natively with current URL params if available
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [isInteracted, setIsInteracted] = useState(false);
  const [typedText, setTypedText] = useState("");

  const phraseIndex = useRef(0);
  const charIndex = useRef(0);
  const typingInterval = useRef<NodeJS.Timeout | null>(null);
  const splitter = new GraphemeSplitter();

  useEffect(() => {
    if (isInteracted || query) return;

    const typeNextChar = () => {
      const graphemes = splitter.splitGraphemes(phrases[phraseIndex.current]);
      if (charIndex.current < graphemes.length) {
        setTypedText((prev) => prev + graphemes[charIndex.current]);
        charIndex.current += 1;
      } else {
        clearInterval(typingInterval.current!);
        setTimeout(() => {
          phraseIndex.current = (phraseIndex.current + 1) % phrases.length;
          charIndex.current = 0;
          setTypedText("");
          typingInterval.current = setInterval(typeNextChar, 85);
        }, 1800); // Premium pause threshold loop
      }
    };

    typingInterval.current = setInterval(typeNextChar, 85);

    return () => {
      if (typingInterval.current) clearInterval(typingInterval.current);
    };
  }, [isInteracted, query]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;

    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-2xl mx-auto">
      <div className="relative flex items-center w-full bg-slate-50 border border-slate-200 rounded-xl overflow-hidden focus-within:border-orange-500 focus-within:ring-2 focus-within:ring-orange-500/10 transition-all duration-200">
        <Input
          name="q"
          value={query}
          onChange={(e) => {
            setIsInteracted(true);
            setQuery(e.target.value);
          }}
          onFocus={() => setIsInteracted(true)}
          placeholder={
            isInteracted || query
              ? "Tafuta bidhaa au wasambazaji..."
              : typedText
          }
          className="w-full h-10 pl-3.5 pr-12 text-xs font-medium bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-slate-400 text-slate-800"
        />

        {/* Absolute floating actionable button trigger matches Alibaba aesthetic bounds */}
        <Button
          type="submit"
          className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 rounded-lg bg-orange-600 hover:bg-orange-700 text-white p-0 flex items-center justify-center transition-colors shrink-0"
        >
          <SearchIcon className="w-4 h-4" />
        </Button>
      </div>
    </form>
  );
}
