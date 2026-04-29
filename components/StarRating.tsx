"use client";

import React, { useState, useEffect } from "react";
import styles from "./StarRating.module.css";

interface StarRatingProps {
  /** 會話 ID */
  sessionId: number;
  /** 答題者 ID（被評分者）*/
  answerId: number;
  /** 當前使用者 ID（評分者）*/
  currentUserId: number;
  /** 當前使用者的角色 ('teacher' | 'group_representative') */
  userRole: "teacher" | "group_representative";
  /** 被評分者的 ID（用於防止自評）*/
  answererUserId: number;
  /** 當前使用者所屬的組別 ID (如果是報告組代表) */
  userGroupId?: number;
  /** 被評分者所屬的組別 ID (如果是報告組評分) */
  answererGroupId?: number;
  /** 提交回調 */
  onSubmit?: (rating: number) => void;
}

export default function StarRating({
  sessionId,
  answerId,
  currentUserId,
  userRole,
  answererUserId,
  userGroupId,
  answererGroupId,
  onSubmit,
}: StarRatingProps) {
  const [rating, setRating] = useState<number | null>(null);
  const [hoveredRating, setHoveredRating] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 檢查是否允許評分
  const isDisabled = (() => {
    if (userRole === "teacher") {
      return false; // 老師可以評分任何人
    }
    // 報告組代表不能對自己評分
    if (userRole === "group_representative") {
      return userGroupId === answererGroupId;
    }
    return true;
  })();

  const handleStarClick = async (star: number) => {
    if (isDisabled || isLoading) return;

    setRating(star);
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/ratings/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId,
          answerId,
          raterAccountId: currentUserId,
          star,
          source: userRole === "teacher" ? "teacher" : "group_representative",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "評分失敗，請稍後重試");
      }

      const data = await response.json();

      // 顯示成功提示
      setSubmitted(true);
      onSubmit?.(star);

      // 2.5 秒後消失提示
      setTimeout(() => {
        setSubmitted(false);
      }, 2500);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "未知錯誤";
      setError(errorMessage);
      console.error("星級評分提交失敗:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // 如果禁用，顯示灰掉的星星
  if (isDisabled) {
    return (
      <div className={styles.starContainer}>
        <div className={styles.starRatingDisabled} title="無法對自己評分">
          {[1, 2, 3, 4, 5].map((star) => (
            <span key={star} className={`${styles.star} ${styles.disabled}`}>
              ★
            </span>
          ))}
        </div>
        <p className={styles.disabledMessage}>無法對自己評分</p>
      </div>
    );
  }

  return (
    <div className={styles.starContainer}>
      <div className={styles.starRating}>
        {[1, 2, 3, 4, 5].map((star) => {
          const isFilled =
            (hoveredRating && star <= hoveredRating) ||
            (!hoveredRating && rating && star <= rating);

          return (
            <button
              key={star}
              className={`${styles.star} ${isFilled ? styles.filled : ""} ${
                isLoading ? styles.loading : ""
              }`}
              onClick={() => handleStarClick(star)}
              onMouseEnter={() => !isLoading && setHoveredRating(star)}
              onMouseLeave={() => setHoveredRating(null)}
              disabled={isLoading}
              title={`給予 ${star} 顆星`}
              aria-label={`給予 ${star} 顆星`}
            >
              ★
            </button>
          );
        })}
      </div>

      {/* 提交成功提示氣泡 */}
      {submitted && (
        <div className={styles.successBubble}>
          <span className={styles.checkmark}>✓</span>
          <span>已送出</span>
        </div>
      )}

      {/* 錯誤提示 */}
      {error && (
        <div className={styles.errorMessage}>
          <span>⚠️</span> {error}
        </div>
      )}

      {/* 載入中狀態 */}
      {isLoading && (
        <div className={styles.loadingMessage}>提交中...</div>
      )}
    </div>
  );
}
