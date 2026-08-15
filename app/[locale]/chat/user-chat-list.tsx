"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Clock,
  MessageCircle,
  MessageSquare,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
} from "lucide-react";
import { RemoteImage } from "@/components/remote-image";

export function UserChatList({ locale }: { locale: string }) {
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const vi = locale === "vi";

  useEffect(() => {
    loadConversations();
  }, []);

  async function loadConversations() {
    setLoading(true);
    try {
      const res = await fetch("/api/conversations");
      if (res.ok) {
        const json = await res.json();
        setConversations(json.conversations || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function deleteChat(id: string, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (
      !confirm(
        vi
          ? "Bạn có chắc muốn xóa cuộc trò chuyện này?"
          : "Are you sure you want to delete this chat?"
      )
    ) {
      return;
    }
    try {
      const res = await fetch(`/api/conversations/${id}`, { method: "DELETE" });
      if (res.ok) {
        setConversations((all) => all.filter((c) => c.id !== id));
      }
    } catch (e) {
      console.error(e);
    }
  }

  const filtered = conversations.filter((c) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      c.character?.name?.toLowerCase().includes(q) ||
      c.title?.toLowerCase().includes(q) ||
      c.lastMessage?.content?.toLowerCase().includes(q)
    );
  });

  if (loading) {
    return (
      <div className="admin-loading">
        <RefreshCw className="spin" />
        <span>{vi ? "Đang tải các cuộc trò chuyện..." : "Loading conversations..."}</span>
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="empty-state">
        <MessageCircle style={{ width: "42px", height: "42px", margin: "0 auto 12px", color: "var(--accent)" }} />
        <h3>{vi ? "Bạn chưa có cuộc trò chuyện nào" : "No conversations yet"}</h3>
        <p>{vi ? "Hãy khám phá các nhân vật và bắt đầu cuộc phiêu lưu đầu tiên!" : "Explore characters and start your first adventure!"}</p>
        <Link href={`/${locale}`} className="primary-button" style={{ display: "inline-flex", marginTop: "16px", gap: "8px" }}>
          <Sparkles /> {vi ? "Khám phá nhân vật" : "Explore characters"}
        </Link>
      </div>
    );
  }

  return (
    <div className="my-chats-container">
      <div className="my-chats-search-bar">
        <div className="search-box">
          <Search />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={vi ? "Tìm theo tên nhân vật hoặc nội dung..." : "Search chats..."}
          />
        </div>
        <span className="total-chats-badge">
          {filtered.length} {vi ? "cuộc trò chuyện" : "chats"}
        </span>
      </div>

      <div className="my-chats-grid">
        {filtered.map((conv) => {
          const charSlug = conv.character?.slug || "";
          const charName = conv.character?.name || "Character";
          const avatarUrl = conv.character?.avatarUrl;
          const destination = charSlug
            ? `/${locale}/characters/${charSlug}/chat?chat=${conv.id}`
            : `/${locale}/chat/${conv.id}`;

          return (
            <Link key={conv.id} href={destination} className="my-chat-card">
              <div className="my-chat-avatar">
                <RemoteImage src={avatarUrl} alt={charName} />
              </div>

              <div className="my-chat-main">
                <div className="my-chat-header">
                  <div>
                    <h3 className="my-chat-name">{charName}</h3>
                    <span className="my-chat-scenario">{conv.scenario?.title || conv.title}</span>
                  </div>
                  <button
                    className="delete-icon-btn chat-card-del"
                    title={vi ? "Xóa cuộc trò chuyện" : "Delete"}
                    onClick={(e) => deleteChat(conv.id, e)}
                  >
                    <Trash2 />
                  </button>
                </div>

                {conv.lastMessage ? (
                  <p className="my-chat-snippet">
                    <strong>{conv.lastMessage.role === "user" ? (vi ? "Bạn: " : "You: ") : `${charName}: `}</strong>
                    {conv.lastMessage.content}
                  </p>
                ) : (
                  <p className="my-chat-snippet muted">{vi ? "Chưa có tin nhắn mới" : "No messages yet"}</p>
                )}

                <div className="my-chat-footer">
                  <span>
                    <Clock /> {new Date(conv.updatedAt).toLocaleDateString()} {new Date(conv.updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                  <span className="message-count-badge">
                    <MessageSquare /> {conv.messageCount} {vi ? "tin nhắn" : "msgs"}
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
