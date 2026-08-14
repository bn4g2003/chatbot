"use client";

import { MessageCircle, Save, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { ChatRoom } from "./chat-room";

type Scenario = {
  id: string;
  translation?: { title: string; description: string; openingMessage: string };
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
  const [selected, setSelected] = useState(scenarios[0]?.id ?? "");
  const [preferredName, setPreferredName] = useState("");
  const [preferredAddress, setPreferredAddress] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!conversationId) return;
    const controller = new AbortController();
    async function loadPreferences() {
      const response = await fetch(`/api/conversations/${conversationId}`, {
        signal: controller.signal,
      });
      if (!response.ok) return;
      const data = await response.json();
      setSelected(data.conversation.scenarioId);
      setPreferredName(data.conversation.userPreferredName ?? "");
      setPreferredAddress(data.conversation.preferredAddress ?? "");
    }
    void loadPreferences();
    return () => controller.abort();
  }, [conversationId]);

  function requireLogin() {
    if (!data && !isPending) {
      router.push(`/${locale}/auth?reason=chat`);
      return false;
    }
    return true;
  }

  async function startConversation() {
    if (!requireLogin() || !selected) return;
    setBusy(true);
    setNotice("");
    const response = await fetch("/api/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        characterId,
        scenarioId: selected,
        locale,
        userPreferredName: preferredName || undefined,
        preferredAddress: preferredAddress || undefined,
      }),
    });
    const body = await response.json();
    setBusy(false);
    if (response.ok)
      router.push(`/${locale}/characters/${characterSlug}?chat=${body.id}`);
    else setNotice(body.error ?? "Error");
  }

  async function savePreferences() {
    if (!conversationId || !requireLogin()) return;
    setBusy(true);
    setNotice("");
    const response = await fetch(`/api/conversations/${conversationId}`, {
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
            ? "Thiết lập câu chuyện ở bên phải rồi bắt đầu trò chuyện ngay tại đây."
            : "Set up the story on the right, then chat here."}
        </p>
      </div>
      <div className="experience-grid">
        <div className="experience-chat">
          {conversationId ? (
            <ChatRoom conversationId={conversationId} locale={locale} />
          ) : (
            <div className="chat-empty">
              <MessageCircle />
              <h3>
                {vi
                  ? "Cuộc trò chuyện chưa bắt đầu"
                  : "The conversation has not started"}
              </h3>
              <p>
                {vi
                  ? "Chọn bối cảnh và cách xưng hô. Lời mở đầu của nhân vật sẽ xuất hiện tại đây."
                  : "Choose a scenario and form of address. The opening message will appear here."}
              </p>
            </div>
          )}
        </div>
        <aside className="experience-settings">
          <p className="eyebrow">
            {vi ? "Thiết lập cá nhân" : "Personal setup"}
          </p>
          <h3>{vi ? "Câu chuyện của bạn" : "Your story"}</h3>
          <label>
            {vi ? "Bối cảnh mở đầu" : "Opening scenario"}
            <select
              value={selected}
              onChange={(event) => setSelected(event.target.value)}
              disabled={Boolean(conversationId)}
            >
              {scenarios.map((scenario) => (
                <option key={scenario.id} value={scenario.id}>
                  {scenario.translation?.title}
                </option>
              ))}
            </select>
          </label>
          {selected && (
            <p className="scenario-description">
              {
                scenarios.find((scenario) => scenario.id === selected)
                  ?.translation?.description
              }
            </p>
          )}
          <label>
            {vi ? "Tên nhân vật sẽ gọi bạn" : "Name the character calls you"}
            <input
              value={preferredName}
              onChange={(event) => setPreferredName(event.target.value)}
              maxLength={80}
              placeholder={vi ? "Ví dụ: Minh" : "Example: Alex"}
            />
          </label>
          <label>
            {vi ? "Cách xưng hô riêng" : "Preferred form of address"}
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
          {conversationId ? (
            <button
              className="primary-button settings-action"
              disabled={busy}
              onClick={savePreferences}
            >
              <Save />
              {busy ? "…" : vi ? "Lưu thiết lập" : "Save settings"}
            </button>
          ) : (
            <button
              className="primary-button settings-action"
              disabled={busy || !selected}
              onClick={startConversation}
            >
              <MessageCircle />
              {busy ? "…" : vi ? "Bắt đầu trò chuyện" : "Start chatting"}
            </button>
          )}
        </aside>
      </div>
    </section>
  );
}
