"use client";

import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  ImageIcon,
  MessageSquareText,
  Save,
  Sparkles,
  UserRound,
} from "lucide-react";
import { useState } from "react";
import { RemoteImage } from "./remote-image";

const personaFields = [
  [
    "canon",
    "Dữ kiện canon",
    "Những sự thật không được phép thay đổi về nhân vật và thế giới.",
  ],
  [
    "personality",
    "Tính cách cốt lõi",
    "Cách nhân vật suy nghĩ, phản ứng và đưa ra quyết định.",
  ],
  ["motivations", "Động cơ", "Điều nhân vật muốn đạt được hoặc bảo vệ."],
  [
    "fears",
    "Nỗi sợ",
    "Điều khiến nhân vật bất an, né tránh hoặc mất bình tĩnh.",
  ],
  [
    "likes",
    "Sở thích",
    "Con người, hoạt động và những điều nhân vật yêu thích.",
  ],
  [
    "weaknesses",
    "Điểm yếu",
    "Khuyết điểm giúp nhân vật chân thực, không hoàn hảo.",
  ],
  [
    "relationships",
    "Các mối quan hệ",
    "Quan hệ quan trọng và thái độ ban đầu với người dùng.",
  ],
] as const;
const voiceFields = [
  [
    "speechStyle",
    "Giọng điệu và nhịp nói",
    "Ví dụ: điềm tĩnh, câu ngắn, thỉnh thoảng châm biếm nhẹ.",
  ],
  [
    "vocabulary",
    "Từ vựng đặc trưng",
    "Các từ thường dùng hoặc cách diễn đạt riêng.",
  ],
  [
    "addressStyle",
    "Cách xưng hô mặc định",
    "Nhân vật xưng gì và gọi người dùng như thế nào.",
  ],
  [
    "expressionHabits",
    "Thói quen biểu cảm",
    "Cử chỉ, nét mặt hoặc hành động nhỏ thường xuất hiện.",
  ],
  ["knowledge", "Điều nhân vật biết", "Phạm vi kiến thức hợp lý theo canon."],
  [
    "unknowns",
    "Điều nhân vật không biết",
    "Thông tin bị giới hạn để tránh phá vỡ nhập vai.",
  ],
  [
    "boundaries",
    "Giới hạn nhập vai",
    "Những hành vi hoặc kiểu phản hồi phải tránh.",
  ],
  [
    "exampleDialogue",
    "Ví dụ hội thoại",
    "2–4 câu thể hiện đúng giọng nói của nhân vật.",
  ],
] as const;
const scenarioFields = [
  ["scenarioTitle", "Tên bối cảnh", "Ví dụ: Cuộc gặp sau cơn mưa"],
  [
    "scenarioDescription",
    "Tình huống mở đầu",
    "Điều gì đang xảy ra khi người dùng xuất hiện?",
  ],
  ["location", "Địa điểm", "Không gian cụ thể của cảnh."],
  ["time", "Thời gian", "Thời điểm và trạng thái thời gian."],
  ["userRole", "Vai trò người dùng", "Người dùng là ai trong bối cảnh này?"],
  ["relationship", "Quan hệ ban đầu", "Hai người biết nhau đến mức nào?"],
  ["goal", "Mục tiêu của cảnh", "Một hướng mở, không phải tình tiết bắt buộc."],
  [
    "openingMessage",
    "Lời mở đầu",
    "Tin nhắn đầu tiên, có thể dùng *dấu sao* cho hành động.",
  ],
] as const;
const allPersonaFields = [...personaFields, ...voiceFields] as const;

export function CreatorForm({ locale }: { locale: string }) {
  const vi = locale === "vi";
  const [step, setStep] = useState(0);
  const [cover, setCover] = useState("");
  const [avatar, setAvatar] = useState("");
  const [name, setName] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const steps = [
    {
      label: vi ? "Danh tính" : "Identity",
      description: vi
        ? "Tên, ảnh và giới thiệu"
        : "Name, image and introduction",
      icon: UserRound,
    },
    {
      label: vi ? "Tính cách" : "Persona",
      description: vi ? "Canon và nội tâm" : "Canon and inner world",
      icon: Sparkles,
    },
    {
      label: vi ? "Giọng nói" : "Voice",
      description: vi ? "Cách nói và giới hạn" : "Speech and boundaries",
      icon: MessageSquareText,
    },
    {
      label: vi ? "Bối cảnh" : "Scenario",
      description: vi ? "Điểm bắt đầu câu chuyện" : "Where the story begins",
      icon: BookOpen,
    },
    {
      label: vi ? "Xem lại" : "Review",
      description: vi ? "Kiểm tra và lưu nháp" : "Review and save",
      icon: Check,
    },
  ];

  async function submit(data: FormData) {
    setBusy(true);
    setMessage("");
    const get = (key: string) => String(data.get(key) ?? "");
    const body = {
      locale,
      name: get("name"),
      coverUrl: get("coverUrl"),
      avatarUrl: get("avatarUrl"),
      galleryUrls: get("galleryUrls")
        .split("\n")
        .map((url) => url.trim())
        .filter(Boolean),
      rating: get("rating"),
      shortDescription: get("shortDescription"),
      description: get("description"),
      biography: get("biography"),
      ...Object.fromEntries(allPersonaFields.map(([key]) => [key, get(key)])),
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
        ? vi
          ? "Đã lưu bản nháp thành công."
          : "Draft saved successfully."
        : result.error,
    );
  }

  return (
    <form action={submit} className="creator-workspace" noValidate>
      <aside className="creator-stepper">
        <div className="stepper-intro">
          <span>{vi ? "Tiến trình" : "Progress"}</span>
          <strong>
            {step + 1} / {steps.length}
          </strong>
        </div>
        <div className="stepper-line">
          <i style={{ height: `${(step / (steps.length - 1)) * 100}%` }} />
        </div>
        {steps.map((item, index) => {
          const Icon = item.icon;
          return (
            <button
              type="button"
              key={item.label}
              className={`creator-step ${step === index ? "active" : ""} ${step > index ? "complete" : ""}`}
              onClick={() => setStep(index)}
            >
              <span className="step-icon">
                {step > index ? <Check /> : <Icon />}
              </span>
              <span>
                <strong>{item.label}</strong>
                <small>{item.description}</small>
              </span>
            </button>
          );
        })}
      </aside>

      <div className="creator-editor">
        <div className={`creator-panel ${step === 0 ? "active" : ""}`}>
          <PanelHeader
            eyebrow="01 · Identity"
            title={vi ? "Xây dựng danh tính" : "Build the identity"}
            description={
              vi
                ? "Thông tin người dùng nhìn thấy trước khi bắt đầu trò chuyện."
                : "What people see before starting a conversation."
            }
          />
          <div className="creator-field-grid">
            <Field
              label={vi ? "Tên nhân vật" : "Character name"}
              hint={vi ? "Tên hiển thị công khai" : "Public display name"}
            >
              <input
                name="name"
                required
                minLength={2}
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Elara"
              />
            </Field>
            <Field
              label="Content rating"
              hint={vi ? "Mức độ nội dung" : "Content level"}
            >
              <select name="rating">
                <option value="general">General</option>
                <option value="sensitive">Sensitive</option>
                <option value="adult">Adult</option>
              </select>
            </Field>
          </div>
          <Field
            label={vi ? "Mô tả ngắn" : "Short description"}
            hint={
              vi
                ? "Một câu xuất hiện trên thẻ nhân vật"
                : "One sentence shown on character cards"
            }
          >
            <textarea
              name="shortDescription"
              required
              value={shortDescription}
              onChange={(event) => setShortDescription(event.target.value)}
              maxLength={280}
              placeholder={
                vi
                  ? "Người giữ thư viện nằm giữa những vì sao."
                  : "Keeper of the library between the stars."
              }
            />
            <CharacterCount current={shortDescription.length} max={280} />
          </Field>
          <div className="creator-field-grid">
            <Field label="Cover URL" hint="HTTPS · ảnh ngang hoặc chân dung">
              <input
                name="coverUrl"
                type="url"
                pattern="https://.*"
                required
                value={cover}
                onChange={(event) => setCover(event.target.value)}
                placeholder="https://…"
              />
            </Field>
            <Field label="Avatar URL" hint="HTTPS · ảnh đại diện">
              <input
                name="avatarUrl"
                type="url"
                pattern="https://.*"
                required
                value={avatar}
                onChange={(event) => setAvatar(event.target.value)}
                placeholder="https://…"
              />
            </Field>
          </div>
          <Field
            label="Gallery URLs"
            hint={
              vi
                ? "Mỗi URL trên một dòng, tối đa 12 ảnh"
                : "One URL per line, up to 12 images"
            }
          >
            <textarea
              name="galleryUrls"
              placeholder="https://…&#10;https://…"
            />
          </Field>
          <Field
            label={vi ? "Giới thiệu đầy đủ" : "Full description"}
            hint={
              vi
                ? "Nội dung công khai trên trang nhân vật"
                : "Public character profile"
            }
          >
            <textarea name="description" required className="large-textarea" />
          </Field>
          <Field
            label={vi ? "Tiểu sử" : "Biography"}
            hint={
              vi
                ? "Quá khứ và hoàn cảnh hình thành nhân vật"
                : "History and formative background"
            }
          >
            <textarea name="biography" required className="large-textarea" />
          </Field>
        </div>

        <div className={`creator-panel ${step === 1 ? "active" : ""}`}>
          <PanelHeader
            eyebrow="02 · Persona"
            title={vi ? "Nội tâm và động lực" : "Inner world and motivation"}
            description={
              vi
                ? "Đây là nền móng giúp nhân vật nhất quán qua hội thoại dài."
                : "The foundation for consistency over long conversations."
            }
          />
          <div className="persona-field-grid">
            {personaFields.map(([key, label, hint]) => (
              <Field
                key={key}
                label={vi ? label : key.replace(/([A-Z])/g, " $1")}
                hint={hint}
              >
                <textarea name={key} required />
              </Field>
            ))}
          </div>
        </div>

        <div className={`creator-panel ${step === 2 ? "active" : ""}`}>
          <PanelHeader
            eyebrow="03 · Voice & rules"
            title={
              vi ? "Cho nhân vật một giọng nói" : "Give the character a voice"
            }
            description={
              vi
                ? "Mô tả cách nói cụ thể thay vì những tính từ chung chung."
                : "Describe concrete speech behavior, not generic adjectives."
            }
          />
          <div className="persona-field-grid">
            {voiceFields.map(([key, label, hint]) => (
              <Field
                key={key}
                label={vi ? label : key.replace(/([A-Z])/g, " $1")}
                hint={hint}
              >
                <textarea name={key} required />
              </Field>
            ))}
          </div>
        </div>

        <div className={`creator-panel ${step === 3 ? "active" : ""}`}>
          <PanelHeader
            eyebrow="04 · Scenario"
            title={vi ? "Mở cánh cửa đầu tiên" : "Open the first door"}
            description={
              vi
                ? "Bối cảnh nên đủ rõ để bắt đầu nhưng vẫn để người dùng tự quyết định."
                : "Give enough direction to begin while preserving user agency."
            }
          />
          <div className="persona-field-grid scenario-fields">
            {scenarioFields.map(([key, label, hint], index) => (
              <Field
                key={key}
                label={vi ? label : key.replace(/([A-Z])/g, " $1")}
                hint={hint}
                wide={index === 1 || index === 6 || index === 7}
              >
                <textarea
                  name={key}
                  required
                  className={index === 7 ? "opening-message" : ""}
                />
              </Field>
            ))}
          </div>
        </div>

        <div className={`creator-panel ${step === 4 ? "active" : ""}`}>
          <PanelHeader
            eyebrow="05 · Review"
            title={vi ? "Sẵn sàng tạo bản nháp" : "Ready to create the draft"}
            description={
              vi
                ? "Kiểm tra phần xem trước và quay lại bất kỳ bước nào nếu cần."
                : "Review the preview and revisit any step if needed."
            }
          />
          <div className="review-checklist">
            {steps.slice(0, 4).map((item, index) => (
              <button
                type="button"
                key={item.label}
                onClick={() => setStep(index)}
              >
                <Check />
                <span>
                  <strong>{item.label}</strong>
                  <small>{item.description}</small>
                </span>
                <ArrowRight />
              </button>
            ))}
          </div>
          <div className="review-note">
            <Sparkles />
            <div>
              <strong>{vi ? "Sau khi lưu" : "After saving"}</strong>
              <p>
                {vi
                  ? "Nhân vật được lưu dưới dạng bản nháp. Bạn có thể tiếp tục chỉnh sửa trước khi gửi admin duyệt."
                  : "The character is saved as a draft and can be edited before submitting for review."}
              </p>
            </div>
          </div>
        </div>

        <div className="creator-toolbar">
          <button
            type="button"
            className="secondary-button"
            disabled={step === 0}
            onClick={() => setStep((value) => Math.max(0, value - 1))}
          >
            <ArrowLeft />
            {vi ? "Quay lại" : "Back"}
          </button>
          <div>
            {message && (
              <p
                className={
                  message.includes("thành công") || message.includes("success")
                    ? "save-message success"
                    : "save-message"
                }
              >
                {message}
              </p>
            )}
          </div>
          {step < steps.length - 1 ? (
            <button
              type="button"
              className="primary-button"
              onClick={() =>
                setStep((value) => Math.min(steps.length - 1, value + 1))
              }
            >
              {vi ? "Tiếp tục" : "Continue"}
              <ArrowRight />
            </button>
          ) : (
            <button className="primary-button" disabled={busy}>
              <Save />
              {busy ? "…" : vi ? "Lưu bản nháp" : "Save draft"}
            </button>
          )}
        </div>
      </div>

      <aside className="creator-preview">
        <div className="preview-label">
          <span>
            <ImageIcon />
            {vi ? "Xem trước" : "Live preview"}
          </span>
          <i>{vi ? "Tự động cập nhật" : "Auto updating"}</i>
        </div>
        <div className="preview-card">
          <div className="preview-cover">
            <RemoteImage src={cover} alt={name || "Character"} />
          </div>
          <div className="preview-avatar">
            <RemoteImage src={avatar || cover} alt={name || "Character"} />
          </div>
          <div className="preview-content">
            <span className="preview-rating">General</span>
            <h3>{name || (vi ? "Tên nhân vật" : "Character name")}</h3>
            <p>
              {shortDescription ||
                (vi
                  ? "Mô tả ngắn của nhân vật sẽ xuất hiện tại đây."
                  : "The short character description will appear here.")}
            </p>
            <div className="preview-chat-button">
              <MessageSquareText />
              {vi ? "Bắt đầu trò chuyện" : "Start chatting"}
            </div>
          </div>
        </div>
        <div className="creator-tip">
          <Sparkles />
          <p>
            {vi
              ? "Mẹo: dùng hành vi cụ thể và ví dụ hội thoại sẽ hiệu quả hơn danh sách tính từ."
              : "Tip: concrete behavior and dialogue examples work better than adjective lists."}
          </p>
        </div>
      </aside>
    </form>
  );
}

function PanelHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <header className="creator-panel-header">
      <p className="eyebrow">{eyebrow}</p>
      <h2>{title}</h2>
      <p>{description}</p>
    </header>
  );
}
function Field({
  label,
  hint,
  children,
  wide = false,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <label className={`creator-field ${wide ? "wide" : ""}`}>
      <span>
        <strong>{label}</strong>
        {hint && <small>{hint}</small>}
      </span>
      {children}
    </label>
  );
}
function CharacterCount({ current, max }: { current: number; max: number }) {
  return (
    <small className="character-count">
      {current} / {max}
    </small>
  );
}
