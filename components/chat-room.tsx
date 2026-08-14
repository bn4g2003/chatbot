"use client";

import { Send, Square } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type Message = {
  id?: string;
  role: "user" | "assistant" | "system";
  content: string;
};

function RoleplayContent({ content }: { content: string }) {
  const segments = content.split(/(\*[^*]+\*)/g).filter(Boolean);
  return (
    <div className="roleplay-content">
      {segments.map((segment, index) => {
        const narration = segment.startsWith("*") && segment.endsWith("*");
        const text = narration ? segment.slice(1, -1) : segment;
        return narration ? (
          <span className="roleplay-narration" key={index}>
            {text}
          </span>
        ) : (
          <span className="roleplay-dialogue" key={index}>
            {text}
          </span>
        );
      })}
    </div>
  );
}

export function ChatRoom({
  conversationId,
  locale,
}: {
  conversationId: string;
  locale: string;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const abort = useRef<AbortController | null>(null);
  const end = useRef<HTMLDivElement>(null);
  const vi = locale === "vi";

  useEffect(() => {
    const controller = new AbortController();
    async function loadConversation() {
      const response = await fetch(`/api/conversations/${conversationId}`, {
        signal: controller.signal,
      });
      if (!response.ok) return;
      const data = await response.json();
      setMessages(data.messages ?? []);
    }
    void loadConversation();
    return () => controller.abort();
  }, [conversationId]);

  useEffect(() => {
    end.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send() {
    const content = text.trim();
    if (!content || busy) return;
    setText("");
    setMessages((current) => [
      ...current,
      { role: "user", content },
      { role: "assistant", content: "" },
    ]);
    setBusy(true);
    abort.current = new AbortController();
    try {
      const response = await fetch(
        `/api/conversations/${conversationId}/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content }),
          signal: abort.current.signal,
        },
      );
      if (!response.ok || !response.body) {
        const data = await response.json();
        throw new Error(data.error ?? "Request failed");
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const packets = buffer.split("\n\n");
        buffer = packets.pop() ?? "";
        for (const packet of packets) {
          const type = packet.match(/^event: (.+)$/m)?.[1];
          const raw = packet.match(/^data: (.+)$/m)?.[1];
          if (!raw) continue;
          const data = JSON.parse(raw);
          if (type === "delta")
            setMessages((all) => [
              ...all.slice(0, -1),
              { ...all.at(-1)!, content: all.at(-1)!.content + data.text },
            ]);
          if (type === "error") throw new Error(data.message);
        }
      }
    } catch (error) {
      if ((error as Error).name !== "AbortError")
        setMessages((current) => [
          ...current.slice(0, -1),
          {
            role: "assistant",
            content: `⚠ ${error instanceof Error ? error.message : "Error"}`,
          },
        ]);
    } finally {
      setBusy(false);
      abort.current = null;
    }
  }

  return (
    <div className="chat-shell embedded-chat">
      <div className="chat-format-hint">
        {vi
          ? "Chữ nghiêng là hành động và bối cảnh · Chữ thường là lời thoại"
          : "Italic text is action and context · Regular text is dialogue"}
      </div>
      <div className="message-list">
        {messages.map((message, index) => (
          <div className={`message ${message.role}`} key={message.id ?? index}>
            <span>
              {message.role === "user" ? (vi ? "Bạn" : "You") : "Lorelia"}
            </span>
            {message.role === "assistant" ? (
              <RoleplayContent content={message.content || "…"} />
            ) : (
              <p>{message.content}</p>
            )}
          </div>
        ))}
        <div ref={end} />
      </div>
      <div className="composer">
        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              void send();
            }
          }}
          placeholder={vi ? "Bạn sẽ nói gì?" : "What will you say?"}
        />
        {busy ? (
          <button onClick={() => abort.current?.abort()} aria-label="Stop">
            <Square />
          </button>
        ) : (
          <button onClick={send} aria-label="Send">
            <Send />
          </button>
        )}
      </div>
    </div>
  );
}
