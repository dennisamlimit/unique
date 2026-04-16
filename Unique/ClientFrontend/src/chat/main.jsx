import React, { useCallback, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { trigger } from "../lib/rage.js";
import { THEME_CSS, getStoredUiTheme, normalizeUiTheme, persistUiTheme, getThemeVars } from "../lib/theme.js";

const modes = ["ic", "ooc", "me", "do", "try"];
const labels = { ic: "IC", ooc: "OOC", me: "ME", do: "DO", try: "TRY" };
const maxMessages = 120;

const typeStyles = {
  ic: "theme-chat-text opacity-95",
  ooc: "theme-chat-text opacity-90",
  me: "theme-chat-text italic opacity-95",
  do: "theme-chat-text opacity-95",
  try: "theme-chat-text opacity-95",
  system: "theme-chat-text font-black uppercase tracking-wider",
  admin: "text-rose-400 font-black shadow-sm"
};

function ChatLine({ line, faded }) {
  const type = line.type || "ic";
  const tag = type === "system" ? "System" : type.toUpperCase();

  return (
    <div className={`text-[clamp(12px,1.1vw,15px)] leading-[1.42] transition-opacity duration-500 ${faded ? "opacity-25" : "opacity-100"} ${typeStyles[type] || "text-zinc-100"}`}>
      <span className="theme-chat-tag mr-1.5 font-black">[{tag}]</span>
      {type !== "system" && line.sender ? <span className="mr-1.5 font-bold text-white">{line.sender}:</span> : null}
      <span className="break-words font-medium">{line.message}</span>
    </div>
  );
}

let CACHED_THEME = getStoredUiTheme();

function ChatApp() {
  const [visible, setVisible] = useState(false);
  const [theme, setTheme] = useState(CACHED_THEME);
  const [open, setOpen] = useState(false);
  const [currentMode, setCurrentMode] = useState("ic");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [faded, setFaded] = useState(false);
  const inputRef = useRef(null);
  const scrollRef = useRef(null);
  const fadeTimer = useRef(null);
  const historyRef = useRef([]);
  const historyIndexRef = useRef(-1);

  const clearFade = useCallback(() => {
    if (fadeTimer.current) {
      clearTimeout(fadeTimer.current);
      fadeTimer.current = null;
    }

    setFaded(false);
  }, []);

  const startFade = useCallback(() => {
    clearFade();
    fadeTimer.current = setTimeout(() => setFaded(true), 9000);
  }, [clearFade]);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    });
  }, []);

  const addMessage = useCallback((type, sender, message) => {
    clearFade();
    setMessages((current) => [...current, { id: Date.now() + Math.random(), type, sender, message }].slice(-maxMessages));
    scrollToBottom();
    startFade();
  }, [clearFade, scrollToBottom, startFade]);

  const openInput = useCallback((mode = "ic") => {
    clearFade();
    setCurrentMode(mode);
    setInput("");
    historyIndexRef.current = -1;
    setOpen(true);
    setTimeout(() => inputRef.current?.focus(), 0);
    scrollToBottom();
  }, [clearFade, scrollToBottom]);

  const closeInput = useCallback(() => {
    setOpen(false);
    setInput("");
    inputRef.current?.blur();
    scrollToBottom();
    startFade();
  }, [scrollToBottom, startFade]);

  const submit = useCallback(() => {
    const text = input.trim();
    if (!text) {
      trigger("cef:chat:close");
      return;
    }

    if (historyRef.current[historyRef.current.length - 1] !== text) {
      historyRef.current = [...historyRef.current, text].slice(-40);
    }
    historyIndexRef.current = -1;
    trigger("cef:chat:submit", currentMode, text);
  }, [currentMode, input]);

  useEffect(() => {
    window.chatApp = {
      addMessage,
      openInput,
      closeInput,
      setTheme: (raw) => {
        try {
          const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
          const normalized = normalizeUiTheme(parsed);
          CACHED_THEME = normalized;
          setTheme(normalized);
        } catch {
          setTheme(getStoredUiTheme());
        }
      },
      setVisible: (state) => {
        setVisible(!!state);
        if (!state) {
          setOpen(false);
        }
      }
    };

    trigger("cef:chat:ready");

    return () => {
      delete window.chatApp;
      clearFade();
    };
  }, [addMessage, clearFade, closeInput, openInput]);

  if (!visible) {
    return null;
  }

  const hasMessages = messages.length > 0;
  const showPassiveBackground = open || (!faded && hasMessages);
  const themeVars = getThemeVars(theme);

  return (
    <main className="unique-theme pointer-events-none fixed left-[clamp(10px,1.2vw,22px)] top-[clamp(8px,1.2vh,14px)] w-[min(560px,45vw)] text-white max-[760px]:left-2 max-[760px]:top-3 max-[760px]:w-[calc(100vw-16px)]" style={themeVars}>
      <style>{THEME_CSS}</style>
      <section className="pointer-events-auto grid gap-2">
        <div
          ref={scrollRef}
          onWheel={clearFade}
          className={`h-[clamp(230px,28vh,305px)] overflow-y-auto overflow-x-hidden rounded-md px-3 py-2 [scrollbar-width:thin] transition-all duration-300 ${
            showPassiveBackground
              ? "border border-violet-200/[0.1] bg-black/[0.48] shadow-[0_12px_34px_rgba(0,0,0,0.44)]"
              : "border border-transparent bg-transparent shadow-none"
          }`}
        >
          <div className="grid gap-1">
            {messages.map((line) => (
              <ChatLine key={line.id} line={line} faded={faded && !open} />
            ))}
          </div>
        </div>

        {open && (
          <div className="theme-popover grid gap-2 rounded-md p-2 shadow-[0_12px_34px_rgba(0,0,0,0.5)]">
            <div className="grid grid-cols-5 gap-1">
              {modes.map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => {
                    setCurrentMode(mode);
                    trigger("cef:chat:setMode", mode);
                    inputRef.current?.focus();
                  }}
                  className={`theme-nav-tile h-8 rounded text-xs font-black uppercase tracking-normal transition ${
                    currentMode === mode ? "theme-chat-soft theme-chat-text theme-chat-primary-border theme-chat-glow" : "bg-white/[0.08] text-zinc-300 hover:bg-white/[0.14] hover:text-white"
                  }`}
                >
                  {labels[mode]}
                </button>
              ))}
            </div>
            <input
              ref={inputRef}
              value={input}
              maxLength={180}
              autoComplete="off"
              spellCheck={false}
              placeholder="Nachricht eingeben"
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  submit();
                  event.preventDefault();
                }

                if (event.key === "Escape") {
                  trigger("cef:chat:close");
                  event.preventDefault();
                }

                if (event.key === "ArrowUp") {
                  if (historyRef.current.length > 0) {
                    const nextIndex = historyIndexRef.current < 0
                      ? historyRef.current.length - 1
                      : Math.max(0, historyIndexRef.current - 1);

                    historyIndexRef.current = nextIndex;
                    setInput(historyRef.current[nextIndex]);
                  }

                  event.preventDefault();
                }

                if (event.key === "ArrowDown") {
                  if (historyRef.current.length > 0 && historyIndexRef.current >= 0) {
                    const nextIndex = historyIndexRef.current + 1;
                    if (nextIndex >= historyRef.current.length) {
                      historyIndexRef.current = -1;
                      setInput("");
                    } else {
                      historyIndexRef.current = nextIndex;
                      setInput(historyRef.current[nextIndex]);
                    }
                  }

                  event.preventDefault();
                }
              }}
              className="h-10 rounded-md theme-input bg-black/[0.64] px-3 text-[15px] font-semibold text-white outline-none placeholder:text-zinc-500 focus:theme-primary-border"
            />
          </div>
        )}
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")).render(<ChatApp />);
