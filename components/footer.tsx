"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "@/lib/auth-client";

export function Footer({ locale }: { locale: string }) {
  const { data } = useSession();
  const pathname = usePathname();
  const vi = locale === "vi";
  const role = (data?.user as ({ role?: string } & NonNullable<typeof data>["user"]) | undefined)?.role;

  if (
    pathname.startsWith(`/${locale}/characters/`) &&
    pathname.endsWith("/chat")
  ) {
    return null;
  }

  return (
    <footer className="site-footer">
      <div className="footer-container">
        {/* Main Footer Columns */}
        <div className="footer-grid">
          {/* Brand Info Column */}
          <div className="footer-brand-column">
            <Link className="footer-brand" href={`/${locale}`}>
              <span className="brand-mark">L</span>
              <span className="brand-name">Lorelia</span>
            </Link>
            <p className="footer-desc">
              {vi
                ? "Nền tảng tương tác và nhập vai AI với các nhân vật manga, anime và cốt truyện hư cấu phong phú."
                : "Interactive AI roleplay and storytelling platform with beloved manga, anime, and fictional characters."}
            </p>
            <p className="footer-disclaimer">
              {vi
                ? "Các cuộc đối thoại và nội dung do AI tạo ra hoàn toàn là hư cấu và phục vụ mục đích giải trí sáng tạo."
                : "All dialogues and AI interactions are purely fictional and intended for creative entertainment."}
            </p>
          </div>

          {/* Navigation Column 1: Discover */}
          <div className="footer-links-column">
            <h4>{vi ? "Khám phá" : "Explore"}</h4>
            <ul>
              <li>
                <Link href={`/${locale}`}>
                  {vi ? "Danh mục nhân vật" : "Character Directory"}
                </Link>
              </li>
              <li>
                <Link href={`/${locale}?filter=trending`}>
                  {vi ? "Nhân vật thịnh hành" : "Trending Characters"}
                </Link>
              </li>
              <li>
                <Link href={`/${locale}?filter=newest`}>
                  {vi ? "Mới phát hành" : "New Releases"}
                </Link>
              </li>
              {data && (
                <li>
                  <Link href={`/${locale}/chat`}>
                    {vi ? "Lịch sử hội thoại" : "My Conversations"}
                  </Link>
                </li>
              )}
            </ul>
          </div>

          {/* Navigation Column 2: Creators & Tools */}
          <div className="footer-links-column">
            <h4>{vi ? "Sáng tạo" : "Creators"}</h4>
            <ul>
              <li>
                <Link href={`/${locale}/creator`}>
                  {vi ? "Tạo nhân vật mới" : "Create Character"}
                </Link>
              </li>
              <li>
                <Link href={`/${locale}/creator`}>
                  {vi ? "Thiết lập kịch bản & persona" : "Scenario & Persona"}
                </Link>
              </li>
              <li>
                <Link href={`/${locale}/settings`}>
                  {vi ? "Cài đặt API Key cá nhân" : "Custom API Key"}
                </Link>
              </li>
              {role === "admin" && (
                <li>
                  <Link href={`/${locale}/admin`}>
                    {vi ? "Trang quản trị Admin" : "Admin Portal"}
                  </Link>
                </li>
              )}
            </ul>
          </div>

          {/* Navigation Column 3: Account & Policy */}
          <div className="footer-links-column">
            <h4>{vi ? "Tài khoản & Điều khoản" : "Account & Terms"}</h4>
            <ul>
              {data ? (
                <>
                  <li>
                    <Link href={`/${locale}/chat`}>
                      {vi ? "Hội thoại của tôi" : "My Chats"}
                    </Link>
                  </li>
                  <li>
                    <Link href={`/${locale}/settings`}>
                      {vi ? "Cài đặt tài khoản" : "Account Settings"}
                    </Link>
                  </li>
                </>
              ) : (
                <>
                  <li>
                    <Link href={`/${locale}/auth`}>
                      {vi ? "Đăng nhập / Đăng ký" : "Sign In / Register"}
                    </Link>
                  </li>
                </>
              )}
              <li>
                <Link href={`/${locale}`}>
                  {vi ? "Tiêu chuẩn cộng đồng" : "Community Guidelines"}
                </Link>
              </li>
              <li>
                <Link href={`/${locale}`}>
                  {vi ? "Chính sách bảo mật" : "Privacy Policy"}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="footer-bottom-bar">
          <p className="copyright-text">
            &copy; {new Date().getFullYear()} Lorelia. {vi ? "Tất cả quyền được bảo lưu." : "All rights reserved."}
          </p>
          <div className="footer-locale-links">
            <span className="platform-tag">Lorelia AI Engine</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
