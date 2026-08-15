"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  LogIn,
  Menu,
  MessageSquare,
  Search,
  Shield,
  Sparkles,
  UserRound,
  X,
} from "lucide-react";
import { useSession } from "@/lib/auth-client";
import { ThemeToggle } from "./theme-toggle";

export function Header({ locale }: { locale: string }) {
  const { data } = useSession();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const role = (data?.user as ({ role?: string } & NonNullable<typeof data>["user"]) | undefined)?.role;
  const vi = locale === "vi";

  function closeMenu() {
    setMobileMenuOpen(false);
  }

  const isHome = pathname === `/${locale}` || pathname === `/${locale}/`;
  const isChats =
    pathname.startsWith(`/${locale}/chat`) ||
    (pathname.startsWith(`/${locale}/characters/`) && pathname.endsWith("/chat"));
  const isCreator = pathname.startsWith(`/${locale}/creator`);
  const isAdmin = pathname.startsWith(`/${locale}/admin`);

  return (
    <header className="site-header">
      <div className="header-inner">
        <Link className="brand" href={`/${locale}`} onClick={closeMenu}>
          <span className="brand-mark">L</span>
          <span>Lorelia</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="desktop-nav">
          <Link href={`/${locale}`} className={isHome ? "active" : ""}>
            <BookOpen />
            {vi ? "Khám phá" : "Discover"}
          </Link>
          {data && (
            <Link href={`/${locale}/chat`} className={isChats ? "active" : ""}>
              <MessageSquare />
              {vi ? "Hội thoại" : "Chats"}
            </Link>
          )}
          <Link href={`/${locale}/creator`} className={isCreator ? "active" : ""}>
            <Sparkles />
            Creator
          </Link>
          {role === "admin" && (
            <Link href={`/${locale}/admin`} className={isAdmin ? "active" : ""}>
              <Shield />
              Admin
            </Link>
          )}
        </nav>

        {/* Header Actions */}
        <div className="header-actions">
          <Link className="icon-button" href={`/${locale}?search=1`} aria-label="Search" onClick={closeMenu}>
            <Search />
          </Link>
          <ThemeToggle />

          {data ? (
            <Link className="avatar-button" href={`/${locale}/settings`} onClick={closeMenu}>
              <UserRound />
              <span>{data.user.name}</span>
            </Link>
          ) : (
            <Link className="login-button" href={`/${locale}/auth`} onClick={closeMenu}>
              <LogIn />
              <span>{vi ? "Đăng nhập" : "Sign in"}</span>
            </Link>
          )}

          {/* Mobile Hamburger Toggle */}
          <button
            type="button"
            className="mobile-menu-toggle"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
          >
            {mobileMenuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="mobile-nav-backdrop" onClick={closeMenu}>
          <div className="mobile-nav-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="mobile-nav-header">
              <Link className="brand" href={`/${locale}`} onClick={closeMenu}>
                <span className="brand-mark">L</span>
                <span>Lorelia</span>
              </Link>
              <button className="icon-button" onClick={closeMenu} aria-label="Close">
                <X />
              </button>
            </div>

            <nav className="mobile-nav-links">
              <Link href={`/${locale}`} className={isHome ? "active" : ""} onClick={closeMenu}>
                <BookOpen />
                <span>{vi ? "Khám phá nhân vật" : "Discover Characters"}</span>
              </Link>
              {data && (
                <Link href={`/${locale}/chat`} className={isChats ? "active" : ""} onClick={closeMenu}>
                  <MessageSquare />
                  <span>{vi ? "Hội thoại của tôi" : "My Conversations"}</span>
                </Link>
              )}
              <Link href={`/${locale}/creator`} className={isCreator ? "active" : ""} onClick={closeMenu}>
                <Sparkles />
                <span>{vi ? "Sáng tạo nhân vật (Creator)" : "Creator Studio"}</span>
              </Link>
              {role === "admin" && (
                <Link href={`/${locale}/admin`} className={isAdmin ? "active" : ""} onClick={closeMenu}>
                  <Shield />
                  <span>{vi ? "Trung tâm Quản trị" : "Admin Center"}</span>
                </Link>
              )}
              {data ? (
                <Link href={`/${locale}/settings`} onClick={closeMenu}>
                  <UserRound />
                  <span>{vi ? "Cài đặt & Gói cước" : "Settings & Plan"}</span>
                </Link>
              ) : (
                <Link href={`/${locale}/auth`} onClick={closeMenu}>
                  <LogIn />
                  <span>{vi ? "Đăng nhập / Đăng ký" : "Sign in / Register"}</span>
                </Link>
              )}
            </nav>
          </div>
        </div>
      )}
    </header>
  );
}
