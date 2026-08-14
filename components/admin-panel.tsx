"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity,
  AlertCircle,
  Award,
  Ban,
  Check,
  CheckCircle,
  ChevronRight,
  Cpu,
  Eye,
  Flame,
  Globe,
  Image as ImageIcon,
  Key,
  Layers,
  MessageSquare,
  Package,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Shield,
  ShieldAlert,
  Sparkles,
  Star,
  Trash2,
  UserCheck,
  Users,
  X,
  XCircle,
} from "lucide-react";
import { RemoteImage } from "./remote-image";

type TabKey =
  | "dashboard"
  | "users"
  | "characters"
  | "ai_settings"
  | "plans"
  | "categories_banners";

export function AdminPanel({ locale }: { locale: string }) {
  const [activeTab, setActiveTab] = useState<TabKey>("dashboard");
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  function showToast(message: string, type: "success" | "error" = "success") {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }

  return (
    <div className="admin-container">
      {/* Toast Notification */}
      {toast && (
        <div className={`admin-toast ${toast.type}`}>
          {toast.type === "success" ? <CheckCircle /> : <AlertCircle />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Main Tab Navigation */}
      <nav className="admin-nav-tabs">
        <button
          className={activeTab === "dashboard" ? "active" : ""}
          onClick={() => setActiveTab("dashboard")}
        >
          <Activity />
          <span>{locale === "vi" ? "Tổng quan" : "Overview"}</span>
        </button>
        <button
          className={activeTab === "users" ? "active" : ""}
          onClick={() => setActiveTab("users")}
        >
          <Users />
          <span>{locale === "vi" ? "Người dùng" : "Users"}</span>
        </button>
        <button
          className={activeTab === "characters" ? "active" : ""}
          onClick={() => setActiveTab("characters")}
        >
          <Sparkles />
          <span>{locale === "vi" ? "Nhân vật & Duyệt" : "Characters"}</span>
        </button>
        <button
          className={activeTab === "ai_settings" ? "active" : ""}
          onClick={() => setActiveTab("ai_settings")}
        >
          <Cpu />
          <span>{locale === "vi" ? "Cấu hình AI & Key" : "AI & API"}</span>
        </button>
        <button
          className={activeTab === "plans" ? "active" : ""}
          onClick={() => setActiveTab("plans")}
        >
          <Package />
          <span>{locale === "vi" ? "Gói cước" : "Plans"}</span>
        </button>
        <button
          className={activeTab === "categories_banners" ? "active" : ""}
          onClick={() => setActiveTab("categories_banners")}
        >
          <Layers />
          <span>{locale === "vi" ? "Thể loại & Banner" : "Categories"}</span>
        </button>
      </nav>

      {/* Tab Panels */}
      <div className="admin-tab-content">
        {activeTab === "dashboard" && <DashboardTab locale={locale} onNavigate={setActiveTab} />}
        {activeTab === "users" && <UsersTab locale={locale} showToast={showToast} />}
        {activeTab === "characters" && <CharactersTab locale={locale} showToast={showToast} />}
        {activeTab === "ai_settings" && <AiSettingsTab locale={locale} showToast={showToast} />}
        {activeTab === "plans" && <PlansTab locale={locale} showToast={showToast} />}
        {activeTab === "categories_banners" && (
          <CategoriesBannersTab locale={locale} showToast={showToast} />
        )}
      </div>
    </div>
  );
}

/* =========================================================================
   1. DASHBOARD TAB
   ========================================================================= */
function DashboardTab({
  locale,
  onNavigate,
}: {
  locale: string;
  onNavigate: (tab: TabKey) => void;
}) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [testingKey, setTestingKey] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/stats");
      if (res.ok) {
        setData(await res.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function testGeminiKey() {
    setTestingKey(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/admin/credentials/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const json = await res.json();
      setTestResult(json);
      if (json.ok) {
        loadStats();
      }
    } catch (e: any) {
      setTestResult({ ok: false, error: e.message });
    } finally {
      setTestingKey(false);
    }
  }

  if (loading || !data) {
    return (
      <div className="admin-loading">
        <RefreshCw className="spin" />
        <span>{locale === "vi" ? "Đang tải dữ liệu tổng quan..." : "Loading dashboard metrics..."}</span>
      </div>
    );
  }

  const { metrics, system, recentConversations } = data;
  const aiSuccessRate =
    metrics.totalAiCalls > 0
      ? Math.round((metrics.successAiCalls / metrics.totalAiCalls) * 100)
      : 100;

  return (
    <div className="admin-dashboard-view">
      {/* Metric Cards Grid */}
      <div className="admin-metric-cards">
        <div className="admin-card metric-item" onClick={() => onNavigate("users")}>
          <div className="metric-header">
            <span className="metric-title">{locale === "vi" ? "Người dùng" : "Users"}</span>
            <Users className="metric-icon" />
          </div>
          <div className="metric-number">{metrics.users}</div>
          <span className="metric-sub">
            {locale === "vi" ? "Tài khoản đã đăng ký" : "Registered accounts"}
          </span>
        </div>

        <div className="admin-card metric-item" onClick={() => onNavigate("characters")}>
          <div className="metric-header">
            <span className="metric-title">{locale === "vi" ? "Nhân vật" : "Characters"}</span>
            <Sparkles className="metric-icon" />
          </div>
          <div className="metric-number">{metrics.characters}</div>
          <div className="metric-badges">
            <span className="badge success">{metrics.publishedCharacters} Published</span>
            {metrics.pendingCharacters > 0 && (
              <span className="badge warning">{metrics.pendingCharacters} Pending</span>
            )}
          </div>
        </div>

        <div className="admin-card metric-item">
          <div className="metric-header">
            <span className="metric-title">{locale === "vi" ? "Hội thoại & Tin nhắn" : "Conversations"}</span>
            <MessageSquare className="metric-icon" />
          </div>
          <div className="metric-number">{metrics.conversations}</div>
          <span className="metric-sub">
            {metrics.messages} {locale === "vi" ? "tin nhắn đã trao đổi" : "total messages"}
          </span>
        </div>

        <div className="admin-card metric-item" onClick={() => onNavigate("ai_settings")}>
          <div className="metric-header">
            <span className="metric-title">{locale === "vi" ? "Tỉ lệ gọi AI" : "AI Success Rate"}</span>
            <Cpu className="metric-icon" />
          </div>
          <div className="metric-number">{aiSuccessRate}%</div>
          <span className="metric-sub">
            {metrics.totalTokens.toLocaleString()} tokens ({metrics.totalAiCalls} calls)
          </span>
        </div>
      </div>

      {/* System Status & Key Test Card */}
      <div className="admin-section-grid">
        <div className="admin-card system-status-card">
          <div className="card-top">
            <div>
              <p className="eyebrow">{locale === "vi" ? "Trạng thái AI Hệ Thống" : "AI System Status"}</p>
              <h3>Google Gemini Provider</h3>
            </div>
            {system.hasGeminiKey ? (
              <span className="status-chip success">
                <CheckCircle /> {locale === "vi" ? "Đã cấu hình Key (..." + system.geminiKeyLastFour + ")" : "Active Key (..." + system.geminiKeyLastFour + ")"}
              </span>
            ) : (
              <span className="status-chip error">
                <AlertCircle /> {locale === "vi" ? "Chưa có Key hệ thống" : "No System Key"}
              </span>
            )}
          </div>

          <p className="system-model-info">
            {locale === "vi" ? "Model mặc định:" : "Default model:"} <strong>{system.defaultModel}</strong>
          </p>

          <div className="key-test-actions">
            <button
              className="primary-button test-btn"
              disabled={testingKey || !system.hasGeminiKey}
              onClick={testGeminiKey}
            >
              {testingKey ? <RefreshCw className="spin" /> : <Activity />}
              {locale === "vi" ? "Kiểm tra kết nối Gemini ngay" : "Test Gemini Connection"}
            </button>
            <button
              className="secondary-button"
              onClick={() => onNavigate("ai_settings")}
            >
              <Settings />
              {locale === "vi" ? "Đổi API Key" : "Configure Key"}
            </button>
          </div>

          {testResult && (
            <div className={`test-feedback ${testResult.ok ? "success" : "error"}`}>
              {testResult.ok ? (
                <>
                  <CheckCircle />
                  <span>
                    {testResult.message} (Gemini reply: <em>{testResult.reply}</em>)
                  </span>
                </>
              ) : (
                <>
                  <AlertCircle />
                  <span>{testResult.error}</span>
                </>
              )}
            </div>
          )}
        </div>

        {/* Recent Conversations */}
        <div className="admin-card recent-conversations-card">
          <div className="card-top">
            <div>
              <p className="eyebrow">{locale === "vi" ? "Hoạt động gần đây" : "Recent Activity"}</p>
              <h3>{locale === "vi" ? "Cuộc trò chuyện mới" : "Latest Story Chats"}</h3>
            </div>
          </div>

          <div className="activity-list">
            {recentConversations?.length ? (
              recentConversations.map((c: any) => (
                <div key={c.id} className="activity-row">
                  <div className="activity-info">
                    <strong>{c.title || (locale === "vi" ? "Cuộc trò chuyện mới" : "New Chat")}</strong>
                    <small>
                      {c.userName || c.userEmail || "Anonymous"} • {new Date(c.createdAt).toLocaleTimeString()}
                    </small>
                  </div>
                  <span className="lang-tag">{c.locale.toUpperCase()}</span>
                </div>
              ))
            ) : (
              <p className="muted-text">{locale === "vi" ? "Chưa có hội thoại nào." : "No conversations yet."}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* =========================================================================
   2. USERS MANAGEMENT TAB
   ========================================================================= */
function UsersTab({
  locale,
  showToast,
}: {
  locale: string;
  showToast: (msg: string, type?: "success" | "error") => void;
}) {
  const [users, setUsers] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    loadPlans();
  }, []);

  useEffect(() => {
    loadUsers();
  }, [query, roleFilter, page]);

  async function loadPlans() {
    try {
      const res = await fetch("/api/admin/plans");
      if (res.ok) {
        const json = await res.json();
        setPlans(json.plans || []);
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function loadUsers() {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "15",
      });
      if (query.trim()) params.set("q", query.trim());
      if (roleFilter !== "all") params.set("role", roleFilter);

      const res = await fetch(`/api/admin/users?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
        setTotalPages(data.pagination.totalPages || 1);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function updateUser(id: string, updates: any) {
    setUpdatingId(id);
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      const json = await res.json();
      if (res.ok) {
        showToast(locale === "vi" ? "Đã cập nhật người dùng" : "User updated successfully");
        loadUsers();
      } else {
        showToast(json.error || "Update failed", "error");
      }
    } catch (e: any) {
      showToast(e.message, "error");
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div className="admin-users-view">
      {/* Search & Filter Header */}
      <div className="admin-filter-bar">
        <div className="search-box">
          <Search />
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            placeholder={locale === "vi" ? "Tìm theo tên hoặc email..." : "Search by name or email..."}
          />
        </div>

        <div className="filter-group">
          {["all", "user", "creator", "admin"].map((r) => (
            <button
              key={r}
              className={`filter-btn ${roleFilter === r ? "active" : ""}`}
              onClick={() => {
                setRoleFilter(r);
                setPage(1);
              }}
            >
              {r === "all"
                ? locale === "vi" ? "Tất cả" : "All"
                : r.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Users Table */}
      <div className="admin-card table-container">
        {loading ? (
          <div className="admin-loading">
            <RefreshCw className="spin" />
            <span>{locale === "vi" ? "Đang tải danh sách người dùng..." : "Loading users..."}</span>
          </div>
        ) : users.length === 0 ? (
          <p className="empty-notice">
            {locale === "vi" ? "Không tìm thấy người dùng phù hợp." : "No users found."}
          </p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>{locale === "vi" ? "Người dùng" : "User"}</th>
                <th>{locale === "vi" ? "Vai trò" : "Role"}</th>
                <th>{locale === "vi" ? "Gói cước" : "Plan"}</th>
                <th>{locale === "vi" ? "Hạn mức (Quota)" : "Quota"}</th>
                <th>{locale === "vi" ? "Tạo NV" : "Chars"}</th>
                <th>{locale === "vi" ? "Trạng thái" : "Status"}</th>
                <th className="text-right">{locale === "vi" ? "Thao tác" : "Actions"}</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className={u.banned ? "banned-row" : ""}>
                  <td>
                    <div className="user-cell">
                      <div className="user-avatar-circle">
                        {u.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={u.image} alt={u.name} />
                        ) : (
                          <span>{(u.name || "U")[0].toUpperCase()}</span>
                        )}
                      </div>
                      <div>
                        <strong>{u.name || "Unnamed"}</strong>
                        <small>{u.email}</small>
                      </div>
                    </div>
                  </td>
                  <td>
                    <select
                      className="inline-select"
                      value={u.role}
                      disabled={updatingId === u.id}
                      onChange={(e) => updateUser(u.id, { role: e.target.value })}
                    >
                      <option value="user">User</option>
                      <option value="creator">Creator</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td>
                    <select
                      className="inline-select"
                      value={u.planId || ""}
                      disabled={updatingId === u.id}
                      onChange={(e) => updateUser(u.id, { planId: e.target.value })}
                    >
                      <option value="">(Default Free)</option>
                      {plans.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.monthlyMessages} msgs)
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    {u.quota ? (
                      <span className="quota-tag">
                        {u.quota.used} / {u.quota.allowance}
                      </span>
                    ) : (
                      <span className="muted-text">30/tháng</span>
                    )}
                  </td>
                  <td>
                    <span className="count-tag">{u.characterCount}</span>
                  </td>
                  <td>
                    {u.banned ? (
                      <span className="status-badge banned">
                        <Ban /> Banned
                      </span>
                    ) : (
                      <span className="status-badge active">
                        <Check /> Active
                      </span>
                    )}
                  </td>
                  <td className="text-right">
                    <div className="action-buttons">
                      <button
                        title={locale === "vi" ? "Tặng +50 tin nhắn" : "Add 50 messages"}
                        className="icon-action-btn"
                        onClick={() => updateUser(u.id, { addQuota: 50 })}
                      >
                        +50
                      </button>
                      <button
                        title={u.banned ? "Mở khóa tài khoản" : "Khóa tài khoản"}
                        className={`icon-action-btn ${u.banned ? "unban" : "ban"}`}
                        onClick={() => updateUser(u.id, { banned: !u.banned })}
                      >
                        {u.banned ? <UserCheck /> : <Ban />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="admin-pagination">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              {locale === "vi" ? "Trang trước" : "Previous"}
            </button>
            <span>
              {page} / {totalPages}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              {locale === "vi" ? "Trang sau" : "Next"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* =========================================================================
   3. CHARACTERS & MODERATION TAB
   ========================================================================= */
function CharactersTab({
  locale,
  showToast,
}: {
  locale: string;
  showToast: (msg: string, type?: "success" | "error") => void;
}) {
  const [characters, setCharacters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [previewChar, setPreviewChar] = useState<any>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    loadCharacters();
  }, [statusFilter, query, page]);

  async function loadCharacters() {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "15",
      });
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (query.trim()) params.set("q", query.trim());

      const res = await fetch(`/api/admin/characters?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setCharacters(json.characters || []);
        setTotalPages(json.pagination.totalPages || 1);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function updateCharacter(id: string, updates: any) {
    setUpdatingId(id);
    try {
      const res = await fetch(`/api/admin/characters/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      const json = await res.json();
      if (res.ok) {
        showToast(
          locale === "vi" ? "Đã cập nhật trạng thái nhân vật" : "Character updated"
        );
        loadCharacters();
        if (previewChar?.id === id) {
          setPreviewChar(null);
        }
      } else {
        showToast(json.error || "Failed", "error");
      }
    } catch (e: any) {
      showToast(e.message, "error");
    } finally {
      setUpdatingId(null);
    }
  }

  async function deleteCharacter(id: string) {
    if (
      !confirm(
        locale === "vi"
          ? "Bạn có chắc muốn lưu trữ/xóa nhân vật này?"
          : "Are you sure you want to archive this character?"
      )
    ) {
      return;
    }
    try {
      const res = await fetch(`/api/admin/characters/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        showToast(locale === "vi" ? "Đã lưu trữ nhân vật" : "Character archived");
        loadCharacters();
      }
    } catch (e: any) {
      showToast(e.message, "error");
    }
  }

  return (
    <div className="admin-characters-view">
      {/* Filter Bar */}
      <div className="admin-filter-bar">
        <div className="search-box">
          <Search />
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            placeholder={
              locale === "vi"
                ? "Tìm nhân vật theo tên hoặc slug..."
                : "Search characters..."
            }
          />
        </div>

        <div className="filter-group">
          {[
            { id: "all", label: locale === "vi" ? "Tất cả" : "All" },
            { id: "pending_review", label: locale === "vi" ? "Chờ duyệt" : "Pending" },
            { id: "published", label: locale === "vi" ? "Đã duyệt" : "Published" },
            { id: "draft", label: locale === "vi" ? "Bản nháp" : "Draft" },
            { id: "rejected", label: locale === "vi" ? "Từ chối" : "Rejected" },
          ].map((f) => (
            <button
              key={f.id}
              className={`filter-btn ${statusFilter === f.id ? "active" : ""}`}
              onClick={() => {
                setStatusFilter(f.id);
                setPage(1);
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Characters List Table */}
      <div className="admin-card table-container">
        {loading ? (
          <div className="admin-loading">
            <RefreshCw className="spin" />
            <span>{locale === "vi" ? "Đang tải danh sách nhân vật..." : "Loading characters..."}</span>
          </div>
        ) : characters.length === 0 ? (
          <p className="empty-notice">
            {locale === "vi" ? "Không có nhân vật nào trong mục này." : "No characters found."}
          </p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>{locale === "vi" ? "Nhân vật" : "Character"}</th>
                <th>{locale === "vi" ? "Tác giả" : "Author"}</th>
                <th>{locale === "vi" ? "Trạng thái" : "Status"}</th>
                <th>{locale === "vi" ? "Độ tuổi" : "Rating"}</th>
                <th>{locale === "vi" ? "Nổi bật" : "Featured"}</th>
                <th>{locale === "vi" ? "Thống kê" : "Stats"}</th>
                <th className="text-right">{locale === "vi" ? "Hành động" : "Actions"}</th>
              </tr>
            </thead>
            <tbody>
              {characters.map((c) => {
                const viName =
                  c.translations.find((t: any) => t.locale === "vi")?.name ||
                  c.translations[0]?.name ||
                  c.slug;
                const coverImg =
                  c.images.find((i: any) => i.type === "cover")?.url ||
                  c.images[0]?.url;

                return (
                  <tr key={c.id}>
                    <td>
                      <div className="char-cell">
                        <div className="char-thumb">
                          <RemoteImage src={coverImg} alt={viName} />
                        </div>
                        <div>
                          <strong>{viName}</strong>
                          <small className="slug-text">/{c.slug}</small>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="owner-text">{c.ownerName || c.ownerEmail}</span>
                    </td>
                    <td>
                      <select
                        className={`status-select ${c.status}`}
                        value={c.status}
                        disabled={updatingId === c.id}
                        onChange={(e) => updateCharacter(c.id, { status: e.target.value })}
                      >
                        <option value="published">Published</option>
                        <option value="pending_review">Pending Review</option>
                        <option value="draft">Draft</option>
                        <option value="rejected">Rejected</option>
                        <option value="archived">Archived</option>
                      </select>
                    </td>
                    <td>
                      <select
                        className="inline-select"
                        value={c.rating}
                        disabled={updatingId === c.id}
                        onChange={(e) => updateCharacter(c.id, { rating: e.target.value })}
                      >
                        <option value="general">General</option>
                        <option value="sensitive">Sensitive</option>
                        <option value="adult">Adult</option>
                      </select>
                    </td>
                    <td>
                      <button
                        className={`star-toggle ${c.featured ? "active" : ""}`}
                        title={c.featured ? "Bỏ nổi bật" : "Gán nổi bật"}
                        onClick={() => updateCharacter(c.id, { featured: !c.featured })}
                      >
                        <Star />
                      </button>
                    </td>
                    <td>
                      <div className="stats-badges">
                        <span>👁️ {c.views || 0}</span>
                        <span>💬 {c.chats || 0}</span>
                      </div>
                    </td>
                    <td className="text-right">
                      <div className="action-buttons">
                        <button
                          className="preview-btn"
                          onClick={() => setPreviewChar(c)}
                        >
                          <Eye /> {locale === "vi" ? "Xem chi tiết" : "Preview"}
                        </button>
                        {c.status === "pending_review" && (
                          <button
                            className="approve-btn"
                            title="Publish character"
                            onClick={() => updateCharacter(c.id, { status: "published" })}
                          >
                            <Check />
                          </button>
                        )}
                        <button
                          className="delete-icon-btn"
                          title="Archive character"
                          onClick={() => deleteCharacter(c.id)}
                        >
                          <Trash2 />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="admin-pagination">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              {locale === "vi" ? "Trang trước" : "Previous"}
            </button>
            <span>
              {page} / {totalPages}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              {locale === "vi" ? "Trang sau" : "Next"}
            </button>
          </div>
        )}
      </div>

      {/* Character Detail / Preview Modal */}
      {previewChar && (
        <div className="admin-modal-backdrop" onClick={() => setPreviewChar(null)}>
          <div
            className="admin-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="modal-close-btn"
              onClick={() => setPreviewChar(null)}
            >
              <X />
            </button>

            <div className="modal-header">
              <h2>
                {previewChar.translations.find((t: any) => t.locale === "vi")?.name ||
                  previewChar.slug}
              </h2>
              <span className={`status-badge ${previewChar.status}`}>
                {previewChar.status.toUpperCase()}
              </span>
            </div>

            <div className="preview-modal-body">
              {/* Cover & Avatar previews */}
              <div className="preview-images-row">
                {previewChar.images.map((img: any) => (
                  <div key={img.id} className="preview-img-box">
                    <RemoteImage src={img.url} alt={img.type} />
                    <span className="img-tag">{img.type}</span>
                  </div>
                ))}
              </div>

              {/* Biography & Descriptions */}
              <div className="preview-section">
                <h4>{locale === "vi" ? "Tiểu sử & Mô tả" : "Bio & Description"}</h4>
                <p>
                  {previewChar.translations.find((t: any) => t.locale === "vi")?.biography ||
                    previewChar.translations[0]?.biography}
                </p>
              </div>

              {/* Persona Specs */}
              {previewChar.persona && (
                <div className="preview-section">
                  <h4>{locale === "vi" ? "Khuôn mẫu Persona & Canon" : "Persona & Voice"}</h4>
                  <div className="persona-grid">
                    <div>
                      <strong>Canon:</strong> <p>{previewChar.persona.canon}</p>
                    </div>
                    <div>
                      <strong>Tính cách:</strong> <p>{previewChar.persona.personality}</p>
                    </div>
                    <div>
                      <strong>Động lực:</strong> <p>{previewChar.persona.motivations}</p>
                    </div>
                    <div>
                      <strong>Văn phong (Voice):</strong> <p>{previewChar.persona.speechStyle}</p>
                    </div>
                    <div>
                      <strong>Quy chuẩn xưng hô:</strong> <p>{previewChar.persona.addressStyle}</p>
                    </div>
                    <div>
                      <strong>Hội thoại mẫu:</strong> <p>{previewChar.persona.exampleDialogue}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Scenarios */}
              {previewChar.scenarios?.length > 0 && (
                <div className="preview-section">
                  <h4>{locale === "vi" ? "Kịch bản khởi đầu (Scenarios)" : "Scenarios"}</h4>
                  {previewChar.scenarios.map((sc: any, idx: number) => {
                    const trans =
                      sc.translations?.find((t: any) => t.locale === "vi") ||
                      sc.translations?.[0];
                    return (
                      <div key={sc.id || idx} className="scenario-preview-box">
                        <strong>
                          {idx + 1}. {trans?.title || "Scenario"}
                        </strong>
                        <p>{trans?.description}</p>
                        <blockquote className="opening-quote">
                          <em>{trans?.openingMessage}</em>
                        </blockquote>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Quick Actions in Modal */}
              <div className="modal-actions-bar">
                <button
                  className="primary-button approve-large"
                  onClick={() => updateCharacter(previewChar.id, { status: "published" })}
                >
                  <Check /> {locale === "vi" ? "Phê duyệt (Publish)" : "Publish Character"}
                </button>
                <button
                  className="secondary-button reject-large"
                  onClick={() => updateCharacter(previewChar.id, { status: "rejected" })}
                >
                  <XCircle /> {locale === "vi" ? "Từ chối (Reject)" : "Reject"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* =========================================================================
   4. AI SETTINGS & LOGS TAB
   ========================================================================= */
function AiSettingsTab({
  locale,
  showToast,
}: {
  locale: string;
  showToast: (msg: string, type?: "success" | "error") => void;
}) {
  const [apiKey, setApiKey] = useState("");
  const [savingKey, setSavingKey] = useState(false);
  const [testingKey, setTestingKey] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [models, setModels] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadModelsAndLogs();
  }, []);

  async function loadModelsAndLogs() {
    setLoading(true);
    try {
      const [modelsRes, logsRes] = await Promise.all([
        fetch("/api/admin/models"),
        fetch("/api/admin/ai-logs?limit=25"),
      ]);

      if (modelsRes.ok) {
        const json = await modelsRes.json();
        setModels(json.models || []);
      }
      if (logsRes.ok) {
        const json = await logsRes.json();
        setLogs(json.logs || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function saveSystemKey() {
    if (!apiKey.trim()) return;
    setSavingKey(true);
    try {
      const res = await fetch("/api/admin/credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: "google", apiKey }),
      });
      if (res.ok) {
        showToast(locale === "vi" ? "Đã lưu Google Gemini Key hệ thống" : "System key saved");
        setApiKey("");
        testApiKey();
      } else {
        showToast("Failed to save key", "error");
      }
    } catch (e: any) {
      showToast(e.message, "error");
    } finally {
      setSavingKey(false);
    }
  }

  async function testApiKey(keyToTest?: string) {
    setTestingKey(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/admin/credentials/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(keyToTest ? { apiKey: keyToTest } : {}),
      });
      const json = await res.json();
      setTestResult(json);
    } catch (e: any) {
      setTestResult({ ok: false, error: e.message });
    } finally {
      setTestingKey(false);
    }
  }

  async function updateModel(modelId: string, updates: any) {
    try {
      const res = await fetch("/api/admin/models", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modelId, ...updates }),
      });
      if (res.ok) {
        showToast(locale === "vi" ? "Đã cập nhật model AI" : "Model updated");
        loadModelsAndLogs();
      }
    } catch (e: any) {
      showToast(e.message, "error");
    }
  }

  return (
    <div className="admin-ai-view">
      <div className="admin-section-grid">
        {/* Gemini API Key Box */}
        <div className="admin-card">
          <div className="card-top">
            <div>
              <p className="eyebrow">{locale === "vi" ? "Bảo mật & Kết nối" : "Authentication"}</p>
              <h3>Google Gemini System Key</h3>
            </div>
            <Key className="metric-icon" />
          </div>

          <p className="muted-text">
            {locale === "vi"
              ? "Key hệ thống được mã hóa AES-256 trong PostgreSQL. Dùng cho người dùng sử dụng quota gói miễn phí."
              : "System key is encrypted with AES-256 in PostgreSQL and used for users on monthly quotas."}
          </p>

          <label className="input-label">
            <span>{locale === "vi" ? "Nhập Google Gemini API Key mới:" : "Enter Gemini API Key:"}</span>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="AIzaSy..."
            />
          </label>

          <div className="button-row">
            <button
              className="primary-button"
              disabled={savingKey || !apiKey.trim()}
              onClick={saveSystemKey}
            >
              {savingKey ? <RefreshCw className="spin" /> : <Check />}
              {locale === "vi" ? "Lưu Key Hệ Thống" : "Save Key"}
            </button>
            <button
              className="secondary-button"
              disabled={testingKey}
              onClick={() => testApiKey(apiKey.trim() || undefined)}
            >
              {testingKey ? <RefreshCw className="spin" /> : <Activity />}
              {locale === "vi" ? "Test kết nối Key" : "Test Key"}
            </button>
          </div>

          {testResult && (
            <div className={`test-feedback ${testResult.ok ? "success" : "error"}`}>
              {testResult.ok ? (
                <>
                  <CheckCircle />
                  <span>{testResult.message}</span>
                </>
              ) : (
                <>
                  <AlertCircle />
                  <span>{testResult.error}</span>
                </>
              )}
            </div>
          )}
        </div>

        {/* AI Models Management */}
        <div className="admin-card">
          <div className="card-top">
            <div>
              <p className="eyebrow">{locale === "vi" ? "Mô hình ngôn ngữ" : "Language Models"}</p>
              <h3>Active AI Models</h3>
            </div>
            <Cpu className="metric-icon" />
          </div>

          <div className="models-list">
            {models.map((m) => (
              <div key={m.id} className={`model-card ${m.isDefault ? "is-default" : ""}`}>
                <div className="model-info">
                  <strong>{m.label}</strong>
                  <small className="slug-text">{m.modelId}</small>
                  {m.isDefault && <span className="default-chip">Default</span>}
                </div>
                <div className="model-actions">
                  <button
                    className={`toggle-btn ${m.active ? "on" : "off"}`}
                    onClick={() => updateModel(m.modelId, { active: !m.active })}
                  >
                    {m.active ? "Active" : "Disabled"}
                  </button>
                  {!m.isDefault && (
                    <button
                      className="set-default-btn"
                      onClick={() => updateModel(m.modelId, { isDefault: true })}
                    >
                      Set Default
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* AI Usage Logs Table */}
      <div className="admin-card table-container" style={{ marginTop: "24px" }}>
        <div className="card-top">
          <div>
            <p className="eyebrow">{locale === "vi" ? "Lịch sử thực thi" : "Execution History"}</p>
            <h3>{locale === "vi" ? "Nhật ký gọi AI (AI Usage Logs)" : "Recent AI Request Logs"}</h3>
          </div>
          <button className="icon-action-btn" onClick={loadModelsAndLogs}>
            <RefreshCw />
          </button>
        </div>

        {logs.length === 0 ? (
          <p className="empty-notice">{locale === "vi" ? "Chưa có lượt gọi AI nào." : "No AI logs yet."}</p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>{locale === "vi" ? "Thời gian" : "Timestamp"}</th>
                <th>Model</th>
                <th>{locale === "vi" ? "Người dùng" : "User"}</th>
                <th>{locale === "vi" ? "Loại Key" : "Key Type"}</th>
                <th>Tokens (In/Out)</th>
                <th className="text-right">{locale === "vi" ? "Trạng thái" : "Status"}</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td>
                    <small>{new Date(log.createdAt).toLocaleString()}</small>
                  </td>
                  <td>
                    <span className="code-badge">{log.modelId}</span>
                  </td>
                  <td>{log.userName || log.userEmail || "Anonymous"}</td>
                  <td>
                    <span className={`key-chip ${log.usedPersonalKey ? "personal" : "system"}`}>
                      {log.usedPersonalKey ? "Personal Key" : "System Quota"}
                    </span>
                  </td>
                  <td>
                    {log.inputTokens ?? 0} in / {log.outputTokens ?? 0} out
                  </td>
                  <td className="text-right">
                    {log.successful ? (
                      <span className="status-badge active">
                        <Check /> OK
                      </span>
                    ) : (
                      <span className="status-badge banned" title={log.errorCode || "Error"}>
                        <AlertCircle /> Fail
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

/* =========================================================================
   5. PLANS & QUOTA TAB
   ========================================================================= */
function PlansTab({
  locale,
  showToast,
}: {
  locale: string;
  showToast: (msg: string, type?: "success" | "error") => void;
}) {
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPlan, setEditingPlan] = useState<any>(null);
  const [form, setForm] = useState({
    slug: "",
    name: "",
    monthlyMessages: 30,
    canCreateCharacters: false,
    active: true,
  });

  useEffect(() => {
    loadPlans();
  }, []);

  async function loadPlans() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/plans");
      if (res.ok) {
        const json = await res.json();
        setPlans(json.plans || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function savePlan(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch("/api/admin/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        showToast(locale === "vi" ? "Đã lưu gói dịch vụ" : "Plan saved");
        setEditingPlan(null);
        setForm({
          slug: "",
          name: "",
          monthlyMessages: 30,
          canCreateCharacters: false,
          active: true,
        });
        loadPlans();
      } else {
        const json = await res.json();
        showToast(json.error || "Failed", "error");
      }
    } catch (e: any) {
      showToast(e.message, "error");
    }
  }

  return (
    <div className="admin-plans-view">
      <div className="admin-section-grid">
        {/* Plans List */}
        <div className="admin-card">
          <div className="card-top">
            <div>
              <p className="eyebrow">{locale === "vi" ? "Gói thành viên" : "Subscription Tiers"}</p>
              <h3>{locale === "vi" ? "Danh sách Gói dịch vụ" : "Membership Plans"}</h3>
            </div>
            <Package className="metric-icon" />
          </div>

          <div className="plans-grid">
            {plans.map((p) => (
              <div key={p.id} className="plan-card-item">
                <div className="plan-card-header">
                  <strong>{p.name}</strong>
                  <span className="slug-text">/{p.slug}</span>
                </div>
                <div className="plan-messages">
                  <span className="quota-big">{p.monthlyMessages}</span>
                  <small>{locale === "vi" ? "tin nhắn/tháng" : "messages/month"}</small>
                </div>
                <div className="plan-features">
                  <span>
                    {p.canCreateCharacters ? "✅ Được tạo nhân vật" : "❌ Không tạo nhân vật"}
                  </span>
                  <span>{p.active ? "🟢 Đang kích hoạt" : "⚪ Tạm dừng"}</span>
                </div>
                <button
                  className="secondary-button edit-plan-btn"
                  onClick={() => {
                    setEditingPlan(p);
                    setForm({
                      slug: p.slug,
                      name: p.name,
                      monthlyMessages: p.monthlyMessages,
                      canCreateCharacters: p.canCreateCharacters,
                      active: p.active,
                    });
                  }}
                >
                  <Settings /> {locale === "vi" ? "Chỉnh sửa" : "Edit Plan"}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Create / Edit Plan Form */}
        <div className="admin-card">
          <div className="card-top">
            <div>
              <p className="eyebrow">
                {editingPlan
                  ? locale === "vi" ? "Chỉnh sửa" : "Edit"
                  : locale === "vi" ? "Thêm mới" : "Create"}
              </p>
              <h3>{editingPlan ? editingPlan.name : locale === "vi" ? "Tạo Gói Mới" : "New Plan"}</h3>
            </div>
          </div>

          <form onSubmit={savePlan} className="admin-form">
            <label>
              <span>Slug (URL identifier):</span>
              <input
                value={form.slug}
                disabled={!!editingPlan}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
                placeholder="vip-pro"
                required
              />
            </label>

            <label>
              <span>{locale === "vi" ? "Tên gói:" : "Plan Name:"}</span>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="VIP Member"
                required
              />
            </label>

            <label>
              <span>{locale === "vi" ? "Số tin nhắn hàng tháng:" : "Monthly Messages Allowance:"}</span>
              <input
                type="number"
                min="0"
                max="1000000"
                value={form.monthlyMessages}
                onChange={(e) =>
                  setForm({ ...form, monthlyMessages: parseInt(e.target.value, 10) || 0 })
                }
                required
              />
            </label>

            <div className="checkbox-row">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={form.canCreateCharacters}
                  onChange={(e) => setForm({ ...form, canCreateCharacters: e.target.checked })}
                />
                <span>{locale === "vi" ? "Cho phép tạo nhân vật (Creator Mode)" : "Allow creating characters"}</span>
              </label>
            </div>

            <div className="button-row">
              <button type="submit" className="primary-button">
                <Check /> {editingPlan ? (locale === "vi" ? "Cập nhật" : "Update") : (locale === "vi" ? "Tạo gói" : "Create")}
              </button>
              {editingPlan && (
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => {
                    setEditingPlan(null);
                    setForm({
                      slug: "",
                      name: "",
                      monthlyMessages: 30,
                      canCreateCharacters: false,
                      active: true,
                    });
                  }}
                >
                  {locale === "vi" ? "Hủy" : "Cancel"}
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

/* =========================================================================
   6. CATEGORIES & BANNERS TAB
   ========================================================================= */
function CategoriesBannersTab({
  locale,
  showToast,
}: {
  locale: string;
  showToast: (msg: string, type?: "success" | "error") => void;
}) {
  const [categories, setCategories] = useState<any[]>([]);
  const [banners, setBanners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [newCat, setNewCat] = useState({ slug: "", vi: "", en: "" });
  const [newBanner, setNewBanner] = useState({
    title: "",
    imageUrl: "",
    href: "",
    sortOrder: 0,
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [catRes, banRes] = await Promise.all([
        fetch("/api/admin/categories"),
        fetch("/api/admin/banners"),
      ]);
      if (catRes.ok) {
        const d = await catRes.json();
        setCategories(d.categories || []);
      }
      if (banRes.ok) {
        const d = await banRes.json();
        setBanners(d.banners || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function createCategory(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch("/api/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newCat),
      });
      if (res.ok) {
        showToast(locale === "vi" ? "Đã thêm thể loại mới" : "Category created");
        setNewCat({ slug: "", vi: "", en: "" });
        loadData();
      } else {
        const err = await res.json();
        showToast(err.error || "Failed", "error");
      }
    } catch (e: any) {
      showToast(e.message, "error");
    }
  }

  async function deleteCategory(id: string) {
    if (!confirm(locale === "vi" ? "Xóa thể loại này?" : "Delete category?")) return;
    try {
      const res = await fetch(`/api/admin/categories/${id}`, { method: "DELETE" });
      if (res.ok) {
        showToast(locale === "vi" ? "Đã xóa thể loại" : "Category deleted");
        loadData();
      }
    } catch (e: any) {
      showToast(e.message, "error");
    }
  }

  async function createBanner(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch("/api/admin/banners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newBanner),
      });
      if (res.ok) {
        showToast(locale === "vi" ? "Đã thêm Banner mới" : "Banner created");
        setNewBanner({ title: "", imageUrl: "", href: "", sortOrder: 0 });
        loadData();
      } else {
        const err = await res.json();
        showToast(err.error || "Failed", "error");
      }
    } catch (e: any) {
      showToast(e.message, "error");
    }
  }

  async function deleteBanner(id: string) {
    if (!confirm(locale === "vi" ? "Xóa banner này?" : "Delete banner?")) return;
    try {
      const res = await fetch(`/api/admin/banners/${id}`, { method: "DELETE" });
      if (res.ok) {
        showToast(locale === "vi" ? "Đã xóa banner" : "Banner deleted");
        loadData();
      }
    } catch (e: any) {
      showToast(e.message, "error");
    }
  }

  return (
    <div className="admin-categories-banners-view">
      {/* Categories Management */}
      <div className="admin-card" style={{ marginBottom: "24px" }}>
        <div className="card-top">
          <div>
            <p className="eyebrow">{locale === "vi" ? "Phân loại truyện" : "Classification"}</p>
            <h3>{locale === "vi" ? "Danh mục Thể loại (Categories)" : "Genre Categories"}</h3>
          </div>
          <Layers className="metric-icon" />
        </div>

        {/* Categories List */}
        <div className="tags-container">
          {categories.map((c) => (
            <div key={c.id} className="category-chip">
              <strong>{c.vi || c.slug}</strong>
              <small>({c.en || c.slug})</small>
              <button
                className="chip-delete-btn"
                title="Delete"
                onClick={() => deleteCategory(c.id)}
              >
                <X />
              </button>
            </div>
          ))}
        </div>

        {/* Add Category Form */}
        <form onSubmit={createCategory} className="inline-add-form">
          <input
            placeholder="slug (e.g. sci-fi)"
            value={newCat.slug}
            onChange={(e) => setNewCat({ ...newCat, slug: e.target.value })}
            required
          />
          <input
            placeholder="Tên Tiếng Việt (e.g. Viễn Tưởng)"
            value={newCat.vi}
            onChange={(e) => setNewCat({ ...newCat, vi: e.target.value })}
            required
          />
          <input
            placeholder="English Name (e.g. Sci-Fi)"
            value={newCat.en}
            onChange={(e) => setNewCat({ ...newCat, en: e.target.value })}
            required
          />
          <button type="submit" className="primary-button add-btn">
            <Plus /> {locale === "vi" ? "Thêm Thể Loại" : "Add Category"}
          </button>
        </form>
      </div>

      {/* Banners Management */}
      <div className="admin-card">
        <div className="card-top">
          <div>
            <p className="eyebrow">{locale === "vi" ? "Trang chủ" : "Home Display"}</p>
            <h3>{locale === "vi" ? "Banner Quảng bá & Nổi bật" : "Home Banners"}</h3>
          </div>
          <ImageIcon className="metric-icon" />
        </div>

        {/* Banners Grid */}
        <div className="banners-grid">
          {banners.map((b) => (
            <div key={b.id} className="banner-item-card">
              <div className="banner-img-wrap">
                <RemoteImage src={b.imageUrl} alt={b.title} />
              </div>
              <div className="banner-item-body">
                <strong>{b.title}</strong>
                {b.href && <small>{b.href}</small>}
                <button
                  className="delete-icon-btn banner-del"
                  onClick={() => deleteBanner(b.id)}
                >
                  <Trash2 /> {locale === "vi" ? "Xóa" : "Delete"}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Add Banner Form */}
        <form onSubmit={createBanner} className="admin-form banner-add-form">
          <h4>{locale === "vi" ? "Thêm Banner mới" : "Add New Banner"}</h4>
          <div className="form-grid-3">
            <input
              placeholder={locale === "vi" ? "Tiêu đề banner" : "Banner title"}
              value={newBanner.title}
              onChange={(e) => setNewBanner({ ...newBanner, title: e.target.value })}
              required
            />
            <input
              placeholder="Image HTTPS URL"
              value={newBanner.imageUrl}
              onChange={(e) => setNewBanner({ ...newBanner, imageUrl: e.target.value })}
              required
            />
            <input
              placeholder="Link Href (optional)"
              value={newBanner.href}
              onChange={(e) => setNewBanner({ ...newBanner, href: e.target.value })}
            />
          </div>
          <button type="submit" className="primary-button add-btn">
            <Plus /> {locale === "vi" ? "Thêm Banner" : "Add Banner"}
          </button>
        </form>
      </div>
    </div>
  );
}
