"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";

export type ScenarioItem = {
  id: string;
  sortOrder: number;
  translation?: {
    title: string;
    description: string;
    location: string;
    time: string;
    userRole: string;
    relationship: string;
    goal: string;
    openingMessage: string;
  };
};

export function CharacterScenariosList({
  characterSlug,
  scenarios,
  locale,
}: {
  characterSlug: string;
  scenarios: ScenarioItem[];
  locale: string;
}) {
  const vi = locale === "vi";
  const [filterSearch, setFilterSearch] = useState("");

  const filteredScenarios = scenarios.filter((sc) => {
    if (!filterSearch) return true;
    const title = sc.translation?.title || "";
    const desc = sc.translation?.description || "";
    return (
      title.toLowerCase().includes(filterSearch.toLowerCase()) ||
      desc.toLowerCase().includes(filterSearch.toLowerCase())
    );
  });

  const firstScenario = scenarios[0];
  const lastScenario = scenarios[scenarios.length - 1];

  return (
    <section id="scenarios-section" className="hub-scenarios-container">
      <div className="scenarios-header-bar">
        <div className="scenarios-title-wrap">
          <h2>{vi ? "Kịch bản nhập vai" : "Scenarios"}</h2>
          <span className="scenario-count-badge">{scenarios.length}</span>
        </div>

        {/* Quick Jump Tabs */}
        <div className="scenarios-quick-links">
          {firstScenario && (
            <Link
              href={`/${locale}/characters/${characterSlug}/chat?scenarioId=${firstScenario.id}`}
              className="quick-jump-btn"
            >
              <span>{vi ? "Kịch bản đầu" : "First arc"}</span>
            </Link>
          )}

          {lastScenario && lastScenario.id !== firstScenario?.id && (
            <Link
              href={`/${locale}/characters/${characterSlug}/chat?scenarioId=${lastScenario.id}`}
              className="quick-jump-btn"
            >
              <span>{vi ? "Kịch bản mới nhất" : "Latest arc"}</span>
            </Link>
          )}

          <Link
            href={`/${locale}/characters/${characterSlug}/chat?scenarioId=custom`}
            className="quick-jump-btn custom"
          >
            <span>{vi ? "Tạo bối cảnh riêng" : "Custom scenario"}</span>
          </Link>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="scenarios-filter-row">
        <input
          type="text"
          placeholder={
            vi
              ? "Tìm kịch bản, địa điểm, cốt truyện..."
              : "Search scenarios..."
          }
          value={filterSearch}
          onChange={(e) => setFilterSearch(e.target.value)}
          className="scenario-search-input"
        />
      </div>

      {/* Scenarios Table / List */}
      <div className="scenarios-table-wrapper">
        <div className="scenarios-list-grid">
          {filteredScenarios.map((scenario, index) => {
            const tr = scenario.translation;
            if (!tr) return null;

            return (
              <Link
                key={scenario.id}
                href={`/${locale}/characters/${characterSlug}/chat?scenarioId=${scenario.id}`}
                className="scenario-chapter-card"
              >
                {/* Index / Number Badge */}
                <div className="chapter-number-badge">
                  <span>#{index + 1}</span>
                </div>

                {/* Main Info */}
                <div className="chapter-main-info">
                  <h4 className="chapter-title">{tr.title}</h4>
                  <p className="chapter-desc">{tr.description}</p>

                  {/* Badges */}
                  <div className="chapter-badges-row">
                    {tr.location && (
                      <span className="chapter-tag">{tr.location}</span>
                    )}
                    {tr.userRole && (
                      <span className="chapter-tag">{tr.userRole}</span>
                    )}
                    {tr.time && (
                      <span className="chapter-tag">{tr.time}</span>
                    )}
                  </div>
                </div>

                {/* Action */}
                <div className="chapter-action-box">
                  <span className="btn-play-scenario">
                    {vi ? "Nhập vai" : "Start"}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Custom Scenario Option */}
        <Link
          href={`/${locale}/characters/${characterSlug}/chat?scenarioId=custom`}
          className="custom-scenario-banner-card"
        >
          <div className="custom-banner-text">
            <h4>
              {vi
                ? "Tự tạo bối cảnh của riêng bạn"
                : "Create a custom scenario"}
            </h4>
            <p>
              {vi
                ? "Tùy biến địa điểm, thời gian, vai trò và lời thoại mở đầu theo ý bạn."
                : "Customize location, setting, roles, and unique opening hook."}
            </p>
          </div>
          <span className="btn-create-custom-scenario">
            <Plus />
            <span>{vi ? "Thiết lập bối cảnh" : "Create"}</span>
          </span>
        </Link>
      </div>
    </section>
  );
}
