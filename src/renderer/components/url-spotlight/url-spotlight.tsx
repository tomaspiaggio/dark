"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, Globe, MessageCircle, Search } from "lucide-react";

interface UrlSpotlightProps {
  onClose: () => void;
  onSubmitUrl: (url: string) => void;
  onSubmitSearch: (query: string) => void;
  onSubmitAi: (query: string) => void;
}

export default function UrlSpotlight({ onClose, onSubmitUrl, onSubmitSearch, onSubmitAi }: UrlSpotlightProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentUrls, setRecentUrls] = useState<string[]>([
    "github.com",
    "vercel.com",
    "news.ycombinator.com",
    "twitter.com",
    "dev.to",
  ]);

  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const urlRegex =
    /^([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
  const isUrlLike = (input: string) => urlRegex.test(input);

  const handleClose = () => {
    setQuery("");
    setSelectedIndex(0);
    onClose();
  };

  const getFaviconUrl = (domain: string, size = 16) => {
    // Ensure domain doesn't have http/https for the favicon service
    const cleanDomain = domain.replace(/^https?:\/\//, "").split("/")[0];
    return `https://www.google.com/s2/favicons?domain=${cleanDomain}&sz=${size}`;
  };

  const getSearchOptions = () => {
    const options = [];
    if (isUrlLike(query)) {
      options.push({
        type: "url",
        text: query,
        domain: query, // Store domain for favicon
        action: () => {
          onSubmitUrl(query);
          handleClose();
        },
      });
    }
    if (query) {
      options.push({
        type: "search",
        text: `Search for "${query}"`,
        action: () => {
          onSubmitSearch(query);
          handleClose();
        },
      });
      options.push({
        type: "ai",
        text: `Ask AI about "${query}"`,
        action: () => {
          onSubmitAi(query);
          handleClose();
        },
      });
    }

    const filteredRecents = recentUrls.filter((url) =>
      query === "" || url.toLowerCase().includes(query.toLowerCase())
    );
    filteredRecents.forEach((url) => {
      options.push({
        type: "recent",
        text: url,
        domain: url, // Store domain for favicon
        action: () => {
          onSubmitUrl(url);
          handleClose();
        },
      });
    });
    return options;
  };

  const searchOptions = getSearchOptions();

  useEffect(() => {
    inputRef.current?.focus();
  }, [inputRef.current]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "Escape":
          // handleClose();
          break;
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((
            prev,
          ) => (prev < searchOptions.length - 1 ? prev + 1 : prev));
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
          break;
        case "Enter":
          e.preventDefault();
          if (searchOptions[selectedIndex]) {
            searchOptions[selectedIndex].action();
          }
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedIndex, searchOptions]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current && !containerRef.current.contains(e.target as Node)
      ) {
        handleClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);
  return (
    <div className="h-screen w-screen flex items-center justify-center">
      <div
        ref={containerRef}
        className="w-full max-w-2xl h-full max-h-80 bg-zinc-900 rounded-lg shadow-xl overflow-hidden border border-zinc-700 flex flex-col"
      >
        <div className="flex items-center px-4 py-3 border-b border-zinc-800 flex-shrink-0">
          <Search className="w-4 h-4 text-zinc-500 mr-3" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Search or Enter URL..."
            className="flex-1 bg-transparent border-0 outline-none text-zinc-100 text-lg placeholder:text-zinc-500"
            autoComplete="off"
          />
          {query && (
            <button
              onClick={() => {
                setQuery("");
                inputRef.current?.focus();
              }}
              className="text-zinc-500 hover:text-zinc-300"
            >
              <span className="sr-only">Clear</span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          {searchOptions.map((option, index) => (
            <div
              key={`${option.type}-${option.text}-${index}`}
              className={`flex items-center px-4 py-3 cursor-pointer ${
                selectedIndex === index
                  ? "bg-amber-700 text-white"
                  : "hover:bg-zinc-800 text-zinc-200"
              }`}
              onClick={option.action}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              <div className="mr-3 flex-shrink-0 w-4 h-4 flex items-center justify-center">
                {(option.type === "url" || option.type === "recent") &&
                    option.domain
                  ? (
                    <img
                      src={getFaviconUrl(option.domain) || "/placeholder.svg"}
                      alt={`${option.domain} favicon`}
                      width={16}
                      height={16}
                      className="rounded-sm" // Add a slight rounding to favicons
                    />
                  )
                  : option.type === "search"
                  ? (
                    <Search
                      className={`w-full h-full ${
                        selectedIndex === index ? "text-white" : "text-zinc-400"
                      }`}
                    />
                  )
                  : option.type === "ai"
                  ? (
                    <MessageCircle
                      className={`w-full h-full ${
                        selectedIndex === index ? "text-white" : "text-zinc-400"
                      }`}
                    />
                  )
                  : (
                    // Fallback icon if needed, though Globe might be redundant if favicons load
                    <Globe
                      className={`w-full h-full ${
                        selectedIndex === index ? "text-white" : "text-zinc-400"
                      }`}
                    />
                  )}
              </div>

              <div
                className={`flex-1 truncate ${
                  selectedIndex === index ? "text-white" : "text-zinc-100"
                }`}
              >
                {option.type === "url" && (
                  <>
                    Go to{" "}
                    <span
                      className={`font-medium ${
                        selectedIndex === index ? "text-white" : "text-zinc-50"
                      }`}
                    >
                      {option.text}
                    </span>
                  </>
                )}
                {option.type === "search" && (
                  <span
                    className={`${
                      selectedIndex === index ? "text-white" : "text-zinc-100"
                    }`}
                  >
                    {option.text}
                  </span>
                )}
                {option.type === "ai" && (
                  <span
                    className={`${
                      selectedIndex === index ? "text-white" : "text-zinc-100"
                    }`}
                  >
                    {option.text}
                  </span>
                )}
                {option.type === "recent" && (
                  <span
                    className={`${
                      selectedIndex === index ? "text-white" : "text-zinc-100"
                    }`}
                  >
                    {option.text}
                  </span>
                )}
              </div>

              <div className="ml-3 flex-shrink-0">
                <ArrowRight
                  className={`w-4 h-4 ${
                    selectedIndex === index ? "text-white" : "text-zinc-500"
                  }`}
                />
              </div>
            </div>
          ))}
          {query && searchOptions.length === 0 && (
            <div className="px-4 py-3 text-zinc-500 text-center">
              No results found.
            </div>
          )}
        </div>

        <div className="px-4 py-2 text-xs text-zinc-500 border-t border-zinc-800 flex justify-between flex-shrink-0">
          <div>
            <span className="mr-2">↑↓ to navigate</span>
            <span>↵ to select</span>
          </div>
          <div>
            <span>Esc to close</span>
          </div>
        </div>
      </div>
    </div>
  );
}