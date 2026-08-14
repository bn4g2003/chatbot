"use client";
import { useState } from "react";
import { RemoteImage } from "./remote-image";
const fields = [
  ["shortDescription", "Mô tả ngắn"],
  ["description", "Mô tả đầy đủ"],
  ["biography", "Tiểu sử"],
  ["canon", "Dữ kiện canon"],
  ["personality", "Tính cách"],
  ["motivations", "Động cơ"],
  ["fears", "Nỗi sợ"],
  ["likes", "Sở thích"],
  ["weaknesses", "Điểm yếu"],
  ["relationships", "Các mối quan hệ"],
  ["speechStyle", "Giọng điệu và cách nói"],
  ["vocabulary", "Từ vựng đặc trưng"],
  ["addressStyle", "Cách xưng hô"],
  ["expressionHabits", "Thói quen biểu cảm"],
  ["knowledge", "Điều nhân vật biết"],
  ["unknowns", "Điều không biết"],
  ["boundaries", "Giới hạn nhập vai"],
  ["exampleDialogue", "Ví dụ hội thoại"],
] as const;
export function CreatorForm({ locale }: { locale: string }) {
  const [cover, setCover] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(data: FormData) {
    setBusy(true);
    const get = (key: string) => String(data.get(key) ?? "");
    const body = {
      locale,
      name: get("name"),
      coverUrl: get("coverUrl"),
      avatarUrl: get("avatarUrl"),
      galleryUrls: get("galleryUrls").split("\n").map((url) => url.trim()).filter(Boolean),
      rating: get("rating"),
      ...Object.fromEntries(fields.map(([key]) => [key, get(key)])),
      scenario: {
        title: get("scenarioTitle"),
        description: get("scenarioDescription"),
        location: get("location"),
        time: get("time"),
        userRole: get("userRole"),
        relationship: get("relationship"),
        goal: get("goal"),
        openingMessage: get("openingMessage"),
      },
    };
    const response = await fetch("/api/creator/characters", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const result = await response.json();
    setBusy(false);
    setMessage(
      response.ok
        ? locale === "vi"
          ? "Đã lưu bản nháp."
          : "Draft saved."
        : result.error,
    );
  }
  return (
    <form action={submit} className="creator-form">
      <section>
        <p className="eyebrow">Identity</p>
        <h2>{locale === "vi" ? "Nhân vật là ai?" : "Who is the character?"}</h2>
        <div className="form-grid">
          <label>
            {locale === "vi" ? "Tên nhân vật" : "Name"}
            <input name="name" required minLength={2} />
          </label>
          <label>
            Content rating
            <select name="rating">
              <option value="general">General</option>
              <option value="sensitive">Sensitive</option>
              <option value="adult">Adult</option>
            </select>
          </label>
        </div>
        <label>
          Gallery URLs (HTTPS, one per line)
          <textarea name="galleryUrls" placeholder="https://…&#10;https://…" />
        </label>
        <div className="form-grid">
          <label>
            Cover URL (HTTPS)
            <input
              name="coverUrl"
              type="url"
              pattern="https://.*"
              required
              onChange={(e) => setCover(e.target.value)}
            />
          </label>
          <label>
            Avatar URL (HTTPS)
            <input name="avatarUrl" type="url" pattern="https://.*" required />
          </label>
        </div>
        {cover && (
          <RemoteImage
            src={cover}
            alt="Cover preview"
            className="image-preview"
          />
        )}
        {fields.slice(0, 3).map(([key, label]) => (
          <label key={key}>
            {label}
            <textarea name={key} required />
          </label>
        ))}
      </section>
      <section>
        <p className="eyebrow">Persona</p>
        <h2>
          {locale === "vi" ? "Tính cách và giọng nói" : "Personality and voice"}
        </h2>
        {fields.slice(3).map(([key, label]) => (
          <label key={key}>
            {label}
            <textarea name={key} required />
          </label>
        ))}
      </section>
      <section>
        <p className="eyebrow">Scenario</p>
        <h2>{locale === "vi" ? "Bối cảnh mở đầu" : "Opening scenario"}</h2>
        {[
          ["scenarioTitle", "Tên bối cảnh"],
          ["scenarioDescription", "Tình huống"],
          ["location", "Địa điểm"],
          ["time", "Thời gian"],
          ["userRole", "Vai trò người dùng"],
          ["relationship", "Quan hệ ban đầu"],
          ["goal", "Mục tiêu cảnh"],
          ["openingMessage", "Lời mở đầu"],
        ].map(([key, label]) => (
          <label key={key}>
            {label}
            <textarea name={key} required />
          </label>
        ))}
      </section>
      <div className="form-actions">
        {message && <p>{message}</p>}
        <button className="primary-button" disabled={busy}>
          {busy ? "…" : locale === "vi" ? "Lưu bản nháp" : "Save draft"}
        </button>
      </div>
    </form>
  );
}
