"use client";
/* eslint-disable @typescript-eslint/no-explicit-any -- API editor state mirrors nested Drizzle payloads. */

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Image as ImageIcon, Save, ShieldCheck } from "lucide-react";
import { RemoteImage } from "./remote-image";

type CharacterData = Record<string, any>;
const personaFields = ["canon", "personality", "motivations", "fears", "likes", "weaknesses", "relationships", "speechStyle", "vocabulary", "addressStyle", "expressionHabits", "knowledge", "unknowns", "boundaries", "exampleDialogue"];

export function AdminCharacterEditor({ locale, characterId }: { locale: string; characterId: string }) {
  const [data, setData] = useState<CharacterData | null>(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    void fetch(`/api/admin/characters/${characterId}`).then(async (response) => {
      if (!active) return;
      if (response.ok) setData((await response.json()).character);
      else setNotice(locale === "vi" ? "Không thể tải nhân vật." : "Could not load character.");
    });
    return () => { active = false; };
  }, [characterId, locale]);
  function update(path: string, value: unknown) {
    setData((current) => {
      if (!current) return current;
      const clone = structuredClone(current);
      const keys = path.split("."); let target = clone;
      for (let i = 0; i < keys.length - 1; i++) target = target[keys[i]];
      target[keys.at(-1)!] = value; return clone;
    });
  }
  async function save() {
    if (!data) return;
    setSaving(true); setNotice("");
    const translation = data.translations.find((item: any) => item.locale === data.originalLocale) || data.translations[0];
    const response = await fetch(`/api/admin/characters/${characterId}`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({
      slug: data.slug, originalLocale: data.originalLocale, status: data.status, rating: data.rating, featured: data.featured,
      translation, persona: Object.fromEntries(personaFields.map((field) => [field, data.persona?.[field] || ""])),
      images: data.images.map((image: any) => ({ url: image.url, type: image.type, altText: image.altText || "" })),
      scenarios: data.scenarios.map((scenario: any) => ({
        id: scenario.id, active: scenario.active,
        translation: scenario.translations.find((item: any) => item.locale === data.originalLocale) || scenario.translations[0],
      })),
    }) });
    const result = await response.json();
    setNotice(response.ok ? (locale === "vi" ? "Đã lưu và ghi vào lịch sử kiểm duyệt." : "Saved and added to moderation history.") : result.error);
    setSaving(false);
  }
  if (!data) return <main className="admin-editor-page"><p>{notice || (locale === "vi" ? "Đang tải..." : "Loading...")}</p></main>;
  const translationIndex = Math.max(0, data.translations.findIndex((item: any) => item.locale === data.originalLocale));
  const translation = data.translations[translationIndex];
  return <main className="admin-editor-page">
    <header className="admin-editor-header">
      <div><Link href={`/${locale}/admin`}><ArrowLeft /> {locale === "vi" ? "Quay lại quản trị" : "Back to admin"}</Link><p>CONTENT OPERATIONS / CHARACTER</p><h1>{translation?.name || data.slug}</h1></div>
      <button className="primary-button" disabled={saving} onClick={save}><Save /> {saving ? "Saving..." : locale === "vi" ? "Lưu thay đổi" : "Save changes"}</button>
    </header>
    {notice && <div className="admin-editor-notice">{notice}</div>}
    <div className="admin-editor-layout">
      <aside className="admin-editor-summary">
        <RemoteImage src={data.images.find((i: any) => i.type === "cover")?.url || data.images[0]?.url} alt={translation?.name || data.slug} />
        <strong>{translation?.name}</strong><span>/{data.slug}</span>
        <div><ShieldCheck /> {locale === "vi" ? "Chỉnh sửa bởi quản trị viên" : "Administrator edit"}</div>
        <p>{locale === "vi" ? `${data.scenarios.length} bối cảnh được giữ nguyên. Persona sẽ tăng phiên bản sau khi lưu.` : `${data.scenarios.length} scenarios preserved. Persona version increments on save.`}</p>
      </aside>
      <div className="admin-editor-content">
        <section className="admin-card"><div className="card-top"><div><p className="eyebrow">Publishing</p><h3>{locale === "vi" ? "Thông tin xuất bản" : "Publishing details"}</h3></div></div>
          <div className="form-grid"><label>Slug<input value={data.slug} onChange={(e) => update("slug", e.target.value)} /></label><label>Locale<select value={data.originalLocale} onChange={(e) => update("originalLocale", e.target.value)}><option value="vi">Vietnamese</option><option value="en">English</option></select></label><label>Status<select value={data.status} onChange={(e) => update("status", e.target.value)}>{["draft","pending_review","published","rejected","archived"].map(x=><option key={x}>{x}</option>)}</select></label><label>Rating<select value={data.rating} onChange={(e) => update("rating", e.target.value)}>{["general","sensitive","adult"].map(x=><option key={x}>{x}</option>)}</select></label></div>
          <label className="checkbox-label"><input type="checkbox" checked={data.featured} onChange={(e) => update("featured", e.target.checked)} /> Featured</label>
        </section>
        <section className="admin-card"><div className="card-top"><div><p className="eyebrow">Editorial</p><h3>{locale === "vi" ? "Nội dung hiển thị" : "Display content"}</h3></div></div>
          <div className="form-grid"><label>Name<input value={translation.name} onChange={(e) => update(`translations.${translationIndex}.name`, e.target.value)} /></label><label>Short description<input value={translation.shortDescription} onChange={(e) => update(`translations.${translationIndex}.shortDescription`, e.target.value)} /></label></div>
          <label>Description<textarea value={translation.description} onChange={(e) => update(`translations.${translationIndex}.description`, e.target.value)} /></label><label>Biography<textarea value={translation.biography} onChange={(e) => update(`translations.${translationIndex}.biography`, e.target.value)} /></label>
        </section>
        <section className="admin-card"><div className="card-top"><div><p className="eyebrow">Roleplay engine</p><h3>Persona & canon</h3></div></div><div className="admin-persona-grid">{personaFields.map((field) => <label key={field}>{field.replace(/[A-Z]/g, (m) => ` ${m.toLowerCase()}`)}<textarea value={data.persona?.[field] || ""} onChange={(e) => update(`persona.${field}`, e.target.value)} /></label>)}</div></section>
        <section className="admin-card"><div className="card-top"><div><p className="eyebrow">Story entry points</p><h3>{locale === "vi" ? "Bối cảnh câu chuyện" : "Story scenarios"}</h3><small>{locale === "vi" ? "Mỗi nhân vật cần ít nhất một bối cảnh. Bối cảnh đã dùng trong chat chỉ được vô hiệu hóa, không bị xóa khỏi lịch sử." : "Every character needs at least one scenario. Used scenarios are deactivated, never removed from chat history."}</small></div><button className="secondary-button" onClick={() => setData({ ...data, scenarios: [...data.scenarios, { active: true, translations: [{ locale: data.originalLocale, title: "", description: "", location: "", time: "", userRole: "", relationship: "", goal: "", openingMessage: "" }] }] })}>+ {locale === "vi" ? "Thêm bối cảnh" : "Add scenario"}</button></div>
          <div className="admin-scenario-list">{data.scenarios.map((scenario: any, scenarioIndex: number) => {
            const scenarioTranslationIndex = Math.max(0, scenario.translations.findIndex((item: any) => item.locale === data.originalLocale));
            const item = scenario.translations[scenarioTranslationIndex];
            const base = `scenarios.${scenarioIndex}`; const trans = `${base}.translations.${scenarioTranslationIndex}`;
            return <article className="admin-scenario-editor" key={scenario.id || scenarioIndex}>
              <div className="scenario-editor-head"><span>{String(scenarioIndex + 1).padStart(2, "0")}</span><input value={item.title} placeholder={locale === "vi" ? "Tên bối cảnh" : "Scenario title"} onChange={(e) => update(`${trans}.title`, e.target.value)} /><label className="checkbox-label"><input type="checkbox" checked={scenario.active} onChange={(e) => update(`${base}.active`, e.target.checked)} /> Active</label><button disabled={data.scenarios.length === 1} onClick={() => setData({ ...data, scenarios: data.scenarios.filter((_: any, index: number) => index !== scenarioIndex) })}>×</button></div>
              <label>Description<textarea value={item.description} onChange={(e) => update(`${trans}.description`, e.target.value)} /></label>
              <div className="form-grid"><label>Location<input value={item.location} onChange={(e) => update(`${trans}.location`, e.target.value)} /></label><label>Time<input value={item.time} onChange={(e) => update(`${trans}.time`, e.target.value)} /></label><label>User role<input value={item.userRole} onChange={(e) => update(`${trans}.userRole`, e.target.value)} /></label><label>Relationship<input value={item.relationship} onChange={(e) => update(`${trans}.relationship`, e.target.value)} /></label></div>
              <label>Story goal<textarea value={item.goal} onChange={(e) => update(`${trans}.goal`, e.target.value)} /></label><label>Opening message<textarea className="opening-message-field" value={item.openingMessage} onChange={(e) => update(`${trans}.openingMessage`, e.target.value)} /></label>
            </article>;
          })}</div>
        </section>
        <section className="admin-card"><div className="card-top"><div><p className="eyebrow">URL assets</p><h3>{locale === "vi" ? "Hình ảnh nhân vật" : "Character images"}</h3></div><ImageIcon /></div>{data.images.map((image: any, index: number) => <div className="admin-image-row" key={image.id || index}><select value={image.type} onChange={(e) => update(`images.${index}.type`, e.target.value)}><option value="avatar">avatar</option><option value="cover">cover</option><option value="gallery">gallery</option></select><input value={image.url} onChange={(e) => update(`images.${index}.url`, e.target.value)} /><button onClick={() => setData({ ...data, images: data.images.filter((_: any, i: number) => i !== index) })}>×</button></div>)}<button className="secondary-button" onClick={() => setData({ ...data, images: [...data.images, { type: "gallery", url: "", altText: "" }] })}>+ URL</button></section>
      </div>
    </div>
  </main>;
}
