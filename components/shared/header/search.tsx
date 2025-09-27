"use client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Category } from "@/types";
import { Loader, SearchIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import useSWR from "swr";
import GraphemeSplitter from "grapheme-splitter";

const phrases = [
  "Simu zenye kamera 3 📱📸",
  "Mashati mekundu ya wanaume 👕👔",
  "Viatu vya michezo vya wanawake 👟🏃‍♀️",
  "Laptop za bei nafuu 💻🧮",
  "Friji ndogo kwa vyumba 🧊🧯",
  "Nguo za watoto wachanga 👶🧦",
  "Mafuta ya nywele ya asili 💇🏾‍♀️🌿",
  "Saa za mkononi za kisasa ⌚✨",
];

const fetcher = async (url: string): Promise<Category[]> => {
  const res = await fetch(url);
  if (!res) throw new Error("Failed to fetch");
  return res.json();
};

const Search = () => {
  const [query, setQuery] = useState("");
  const [isInteracted, setIsInteracted] = useState(false);
  const [typedText, setTypedText] = useState("");
  const phraseIndex = useRef(0);
  const charIndex = useRef(0);
  const typingInterval = useRef<NodeJS.Timeout | null>(null);
  const splitter = new GraphemeSplitter();

  const {
    data: categories,
    error,
    isLoading,
  } = useSWR<Category[]>("/api/shared/categories", fetcher);

  useEffect(() => {
    if (isInteracted) return;

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
          typingInterval.current = setInterval(typeNextChar, 80);
        }, 1500); // pause before next phrase
      }
    };

    typingInterval.current = setInterval(typeNextChar, 80);

    return () => {
      if (typingInterval.current) clearInterval(typingInterval.current);
    };
  }, [isInteracted]);

  const handleFocus = () => setIsInteracted(true);
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsInteracted(true);
    setQuery(e.target.value);
  };

  // if (!categories) return <Loader className="w-4 h-4 animate-spin" />;
  // if (categories === null) return <Loader className="w-4 h-4 animate-spin" />;
  // if (isLoading) return <Loader className="w-4 h-4 animate-spin" />;

  // if (error || !categories) return <Loader className="w-4 h-4 animate-spin" />;

  return (
    <form action="/search" method="GET" className="w-full">
      <div className="flex w-full  items-center space-x-2">
        <div className="hidden md:block">
          {categories || isLoading || error ? (
            <Select name="category">
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem key="All" value="all">
                  Yote
                </SelectItem>
                {categories &&
                  categories?.map((x) => (
                    <SelectItem key={x.id} value={x.name_en}>
                      {x.name_en}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          ) : (
            <Loader className="w-4 h-4 animate-spin" />
          )}
        </div>
        {/* Input expands fully */}
        <div className="flex-grow">
          <Input
            name="q"
            value={isInteracted ? query : ""}
            onChange={handleChange}
            onFocus={handleFocus}
            placeholder={isInteracted ? "Tafuta bidhaa..." : typedText}
            className="w-full  transition-all duration-300"
          />
        </div>
        <Button>
          <SearchIcon />
        </Button>
      </div>
    </form>
  );
};

export default Search;
