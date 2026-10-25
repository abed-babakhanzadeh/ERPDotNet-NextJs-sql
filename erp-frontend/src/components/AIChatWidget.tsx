"use client";

import React, { useState, useRef, useEffect } from "react";
import { Send, Bot, X, MessageSquare, User, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";

// آدرس سرویس دستیار هوشمند (erp-ai-agent)؛ با NEXT_PUBLIC_AI_AGENT_URL قابل تنظیم است (پیش‌فرض: آدرس فعلی سرور)
const AI_AGENT_URL = (process.env.NEXT_PUBLIC_AI_AGENT_URL || "http://192.168.0.241:8000").replace(/\/+$/, "");

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function AIChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "سلام! من دستیار هوشمند ERP هستم. چطور می‌تونم کمکتون کنم؟" }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isLoading, isOpen]);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMsg = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setIsLoading(true);

    try {
      const response = await fetch(`${AI_AGENT_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMsg }),
      });

      if (!response.ok) throw new Error("Network error");

      const data = await response.json();
      setMessages((prev) => [...prev, { role: "assistant", content: data.response }]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "ارتباط با دستیار هوشمند برقرار نشد. کمی بعد دوباره تلاش کنید." },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-4 left-4 z-50 flex flex-col items-start gap-2 sm:bottom-6 sm:left-6" dir="rtl">
      
      {isOpen && (
        <div className="w-[min(380px,calc(100vw-2rem))] h-[min(500px,calc(100svh-6rem))] flex flex-col bg-card border rounded-xl shadow-2xl animate-in slide-in-from-bottom-10 fade-in duration-300 overflow-hidden">
          
          <div className="bg-primary text-primary-foreground p-4 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Bot className="w-6 h-6" />
              <span className="font-bold text-sm">دستیار هوشمند سازمانی</span>
            </div>
            <button
              className="hover:bg-primary-foreground/20 rounded-full p-1 transition-colors" aria-label="بستن"
              onClick={() => setIsOpen(false)}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 bg-muted/40 space-y-4">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex gap-3 max-w-[85%] ${
                  msg.role === "user" ? "self-end flex-row-reverse mr-auto" : "self-start ml-auto"
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border ${
                    msg.role === "user" 
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card text-muted-foreground"
                  }`}
                >
                  {msg.role === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>

                <div
                  className={`rounded-2xl px-4 py-2 text-sm shadow-sm overflow-hidden ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground rounded-tl-none"
                      : "bg-card text-card-foreground rounded-tr-none border"
                  }`}
                >
                  {/* --- بخش اصلاح شده --- */}
                  <div className="prose dark:prose-invert prose-sm max-w-none leading-relaxed [&>p]:mb-0 [&>ul]:mb-0 [&>ol]:mb-0">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                  {/* --------------------- */}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-3 self-start max-w-[85%]">
                <div className="w-8 h-8 rounded-full bg-card border flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4 animate-pulse text-muted-foreground" />
                </div>
                <div className="bg-card text-muted-foreground rounded-2xl rounded-tr-none px-4 py-2 text-sm flex items-center gap-2 border shadow-sm">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>در حال فکر کردن...</span>
                </div>
              </div>
            )}
            <div ref={scrollRef} />
          </div>

          <div className="p-3 border-t bg-card flex gap-2 items-center">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendMessage();
              }}
              className="flex w-full gap-2"
            >
              <input
                placeholder="سوال خود را بپرسید..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="flex-1 text-sm px-3 py-2 bg-muted border-transparent focus:ring-2 focus:ring-ring rounded-md outline-none transition-all"
                disabled={isLoading}
              />
              <button 
                type="submit" 
                disabled={isLoading || !input.trim()}
                className="bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground rounded-md p-2 transition-colors flex items-center justify-center" aria-label="ارسال"
              >
                <Send className="w-4 h-4" style={{ transform: "scaleX(-1)" }} />
              </button>
            </form>
          </div>
        </div>
      )}

      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="h-12 w-12 rounded-full shadow-lg hover:scale-105 active:scale-95 transition-transform duration-200 bg-primary text-primary-foreground flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          aria-label="دستیار هوشمند"
          title="دستیار هوشمند"
        >
          <MessageSquare className="w-6 h-6" />
        </button>
      )}
    </div>
  );
}