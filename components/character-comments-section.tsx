"use client";

import { useState } from "react";
import Link from "next/link";
import { Star, ThumbsUp, User } from "lucide-react";
import { useSession } from "@/lib/auth-client";

export type CommentItem = {
  id: string;
  content: string;
  rating: number;
  likesCount: number;
  createdAt: Date | string;
  userName: string;
  userImage?: string | null;
  userRole?: string;
};

export function CharacterCommentsSection({
  characterSlug,
  initialComments = [],
  locale,
}: {
  characterSlug: string;
  characterName: string;
  initialComments?: CommentItem[];
  locale: string;
}) {
  const { data: session } = useSession();
  const [comments, setComments] = useState<CommentItem[]>(initialComments);
  const [newComment, setNewComment] = useState("");
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [likedComments, setLikedComments] = useState<Record<string, boolean>>({});
  const [sortOption, setSortOption] = useState<"newest" | "highest">("newest");
  const vi = locale === "vi";

  const handleLikeComment = (commentId: string) => {
    setLikedComments((prev) => {
      const currentlyLiked = prev[commentId];
      setComments((list) =>
        list.map((c) =>
          c.id === commentId
            ? { ...c, likesCount: currentlyLiked ? c.likesCount - 1 : c.likesCount + 1 }
            : c,
        ),
      );
      return { ...prev, [commentId]: !currentlyLiked };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/characters/${characterSlug}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newComment.trim(), rating }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.comment) {
          setComments((prev) => [data.comment, ...prev]);
          setNewComment("");
          setRating(5);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const sortedComments = [...comments].sort((a, b) => {
    if (sortOption === "highest") {
      return b.rating - a.rating;
    }
    return (
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  });

  return (
    <section id="comments-section" className="hub-comments-container">
      {/* Header */}
      <div className="comments-header-row">
        <div className="comments-title-wrap">
          <h3>{vi ? "Bình luận" : "Comments"}</h3>
          <span className="comments-badge">({comments.length})</span>
        </div>

        {/* Sort Tabs */}
        <div className="comments-sort-group">
          <button
            type="button"
            className={`sort-tab ${sortOption === "newest" ? "active" : ""}`}
            onClick={() => setSortOption("newest")}
          >
            {vi ? "Mới nhất" : "Newest"}
          </button>
          <button
            type="button"
            className={`sort-tab ${sortOption === "highest" ? "active" : ""}`}
            onClick={() => setSortOption("highest")}
          >
            {vi ? "Đánh giá cao" : "Top rated"}
          </button>
        </div>
      </div>

      {/* Comment Input Box */}
      <div className="comment-form-card">
        {session?.user ? (
          <form onSubmit={handleSubmit} className="comment-input-form">
            <div className="form-user-avatar">
              {session.user.image ? (
                <img src={session.user.image} alt={session.user.name} />
              ) : (
                <div className="avatar-placeholder">
                  <User />
                </div>
              )}
            </div>

            <div className="form-input-main">
              <div className="rating-select-row">
                <span className="rating-prompt">
                  {vi ? "Đánh giá:" : "Rating:"}
                </span>
                <div className="stars-input">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      className={`star-select-btn ${star <= (hoverRating ?? rating) ? "filled" : ""}`}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(null)}
                      onClick={() => setRating(star)}
                      aria-label={`Rate ${star} stars`}
                    >
                      <Star />
                    </button>
                  ))}
                  <span className="star-score">{hoverRating ?? rating}/5</span>
                </div>
              </div>

              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder={
                  vi
                    ? "Viết bình luận của bạn..."
                    : "Write your comment..."
                }
                rows={3}
                required
                className="comment-textarea"
              />

              <div className="form-footer-actions">
                <div />
                <button
                  type="submit"
                  disabled={isSubmitting || !newComment.trim()}
                  className="btn-submit-comment"
                >
                  {isSubmitting ? (vi ? "Đang gửi..." : "Posting...") : (vi ? "Gửi bình luận" : "Post")}
                </button>
              </div>
            </div>
          </form>
        ) : (
          <div className="comment-login-banner">
            <span>
              {vi
                ? "Đăng nhập để gửi bình luận và đánh giá."
                : "Sign in to post a review or comment."}
            </span>
            <Link href={`/${locale}/auth`} className="btn-login-to-comment">
              {vi ? "Đăng nhập" : "Sign in"}
            </Link>
          </div>
        )}
      </div>

      {/* Comments List */}
      <div className="comments-list-wrapper">
        {sortedComments.length === 0 ? (
          <div className="no-comments-box">
            <p>{vi ? "Chưa có bình luận nào." : "No comments yet."}</p>
          </div>
        ) : (
          sortedComments.map((comment) => {
            const isLiked = !!likedComments[comment.id];
            const dateStr = new Date(comment.createdAt).toLocaleDateString(
              locale === "vi" ? "vi-VN" : "en-US",
              { year: "numeric", month: "short", day: "numeric" },
            );

            return (
              <div key={comment.id} className="comment-item-card">
                <div className="comment-author-avatar">
                  {comment.userImage ? (
                    <img src={comment.userImage} alt={comment.userName} />
                  ) : (
                    <div className="avatar-placeholder">
                      {comment.userName.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>

                <div className="comment-content-main">
                  <div className="comment-meta-header">
                    <div className="author-name-group">
                      <strong className="author-name">{comment.userName}</strong>
                      {comment.userRole === "admin" && (
                        <span className="role-tag admin">Admin</span>
                      )}
                      {comment.userRole === "creator" && (
                        <span className="role-tag creator">Creator</span>
                      )}
                      <span className="comment-date">{dateStr}</span>
                    </div>

                    <div className="comment-stars">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          className={`star-mini ${s <= comment.rating ? "filled" : ""}`}
                        />
                      ))}
                    </div>
                  </div>

                  <p className="comment-body-text">{comment.content}</p>

                  <div className="comment-action-bar">
                    <button
                      type="button"
                      className={`btn-like-comment ${isLiked ? "liked" : ""}`}
                      onClick={() => handleLikeComment(comment.id)}
                    >
                      <ThumbsUp />
                      <span>{comment.likesCount > 0 ? comment.likesCount : (vi ? "Thích" : "Like")}</span>
                    </button>

                    <button
                      type="button"
                      className="btn-reply-comment"
                      onClick={() => {
                        setNewComment(`@${comment.userName} `);
                        const textarea = document.querySelector(".comment-textarea") as HTMLTextAreaElement;
                        textarea?.focus();
                      }}
                    >
                      {vi ? "Trả lời" : "Reply"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
