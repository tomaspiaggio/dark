"use client";

import type React from "react";

import { useCallback, useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowDown, ArrowUp, XIcon } from "lucide-react";
import {
  dismissFindInPage,
  findNext,
  findPrevious,
  searchInPage,
  onFindResults,
} from "@/controller/find-in-page";

// Debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export default function FindInPage() {
  const [inputValue, setInputValue] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [totalMatches, setTotalMatches] = useState(0);
  
  const debouncedInput = useDebounce(inputValue, 50);

  // Listen for results from main process
  useEffect(() => {
    const cleanup = onFindResults((results) => {
      console.log('Received find results:', results);
      setTotalMatches(results.matches);
      setCurrentIndex(results.activeMatchOrdinal);
    });
    
    return cleanup;
  }, []);

  // Search when debounced input changes
  useEffect(() => {
    searchInPage(debouncedInput);
  }, [debouncedInput]);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setInputValue(e.target.value);
    },
    [],
  );

  const handleNext = useCallback(() => {
    if (debouncedInput) {
      findNext(debouncedInput);
    }
  }, [debouncedInput]);

  const handlePrevious = useCallback(() => {
    if (debouncedInput) {
      findPrevious(debouncedInput);
    }
  }, [debouncedInput]);

  const handleClose = useCallback(() => {
    setInputValue("");
    dismissFindInPage();
  }, []);

  // Auto-focus
  useEffect(() => {
    const input = document.querySelector('input[type="text"]') as HTMLInputElement;
    if (input) {
      input.focus();
      input.select();
    }
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) {
        if (e.key === "Enter") {
          e.preventDefault();
          if (e.shiftKey) {
            handlePrevious();
          } else {
            handleNext();
          }
        }
        return;
      }

      if (e.key === "Escape") {
        e.preventDefault();
        handleClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [handleNext, handlePrevious, handleClose]);

  const getStatusText = () => {
    if (totalMatches > 0) {
      return `${currentIndex}/${totalMatches}`;
    }
    if (inputValue && debouncedInput && totalMatches === 0) {
      return "No results";
    }
    return null;
  };

  return (
    <div className="fixed bg-neutral-800 text-neutral-300 rounded-md shadow-lg flex p-2.5 items-center space-x-2.5 z-50 w-auto w-full h-full max-w-xs print:hidden">
      <Input
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        placeholder="Find in page..."
        className="bg-transparent border-none focus-visible:ring-0 focus-visible:ring-offset-0 text-neutral-200 placeholder-neutral-400 h-6 p-0 text-sm flex-grow"
        aria-label="Search term"
        autoFocus
      />
      {getStatusText() && (
        <span className="text-xs text-neutral-400 whitespace-nowrap" aria-live="polite">
          {getStatusText()}
        </span>
      )}
      <Button
        variant="ghost"
        size="icon"
        onClick={handlePrevious}
        className="h-6 w-6 text-neutral-400 hover:bg-neutral-700 hover:text-neutral-200 disabled:opacity-50"
        disabled={totalMatches === 0}
        aria-label="Previous match"
      >
        <ArrowUp className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={handleNext}
        className="h-6 w-6 text-neutral-400 hover:bg-neutral-700 hover:text-neutral-200 disabled:opacity-50"
        disabled={totalMatches === 0}
        aria-label="Next match"
      >
        <ArrowDown className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={handleClose}
        className="h-6 w-6 text-neutral-400 hover:bg-neutral-700 hover:text-neutral-200"
        aria-label="Close find bar"
      >
        <XIcon className="h-4 w-4" />
      </Button>
    </div>
  );
}
