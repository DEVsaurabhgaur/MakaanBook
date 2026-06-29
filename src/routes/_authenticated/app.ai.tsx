import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, useEffect, useCallback } from "react";
import { queryMakaanBookAi } from "@/lib/api/ai.functions";
import {
  Sparkles, Send, Bot, User, CornerDownLeft, Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/ai")({
  head: () => ({ meta: [{ title: "AI Assistant — MakaanBook" }] }),
  component: AiAssistantPage,
});

type Message = {
  role: "user" | "assistant";
  content: string;
};

const SUGGESTIONS = [
  "Total kitna rent pending hai is month?",
  "Kaunse rooms occupied hain?",
  "Kis kirayedar ka meter change hua tha?",
  "Mujhe active tenants ki list dikhao.",
];

function AiAssistantPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Namaste! Main aapka MakaanBook AI assistant hoon. Main aapke properties, tenants, rent collections aur electricity bills ke data ke baare mein answers de sakta hoon. Boliye, aaj kya madad karoon? 🏠⚡",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleSend = useCallback(async (promptText: string) => {
    if (!promptText.trim() || loading) return;
    const userMsg: Message = { role: "user", content: promptText };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    try {
      // Exclude system/initial message from prompt history for standard clean API payload
      const historyPayload = messages
        .filter((_, idx) => idx > 0)
        .map((m) => ({ role: m.role, content: m.content }));

      const result = await queryMakaanBookAi({
        data: {
          prompt: promptText,
          history: historyPayload,
        },
      });

      const reply = result?.response || "Khed hai, main koi response generate nahi kar paya.";
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch (err: any) {
      toast.error(err.message || "Failed to communicate with AI");
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Khed hai, server communication error ke karan main jawab nahi de paya." },
      ]);
    } finally {
      setLoading(false);
    }
  }, [messages]);

  return (
    <div className="mx-auto max-w-4xl space-y-6 h-[85vh] flex flex-col">
      <div className="shrink-0">
        <h1 className="font-display text-3xl font-bold flex items-center gap-2">
          <Sparkles className="h-7 w-7 text-primary animate-pulse" />
          MakaanBook AI
        </h1>
        <p className="text-muted-foreground text-sm">Ask questions in Hinglish about your rent records, tenants, and bills.</p>
      </div>

      <div className="flex-1 flex flex-col md:flex-row gap-4 min-h-0">
        {/* Chat window */}
        <Card className="flex-1 flex flex-col min-h-0 glass-card">
          <CardHeader className="py-3 px-4 border-b border-border/40 shrink-0">
            <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
              <Bot className="h-4 w-4 text-primary" /> Assistant Chat
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`flex gap-3 max-w-[85%] ${
                  msg.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"
                }`}
              >
                <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 border ${
                  msg.role === "user"
                    ? "bg-primary/10 border-primary/20 text-primary"
                    : "bg-muted border-border text-muted-foreground"
                }`}>
                  {msg.role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4 text-primary" />}
                </div>
                <div className={`rounded-2xl px-4 py-2.5 text-sm whitespace-pre-line leading-relaxed ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground font-medium rounded-tr-none"
                    : "bg-card/80 border border-border text-foreground rounded-tl-none"
                }`}>
                  {msg.content}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex gap-3 max-w-[85%] mr-auto">
                <div className="h-8 w-8 rounded-lg bg-muted border border-border flex items-center justify-center shrink-0">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
                <div className="rounded-2xl rounded-tl-none bg-card/85 border border-border px-4 py-3 text-sm flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  MakaanBook data analyze kar raha hai...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </CardContent>

          {/* Input block */}
          <div className="p-3 border-t border-border/40 bg-card/10 shrink-0">
            <div className="relative flex items-center">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !loading) {
                    handleSend(input);
                  }
                }}
                placeholder="Ask e.g. Kis room ka rent pending hai?"
                className="pr-12 py-5 rounded-xl border-border bg-background/50 focus-visible:ring-primary"
                disabled={loading}
              />
              <Button
                onClick={() => handleSend(input)}
                size="icon"
                className="absolute right-1.5 h-8 w-8 rounded-lg bg-primary hover:opacity-90"
                disabled={loading || !input.trim()}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>

        {/* Suggestions panel */}
        <div className="md:w-64 shrink-0 flex flex-col gap-3">
          <h3 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground px-1">Suggested Prompts</h3>
          <div className="flex flex-row md:flex-col gap-2 overflow-x-auto md:overflow-x-visible pb-2 md:pb-0">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => handleSend(s)}
                disabled={loading}
                className="text-left text-xs bg-card/30 border border-border hover:border-primary/50 hover:bg-card/50 transition-all p-3 rounded-xl cursor-pointer w-48 md:w-full shrink-0 leading-normal"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
