import React from "react";

interface RatingDisplayProps {
  /** 評分星數 */
  stars: number;
  /** 評分人數 */
  count: number;
}

/**
 * 用於顯示評分統計的組件
 * 顯示平均星數和評分人數
 */
export default function RatingDisplay({
  stars,
  count,
}: RatingDisplayProps) {
  const validStars = Math.min(Math.max(stars, 0), 5);
  const filledStars = Math.round(validStars);

  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <span
            key={star}
            className={`text-lg ${
              star <= filledStars ? "text-yellow-400" : "text-gray-300"
            }`}
          >
            ★
          </span>
        ))}
      </div>
      <span className="text-sm text-gray-600">
        {validStars.toFixed(1)} ({count} 評分)
      </span>
    </div>
  );
}
