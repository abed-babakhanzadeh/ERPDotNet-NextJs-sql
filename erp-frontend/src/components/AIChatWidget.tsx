"use client";

import React, { useState, useRef, useEffect } from "react";
import { Send, Bot, X, MessageSquare, User, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";

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
      const response = await fetch("http://192.168.0.241:8000/chat", {
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
        { role: "assistant", content: "❌ متاسفانه ارتباط با سرور هوش مصنوعی برقرار نشد. (لطفا بررسی کنید main.py اجرا باشد)" },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2 font-sans" dir="rtl">
      
      {isOpen && (
        <div className="w-[380px] h-[500px] flex flex-col bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-2xl animate-in slide-in-from-bottom-10 fade-in duration-300 overflow-hidden">
          
          <div className="bg-blue-600 text-white p-4 flex justify-between items-center shadow-md">
            <div className="flex items-center gap-2">
              <Bot className="w-6 h-6" />
              <span className="font-bold text-sm">دستیار هوشمند سازماني</span>
            </div>
            <button
              className="text-white hover:bg-white/20 rounded-full p-1 transition-colors"
              onClick={() => setIsOpen(false)}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 bg-zinc-50 dark:bg-zinc-950 space-y-4">
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
                      ? "bg-blue-600 text-white border-blue-600" 
                      : "bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700"
                  }`}
                >
                  {msg.role === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>

                <div
                  className={`rounded-2xl px-4 py-2 text-sm shadow-sm overflow-hidden ${
                    msg.role === "user"
                      ? "bg-blue-600 text-white rounded-tl-none"
                      : "bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100 rounded-tr-none border border-zinc-200 dark:border-zinc-700"
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
                <div className="w-8 h-8 rounded-full bg-white dark:bg-zinc-800 border flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4 animate-pulse text-zinc-500" />
                </div>
                <div className="bg-white dark:bg-zinc-800 text-zinc-500 rounded-2xl rounded-tr-none px-4 py-2 text-sm flex items-center gap-2 border shadow-sm">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>در حال فکر کردن...</span>
                </div>
              </div>
            )}
            <div ref={scrollRef} />
          </div>

          <div className="p-3 border-t bg-white dark:bg-zinc-900 flex gap-2 items-center">
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
                className="flex-1 text-sm px-3 py-2 bg-zinc-100 dark:bg-zinc-800 border-transparent focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-md outline-none transition-all"
                disabled={isLoading}
              />
              <button 
                type="submit" 
                disabled={isLoading || !input.trim()}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-300 text-white rounded-md p-2 transition-colors flex items-center justify-center"
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
          className="h-14 w-14 rounded-full shadow-xl hover:scale-110 active:scale-95 transition-all duration-200 bg-blue-600 text-white flex items-center justify-center"
        >
          <MessageSquare className="w-7 h-7" />
        </button>
      )}
    </div>
  );
}