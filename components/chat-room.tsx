"use client";

import { ArrowDown, Send, Square } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";

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
  characterName = "Lorelia",
  immersive = false,
  conversationIntro,
}: {
  conversationId: string;
  locale: string;
  characterName?: string;
  immersive?: boolean;
  conversationIntro?: ReactNode;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [showJumpToLatest, setShowJumpToLatest] = useState(false);
  const abort = useRef<AbortController | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const userScrolledUp = useRef<boolean>(false);
  const vi = locale === "vi";

  // Scroll ONLY the message list container, NEVER the window or page viewport
  function scrollToBottom(smooth = false) {
    if (!listRef.current) return;
    const container = listRef.current;
    if (smooth) {
      container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
    } else {
      container.scrollTop = container.scrollHeight;
    }
  }

  function handleScroll() {
    if (!listRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = listRef.current;
    // If distance from bottom is > 100px, user is reading history
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
    userScrolledUp.current = !isNearBottom;
    setShowJumpToLatest(!isNearBottom);
  }

  useEffect(() => {
    const controller = new AbortController();
    async function loadConversation() {
      try {
        const response = await fetch(`/api/conversations/${conversationId}`, {
          signal: controller.signal,
        });
        if (!response.ok) return;
        const data = await response.json();
        setMessages(data.messages ?? []);
        userScrolledUp.current = false;
        setShowJumpToLatest(false);
        setTimeout(() => scrollToBottom(false), 50);
      } catch (error: unknown) {
        if (!(error instanceof Error && error.name === "AbortError")) {
          console.error("Failed to load conversation:", error);
        }
      }
    }
    void loadConversation();
    return () => controller.abort();
  }, [conversationId]);

  // When new tokens arrive during streaming, scroll internally within message box only
  useEffect(() => {
    if (!userScrolledUp.current) {
      scrollToBottom(false);
    }
  }, [messages]);

  async function send() {
    const content = text.trim();
    if (!content || busy) return;
    setText("");
    userScrolledUp.current = false;
    setShowJumpToLatest(false);
    setMessages((current) => [
      ...current,
      { role: "user", content },
      { role: "assistant", content: "" },
    ]);
    setTimeout(() => scrollToBottom(true), 30);
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
    <div className={`chat-shell embedded-chat ${immersive ? "immersive-chat" : ""}`}>
      <div className="chat-format-hint">
        {vi
          ? "Chữ nghiêng là hành động và bối cảnh · Chữ thường là lời thoại"
          : "Italic text is action and context · Regular text is dialogue"}
      </div>
      <div
        className="message-list"
        ref={listRef}
        onScroll={handleScroll}
        aria-live="polite"
      >
        {conversationIntro}
        {messages.map((message, index) => (
          <div className={`message ${message.role}`} key={message.id ?? index}>
            <span>
              {message.role === "user" ? (vi ? "Bạn" : "You") : characterName}
            </span>
            {message.role === "assistant" ? (
              <RoleplayContent content={message.content || "…"} />
            ) : (
              <p>{message.content}</p>
            )}
          </div>
        ))}
      </div>
      {showJumpToLatest && (
        <button
          type="button"
          className="jump-to-latest"
          onClick={() => {
            userScrolledUp.current = false;
            setShowJumpToLatest(false);
            scrollToBottom(true);
          }}
        >
          <ArrowDown />
          <span>{vi ? "Tin nhắn mới nhất" : "Latest message"}</span>
        </button>
      )}
      <div className="composer-zone">
        <div className="composer">
          <textarea
            rows={1}
            value={text}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void send();
              }
            }}
            placeholder={vi ? "Nhập lời thoại hoặc hành động…" : "Write dialogue or an action…"}
            aria-label={vi ? "Tin nhắn của bạn" : "Your message"}
          />
          {busy ? (
            <button type="button" onClick={() => abort.current?.abort()} aria-label={vi ? "Dừng trả lời" : "Stop response"}>
              <Square />
            </button>
          ) : (
            <button type="button" onClick={send} aria-label={vi ? "Gửi tin nhắn" : "Send message"} disabled={!text.trim()}>
              <Send />
            </button>
          )}
        </div>
        <small className="composer-shortcut">
          {vi ? "Enter để gửi · Shift + Enter để xuống dòng" : "Enter to send · Shift + Enter for a new line"}
        </small>
      </div>
    </div>
  );
}
