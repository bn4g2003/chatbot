"use client";

import {
  Clock,
  History,
  MessageCircle,
  Plus,
  RotateCcw,
  Save,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { ChatRoom } from "./chat-room";

type Scenario = {
  id: string;
  translation?: { title: string; description: string; openingMessage: string };
};

type PastConversation = {
  id: string;
  title: string;
  scenarioId: string;
  messageCount: number;
  updatedAt: string;
  lastMessage?: { role: string; content: string; createdAt: string } | null;
};

const emptyCustomScenario = {
  title: "", description: "", location: "", time: "", userRole: "",
  relationship: "", goal: "", openingMessage: "",
};

export function CharacterExperience({
  characterId,
  characterSlug,
  characterName,
  scenarios,
  locale,
  conversationId,
}: {
  characterId: string;
  characterSlug: string;
  characterName: string;
  scenarios: Scenario[];
  locale: string;
  conversationId?: string;
}) {
  const { data, isPending } = useSession();
  const router = useRouter();
  const vi = locale === "vi";

  const [activeConvId, setActiveConvId] = useState<string | undefined>(conversationId);
  const [pastConversations, setPastConversations] = useState<PastConversation[]>([]);
  const [selectedScenario, setSelectedScenario] = useState(scenarios[0]?.id ?? "");
  const [customScenario, setCustomScenario] = useState(emptyCustomScenario);
  const [preferredName, setPreferredName] = useState("");
  const [preferredAddress, setPreferredAddress] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [isStartingNew, setIsStartingNew] = useState(false);

  // Sync activeConvId when prop changes
  useEffect(() => {
    setActiveConvId(conversationId);
  }, [conversationId]);

  // Load user's conversations with this character
  useEffect(() => {
    if (!data?.user) return;
    loadUserConversations();
  }, [data?.user, characterId]);

  async function loadUserConversations() {
    try {
      const res = await fetch(`/api/conversations?characterId=${characterId}`);
      if (res.ok) {
        const json = await res.json();
        const convs: PastConversation[] = json.conversations || [];
        setPastConversations(convs);

        // Auto-resume latest conversation if none is specified in URL and user hasn't explicitly clicked "start new"
        if (!conversationId && !isStartingNew && convs.length > 0) {
          const latest = convs[0];
          setActiveConvId(latest.id);
          router.replace(`/${locale}/characters/${characterSlug}?chat=${latest.id}`);
        }
      }
    } catch (e) {
      console.error(e);
    }
  }

  // Load active conversation preferences
  useEffect(() => {
    if (!activeConvId) return;
    const controller = new AbortController();
    async function loadPreferences() {
      const response = await fetch(`/api/conversations/${activeConvId}`, {
        signal: controller.signal,
      });
      if (!response.ok) return;
      const data = await response.json();
      if (data.conversation) {
        setSelectedScenario(data.conversation.customScenario ? "custom" : data.conversation.scenarioId);
        if (data.conversation.customScenario) setCustomScenario(data.conversation.customScenario);
        setPreferredName(data.conversation.userPreferredName ?? "");
        setPreferredAddress(data.conversation.preferredAddress ?? "");
      }
    }
    void loadPreferences();
    return () => controller.abort();
  }, [activeConvId]);

  function requireLogin() {
    if (!data && !isPending) {
      router.push(`/${locale}/auth?reason=chat`);
      return false;
    }
    return true;
  }

  async function startConversation() {
    if (!requireLogin() || !selectedScenario || (selectedScenario === "custom" && !scenarios[0]?.id)) return;
    setBusy(true);
    setNotice("");
    try {
      const response = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          characterId,
          scenarioId: selectedScenario === "custom" ? scenarios[0].id : selectedScenario,
          customScenario: selectedScenario === "custom" ? customScenario : undefined,
          locale,
          userPreferredName: preferredName || undefined,
          preferredAddress: preferredAddress || undefined,
        }),
      });
      const body = await response.json();
      setBusy(false);
      if (response.ok) {
        setIsStartingNew(false);
        setActiveConvId(body.id);
        router.push(`/${locale}/characters/${characterSlug}?chat=${body.id}`);
        loadUserConversations();
      } else {
        setNotice(body.error ?? "Error creating conversation");
      }
    } catch (e: any) {
      setBusy(false);
      setNotice(e.message);
    }
  }

  async function savePreferences() {
    if (!activeConvId || !requireLogin()) return;
    setBusy(true);
    setNotice("");
    const response = await fetch(`/api/conversations/${activeConvId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userPreferredName: preferredName,
        preferredAddress,
      }),
    });
    setBusy(false);
    setNotice(
      response.ok
        ? vi
          ? "Đã lưu cách xưng hô."
          : "Preferences saved."
        : vi
          ? "Không thể lưu thiết lập."
          : "Could not save preferences.",
    );
  }

  async function deleteConversation(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (
      !confirm(
        vi
          ? "Bạn có chắc muốn xóa cuộc trò chuyện này?"
          : "Are you sure you want to delete this conversation?"
      )
    ) {
      return;
    }
    try {
      const res = await fetch(`/api/conversations/${id}`, { method: "DELETE" });
      if (res.ok) {
        if (activeConvId === id) {
          setActiveConvId(undefined);
          router.replace(`/${locale}/characters/${characterSlug}`);
        }
        loadUserConversations();
      }
    } catch (e) {
      console.error(e);
    }
  }

  function switchToConversation(id: string) {
    setIsStartingNew(false);
    setActiveConvId(id);
    router.push(`/${locale}/characters/${characterSlug}?chat=${id}`);
  }

  function handleStartNewClick() {
    setIsStartingNew(true);
    setActiveConvId(undefined);
    setPreferredName("");
    setPreferredAddress("");
    setCustomScenario(emptyCustomScenario);
    router.replace(`/${locale}/characters/${characterSlug}`);
  }

  return (
    <section className="character-experience">
      <div className="experience-heading">
        <p className="eyebrow">
          <Sparkles />
          {vi ? "Không gian nhập vai" : "Roleplay space"}
        </p>
        <h2>
          {vi
            ? `Trò chuyện cùng ${characterName}`
            : `Chat with ${characterName}`}
        </h2>
        <p>
          {vi
            ? "Đoạn hội thoại được lưu tự động theo tài khoản của bạn. Bạn có thể tiếp tục bất cứ lúc nào."
            : "Conversations are saved automatically. You can resume anytime."}
        </p>
      </div>

      <div className="experience-grid">
        {/* Main Chat Area */}
        <div className="experience-chat">
          {activeConvId ? (
            <ChatRoom conversationId={activeConvId} locale={locale} />
          ) : (
            <div className="chat-empty">
              <MessageCircle />
              <h3>
                {vi
                  ? "Bắt đầu cuộc trò chuyện mới"
                  : "Start a new conversation"}
              </h3>
              <p>
                {vi
                  ? "Chọn bối cảnh câu chuyện và cách xưng hô ở bên phải, sau đó nhấn nút Bắt đầu trò chuyện."
                  : "Choose a scenario and preferred address on the right, then click Start chatting."}
              </p>
              <button
                className="primary-button"
                style={{ marginTop: "16px" }}
                disabled={busy}
                onClick={startConversation}
              >
                <MessageCircle />
                {busy ? "…" : vi ? "Bắt đầu ngay" : "Start Chat"}
              </button>
            </div>
          )}
        </div>

        {/* Right Settings & History Sidebar */}
        <aside className="experience-settings">
          {/* Action to Start New or View Current */}
          <div className="sidebar-header-row">
            <div>
              <p className="eyebrow">
                {vi ? "Thiết lập cá nhân" : "Personal setup"}
              </p>
              <h3>{vi ? "Câu chuyện của bạn" : "Your story"}</h3>
            </div>
            {activeConvId && (
              <button
                className="new-chat-btn"
                title={vi ? "Tạo cuộc trò chuyện mới" : "Start new chat"}
                onClick={handleStartNewClick}
              >
                <Plus /> {vi ? "Mới" : "New"}
              </button>
            )}
          </div>

          {/* Scenario Picker */}
          <label>
            <span>{vi ? "Bối cảnh mở đầu:" : "Opening scenario:"}</span>
            <select
              value={selectedScenario}
              onChange={(event) => setSelectedScenario(event.target.value)}
              disabled={Boolean(activeConvId)}
            >
              {scenarios.map((scenario) => (
                <option key={scenario.id} value={scenario.id}>
                  {scenario.translation?.title}
                </option>
              ))}
              <option value="custom">{vi ? "Tự tạo bối cảnh riêng…" : "Create a private scenario…"}</option>
            </select>
          </label>

          {selectedScenario && selectedScenario !== "custom" && (
            <p className="scenario-description">
              {
                scenarios.find((scenario) => scenario.id === selectedScenario)
                  ?.translation?.description
              }
            </p>
          )}

          {selectedScenario === "custom" && (
            <div className="custom-scenario-form">
              <div className="custom-scenario-note">
                <Sparkles /><span>{vi ? "Chỉ bạn nhìn thấy bối cảnh này. Nó được lưu riêng trong cuộc trò chuyện và không sửa nội dung gốc của nhân vật." : "Only you can see this scenario. It is stored with your conversation and does not change the public character."}</span>
              </div>
              <label><span>{vi ? "Tên bối cảnh" : "Scenario title"}</span><input maxLength={120} value={customScenario.title} onChange={(e) => setCustomScenario({ ...customScenario, title: e.target.value })} placeholder={vi ? "Ví dụ: Cuộc gặp trên chuyến tàu đêm" : "Example: A meeting on the night train"} /></label>
              <label><span>{vi ? "Tình huống mở đầu" : "Opening situation"}</span><textarea maxLength={4000} value={customScenario.description} onChange={(e) => setCustomScenario({ ...customScenario, description: e.target.value })} /></label>
              <div className="custom-scenario-grid"><label><span>{vi ? "Địa điểm" : "Location"}</span><input maxLength={500} value={customScenario.location} onChange={(e) => setCustomScenario({ ...customScenario, location: e.target.value })} /></label><label><span>{vi ? "Thời gian" : "Time"}</span><input maxLength={500} value={customScenario.time} onChange={(e) => setCustomScenario({ ...customScenario, time: e.target.value })} /></label></div>
              <label><span>{vi ? "Vai trò của bạn" : "Your role"}</span><input maxLength={1000} value={customScenario.userRole} onChange={(e) => setCustomScenario({ ...customScenario, userRole: e.target.value })} /></label>
              <label><span>{vi ? "Quan hệ với nhân vật" : "Relationship"}</span><input maxLength={1000} value={customScenario.relationship} onChange={(e) => setCustomScenario({ ...customScenario, relationship: e.target.value })} /></label>
              <label><span>{vi ? "Mục tiêu/mạch truyện ban đầu" : "Initial story goal"}</span><textarea maxLength={2000} value={customScenario.goal} onChange={(e) => setCustomScenario({ ...customScenario, goal: e.target.value })} /></label>
              <label><span>{vi ? "Lời mở đầu của nhân vật" : "Character opening message"}</span><textarea className="custom-opening-message" maxLength={6000} value={customScenario.openingMessage} onChange={(e) => setCustomScenario({ ...customScenario, openingMessage: e.target.value })} /></label>
            </div>
          )}

          {/* User Address Preferences */}
          <label>
            <span>{vi ? "Tên nhân vật sẽ gọi bạn:" : "Name the character calls you:"}</span>
            <input
              value={preferredName}
              onChange={(event) => setPreferredName(event.target.value)}
              maxLength={80}
              placeholder={vi ? "Ví dụ: Minh" : "Example: Alex"}
            />
          </label>

          <label>
            <span>{vi ? "Cách xưng hô riêng:" : "Preferred form of address:"}</span>
            <textarea
              value={preferredAddress}
              onChange={(event) => setPreferredAddress(event.target.value)}
              maxLength={200}
              placeholder={
                vi
                  ? "Ví dụ: nhân vật xưng chị và gọi tôi là em"
                  : "Example: call me captain"
              }
            />
          </label>

          {notice && <p className="settings-notice">{notice}</p>}

          {activeConvId ? (
            <button
              className="primary-button settings-action"
              disabled={busy}
              onClick={savePreferences}
            >
              <Save />
              {busy ? "…" : vi ? "Lưu thiết lập xưng hô" : "Save settings"}
            </button>
          ) : (
            <button
              className="primary-button settings-action"
              disabled={busy || !selectedScenario}
              onClick={startConversation}
            >
              <MessageCircle />
              {busy ? "…" : vi ? "Bắt đầu trò chuyện" : "Start chatting"}
            </button>
          )}

          {/* Past Conversation Sessions with this character */}
          {pastConversations.length > 0 && (
            <div className="past-sessions-section">
              <div className="past-sessions-header">
                <History />
                <span>{vi ? "Lịch sử cuộc trò chuyện" : "Past sessions"}</span>
              </div>
              <div className="past-sessions-list">
                {pastConversations.map((conv) => {
                  const isCurrent = conv.id === activeConvId;
                  return (
                    <div
                      key={conv.id}
                      className={`past-session-item ${isCurrent ? "active" : ""}`}
                      onClick={() => switchToConversation(conv.id)}
                    >
                      <div className="past-session-info">
                        <strong>{conv.title || "Cuộc trò chuyện"}</strong>
                        <small>
                          <Clock /> {new Date(conv.updatedAt).toLocaleDateString()} • {conv.messageCount} {vi ? "tin nhắn" : "msgs"}
                        </small>
                      </div>
                      <button
                        className="delete-conv-btn"
                        title={vi ? "Xóa cuộc trò chuyện này" : "Delete session"}
                        onClick={(e) => deleteConversation(conv.id, e)}
                      >
                        <Trash2 />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}
