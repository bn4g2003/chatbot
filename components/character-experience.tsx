"use client";

import {
  ArrowLeft,
  Clock,
  History,
  MessageCircle,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Save,
  Settings2,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { ChatRoom } from "./chat-room";
import { RemoteImage } from "./remote-image";
import styles from "./character-chat-workspace.module.css";

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
  characterAvatar,
  characterCover,
  scenarios,
  locale,
  conversationId,
  initialScenarioId,
}: {
  characterId: string;
  characterSlug: string;
  characterName: string;
  characterAvatar?: string | null;
  characterCover?: string | null;
  scenarios: Scenario[];
  locale: string;
  conversationId?: string;
  initialScenarioId?: string;
}) {
  const startingConversationRef = useRef(false);
  const { data, isPending } = useSession();
  const router = useRouter();
  const vi = locale === "vi";

  const [activeConvId, setActiveConvId] = useState<string | undefined>(conversationId);
  const [pastConversations, setPastConversations] = useState<PastConversation[]>([]);
  const [selectedScenario, setSelectedScenario] = useState(
    initialScenarioId ?? scenarios[0]?.id ?? "",
  );
  const [customScenario, setCustomScenario] = useState(emptyCustomScenario);
  const [preferredName, setPreferredName] = useState("");
  const [preferredAddress, setPreferredAddress] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [isStartingNew, setIsStartingNew] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarView, setSidebarView] = useState<"settings" | "history">("settings");

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setSidebarOpen(window.matchMedia("(min-width: 921px)").matches);
    }, 0);
    return () => window.clearTimeout(timeout);
  }, []);

  // Sync activeConvId when prop changes
  useEffect(() => {
    const timeout = window.setTimeout(() => setActiveConvId(conversationId), 0);
    return () => window.clearTimeout(timeout);
  }, [conversationId]);

  const loadUserConversations = useCallback(async () => {
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
          router.replace(`/${locale}/characters/${characterSlug}/chat?chat=${latest.id}`);
        }
      }
    } catch (e) {
      console.error(e);
    }
  }, [characterId, characterSlug, conversationId, isStartingNew, locale, router]);

  // Load user's conversations with this character
  useEffect(() => {
    if (!data?.user) return;
    const timeout = window.setTimeout(() => {
      void loadUserConversations();
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [data?.user, loadUserConversations]);

  // Load active conversation preferences
  useEffect(() => {
    if (!activeConvId) return;
    const controller = new AbortController();
    async function loadPreferences() {
      try {
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
      } catch (error: unknown) {
        if (!(error instanceof Error && error.name === "AbortError")) {
          console.error("Failed to load preferences:", error);
        }
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
    if (
      startingConversationRef.current ||
      !requireLogin() ||
      !selectedScenario ||
      (selectedScenario === "custom" && !scenarios[0]?.id)
    )
      return;
    startingConversationRef.current = true;
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
      if (response.ok) {
        setIsStartingNew(false);
        setActiveConvId(body.id);
        router.push(`/${locale}/characters/${characterSlug}/chat?chat=${body.id}`);
        loadUserConversations();
      } else {
        setNotice(body.error ?? "Error creating conversation");
      }
    } catch (e: unknown) {
      setNotice(e instanceof Error ? e.message : "Error creating conversation");
    } finally {
      startingConversationRef.current = false;
      setBusy(false);
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
          router.replace(`/${locale}/characters/${characterSlug}/chat`);
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
    router.push(`/${locale}/characters/${characterSlug}/chat?chat=${id}`);
  }

  function handleStartNewClick() {
    setIsStartingNew(true);
    setActiveConvId(undefined);
    setPreferredName("");
    setPreferredAddress("");
    setCustomScenario(emptyCustomScenario);
    router.replace(`/${locale}/characters/${characterSlug}/chat`);
  }

  const activeScenario = scenarios.find(
    (scenario) => scenario.id === selectedScenario,
  );
  const sceneTitle =
    selectedScenario === "custom"
      ? customScenario.title || (vi ? "Bối cảnh riêng" : "Private scenario")
      : activeScenario?.translation?.title ||
        (vi ? "Cuộc trò chuyện mới" : "New conversation");
  const sceneVisual = (
    <div className={styles.sceneVisual}>
      <RemoteImage
        src={characterCover}
        alt={vi ? `Khung cảnh cùng ${characterName}` : `Scene with ${characterName}`}
      />
      <div className={styles.sceneGradient} />
    </div>
  );

  return (
    <section
      className={`${styles.workspace} ${sidebarOpen ? styles.sidebarOpen : styles.sidebarClosed}`}
    >
      <header className={styles.topbar}>
        <div className={styles.characterIdentity}>
          <Link
            href={`/${locale}/characters/${characterSlug}`}
            className={styles.backButton}
            aria-label={vi ? "Quay lại trang nhân vật" : "Back to character"}
          >
            <ArrowLeft />
          </Link>
          <div className={styles.avatar}>
            <RemoteImage src={characterAvatar} alt={characterName} />
          </div>
          <div className={styles.identityCopy}>
            <strong>{characterName}</strong>
            <span>{sceneTitle}</span>
          </div>
        </div>

        <div className={styles.topbarActions}>
          {activeConvId && (
            <button type="button" onClick={handleStartNewClick}>
              <Plus />
              <span>{vi ? "Cuộc trò chuyện mới" : "New chat"}</span>
            </button>
          )}
          <button
            type="button"
            className={sidebarView === "history" && sidebarOpen ? styles.activeAction : ""}
            onClick={() => {
              setSidebarView("history");
              setSidebarOpen(true);
            }}
          >
            <History />
            <span>{vi ? "Lịch sử" : "History"}</span>
          </button>
          <button
            type="button"
            className={sidebarView === "settings" && sidebarOpen ? styles.activeAction : ""}
            onClick={() => {
              setSidebarView("settings");
              setSidebarOpen(true);
            }}
          >
            <Settings2 />
            <span>{vi ? "Thiết lập" : "Settings"}</span>
          </button>
          <button
            type="button"
            className={styles.sidebarToggle}
            onClick={() => setSidebarOpen((open) => !open)}
            aria-expanded={sidebarOpen}
            aria-controls="character-chat-sidebar"
            aria-label={vi ? "Ẩn hoặc hiện bảng công cụ" : "Toggle tools panel"}
          >
            {sidebarOpen ? <PanelLeftClose /> : <PanelLeftOpen />}
          </button>
        </div>
      </header>

      <div className={styles.workspaceBody}>
        {sidebarOpen && (
          <button
            type="button"
            className={styles.mobileBackdrop}
            aria-label={vi ? "Đóng bảng công cụ" : "Close tools panel"}
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <aside id="character-chat-sidebar" className={styles.sidebar}>
          <div className={styles.sidebarTabs} role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={sidebarView === "settings"}
              className={sidebarView === "settings" ? styles.activeTab : ""}
              onClick={() => setSidebarView("settings")}
            >
              <Settings2 /> {vi ? "Câu chuyện" : "Story"}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={sidebarView === "history"}
              className={sidebarView === "history" ? styles.activeTab : ""}
              onClick={() => setSidebarView("history")}
            >
              <History /> {vi ? "Lịch sử" : "History"}
            </button>
          </div>

          <div className={styles.sidebarScroll}>
            {sidebarView === "settings" ? (
              <div className={styles.settingsPanel}>
                <div className={styles.panelHeading}>
                  <span><Sparkles /> {vi ? "Thiết lập nhập vai" : "Roleplay setup"}</span>
                  <h2>{vi ? "Câu chuyện của bạn" : "Your story"}</h2>
                  <p>
                    {activeConvId
                      ? vi
                        ? "Bạn vẫn có thể đổi cách nhân vật gọi mình."
                        : "You can still change how the character addresses you."
                      : vi
                        ? "Chọn bối cảnh trước khi bắt đầu."
                        : "Choose a scenario before you begin."}
                  </p>
                </div>

                <label>
                  <span>{vi ? "Bối cảnh mở đầu" : "Opening scenario"}</span>
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
                    <option value="custom">
                      {vi ? "Tự tạo bối cảnh riêng…" : "Create a private scenario…"}
                    </option>
                  </select>
                </label>

                {selectedScenario && selectedScenario !== "custom" && (
                  <p className={styles.scenarioDescription}>
                    {activeScenario?.translation?.description}
                  </p>
                )}

                {selectedScenario === "custom" && (
                  <div className={styles.customScenario}>
                    <p className={styles.privateNote}>
                      <Sparkles />
                      <span>
                        {vi
                          ? "Bối cảnh này chỉ xuất hiện trong cuộc trò chuyện của bạn."
                          : "This scenario stays private to your conversation."}
                      </span>
                    </p>
                    <label>
                      <span>{vi ? "Tên bối cảnh" : "Scenario title"}</span>
                      <input
                        maxLength={120}
                        value={customScenario.title}
                        onChange={(event) => setCustomScenario({ ...customScenario, title: event.target.value })}
                        placeholder={vi ? "Cuộc gặp trên chuyến tàu đêm" : "A meeting on the night train"}
                      />
                    </label>
                    <label>
                      <span>{vi ? "Tình huống mở đầu" : "Opening situation"}</span>
                      <textarea
                        maxLength={4000}
                        value={customScenario.description}
                        onChange={(event) => setCustomScenario({ ...customScenario, description: event.target.value })}
                      />
                    </label>
                    <div className={styles.fieldGrid}>
                      <label>
                        <span>{vi ? "Địa điểm" : "Location"}</span>
                        <input maxLength={500} value={customScenario.location} onChange={(event) => setCustomScenario({ ...customScenario, location: event.target.value })} />
                      </label>
                      <label>
                        <span>{vi ? "Thời gian" : "Time"}</span>
                        <input maxLength={500} value={customScenario.time} onChange={(event) => setCustomScenario({ ...customScenario, time: event.target.value })} />
                      </label>
                    </div>
                    <label>
                      <span>{vi ? "Vai trò của bạn" : "Your role"}</span>
                      <input maxLength={1000} value={customScenario.userRole} onChange={(event) => setCustomScenario({ ...customScenario, userRole: event.target.value })} />
                    </label>
                    <label>
                      <span>{vi ? "Quan hệ với nhân vật" : "Relationship"}</span>
                      <input maxLength={1000} value={customScenario.relationship} onChange={(event) => setCustomScenario({ ...customScenario, relationship: event.target.value })} />
                    </label>
                    <label>
                      <span>{vi ? "Mục tiêu ban đầu" : "Initial story goal"}</span>
                      <textarea maxLength={2000} value={customScenario.goal} onChange={(event) => setCustomScenario({ ...customScenario, goal: event.target.value })} />
                    </label>
                    <label>
                      <span>{vi ? "Lời mở đầu của nhân vật" : "Character opening message"}</span>
                      <textarea maxLength={6000} value={customScenario.openingMessage} onChange={(event) => setCustomScenario({ ...customScenario, openingMessage: event.target.value })} />
                    </label>
                  </div>
                )}

                <div className={styles.divider} />

                <label>
                  <span>{vi ? "Tên nhân vật sẽ gọi bạn" : "Name the character calls you"}</span>
                  <input
                    value={preferredName}
                    onChange={(event) => setPreferredName(event.target.value)}
                    maxLength={80}
                    placeholder={vi ? "Ví dụ: Minh" : "Example: Alex"}
                  />
                </label>
                <label>
                  <span>{vi ? "Cách xưng hô riêng" : "Preferred form of address"}</span>
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

                {notice && <p className={styles.notice}>{notice}</p>}
                <button
                  type="button"
                  className={styles.primaryAction}
                  disabled={busy || (!activeConvId && !selectedScenario)}
                  onClick={activeConvId ? savePreferences : startConversation}
                >
                  {activeConvId ? <Save /> : <MessageCircle />}
                  {busy
                    ? "…"
                    : activeConvId
                      ? vi ? "Lưu cách xưng hô" : "Save preferences"
                      : vi ? "Bắt đầu trò chuyện" : "Start chatting"}
                </button>
              </div>
            ) : (
              <div className={styles.historyPanel}>
                <div className={styles.panelHeading}>
                  <span><History /> {vi ? "Hội thoại đã lưu" : "Saved chats"}</span>
                  <h2>{vi ? "Tiếp tục câu chuyện" : "Continue a story"}</h2>
                  <p>
                    {vi
                      ? "Mọi cuộc trò chuyện với nhân vật này đều nằm ở đây."
                      : "Every conversation with this character lives here."}
                  </p>
                </div>

                <button type="button" className={styles.newConversation} onClick={handleStartNewClick}>
                  <Plus /> {vi ? "Bắt đầu cuộc trò chuyện mới" : "Start a new conversation"}
                </button>

                <div className={styles.sessionList}>
                  {pastConversations.length === 0 ? (
                    <p className={styles.emptyHistory}>
                      {vi ? "Chưa có cuộc trò chuyện nào." : "No conversations yet."}
                    </p>
                  ) : (
                    pastConversations.map((conversation) => (
                      <div
                        key={conversation.id}
                        className={`${styles.sessionItem} ${conversation.id === activeConvId ? styles.activeSession : ""}`}
                      >
                        <button type="button" onClick={() => switchToConversation(conversation.id)}>
                          <strong>{conversation.title || (vi ? "Cuộc trò chuyện" : "Conversation")}</strong>
                          <small>
                            <Clock />
                            {new Date(conversation.updatedAt).toLocaleDateString(locale)}
                            <span>·</span>
                            {conversation.messageCount} {vi ? "tin nhắn" : "messages"}
                          </small>
                        </button>
                        <button
                          type="button"
                          className={styles.deleteButton}
                          aria-label={vi ? "Xóa cuộc trò chuyện" : "Delete conversation"}
                          onClick={(event) => deleteConversation(conversation.id, event)}
                        >
                          <Trash2 />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </aside>

        <div className={`${styles.stage} ${activeConvId ? styles.activeStage : ""}`}>
          {!activeConvId && sceneVisual}

          <div className={styles.chatArea}>
            {activeConvId ? (
              <ChatRoom
                conversationId={activeConvId}
                locale={locale}
                characterName={characterName}
                immersive
                conversationIntro={sceneVisual}
              />
            ) : (
              <div className={styles.startState}>
                <MessageCircle />
                <div>
                  <strong>{vi ? "Sẵn sàng bước vào câu chuyện?" : "Ready to enter the story?"}</strong>
                  <span>
                    {vi
                      ? "Kiểm tra bối cảnh và cách xưng hô, rồi bắt đầu."
                      : "Check the scenario and how you want to be addressed, then begin."}
                  </span>
                </div>
                <button type="button" disabled={busy || !selectedScenario} onClick={startConversation}>
                  <MessageCircle /> {busy ? "…" : vi ? "Bắt đầu" : "Begin"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
