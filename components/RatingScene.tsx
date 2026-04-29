/**
 * 星級評分集成示例
 * 
 * 此文件展示如何在實際應用中整合 StarRating 組件
 * 適用於老師評分和報告組代表評分的場景
 */

import React from "react";
import StarRating from "@/components/StarRating";
import RatingDisplay from "@/components/RatingDisplay";

interface RatingSceneProps {
  /** 場景類型 */
  sceneType: "teacher" | "group_representative";
  /** 會話 ID */
  sessionId: number;
  /** 答題 ID（該生的這次回答）*/
  answerId: number;
  /** 被評分者的 ID */
  answererUserId: number;
  /** 被評分者名稱 */
  answererName: string;
  /** 被評分者所屬組別 ID */
  answererGroupId?: number;
  /** 當前使用者 ID */
  currentUserId: number;
  /** 當前使用者名稱 */
  currentUserName: string;
  /** 當前使用者所屬組別 ID (報告組代表用) */
  currentUserGroupId?: number;
  /** 已有的評分統計 */
  existingRating?: {
    averageStars: number;
    ratingCount: number;
  };
  /** 評分提交後的回調 */
  onRatingSubmitted?: () => void;
}

export default function RatingScene({
  sceneType,
  sessionId,
  answerId,
  answererUserId,
  answererName,
  answererGroupId,
  currentUserId,
  currentUserName,
  currentUserGroupId,
  existingRating,
  onRatingSubmitted,
}: RatingSceneProps) {
  const roleLabel =
    sceneType === "teacher" ? "老師" : "報告組代表";

  return (
    <div className="flex flex-col gap-4 p-4 border border-gray-200 rounded-lg bg-gray-50">
      {/* 標題和使用者資訊 */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900">
          {sceneType === "teacher"
            ? "老師評分"
            : "報告組評分"}
        </h3>
        <div className="mt-2 text-sm text-gray-600 space-y-1">
          <p>
            <span className="font-medium">評分者：</span>
            {currentUserName} ({roleLabel})
          </p>
          <p>
            <span className="font-medium">被評分者：</span>
            {answererName}
          </p>
          <p>
            <span className="font-medium">評分內容：</span>
            發言品質
          </p>
        </div>
      </div>

      {/* 現有評分顯示 */}
      {existingRating && existingRating.ratingCount > 0 && (
        <div className="bg-white p-3 rounded border border-gray-100">
          <p className="text-sm font-medium text-gray-700 mb-2">
            目前評分
          </p>
          <RatingDisplay
            stars={existingRating.averageStars}
            count={existingRating.ratingCount}
          />
        </div>
      )}

      {/* 星級評分組件 */}
      <div className="bg-white p-4 rounded border border-gray-200">
        <p className="text-sm font-medium text-gray-700 mb-3">
          {sceneType === "teacher"
            ? "請給予此回答 1-5 顆星"
            : "請給予此回答 1-5 顆星（同組成員無法評分）"}
        </p>
        <StarRating
          sessionId={sessionId}
          answerId={answerId}
          currentUserId={currentUserId}
          userRole={sceneType}
          answererUserId={answererUserId}
          userGroupId={currentUserGroupId}
          answererGroupId={answererGroupId}
          onSubmit={() => {
            onRatingSubmitted?.();
          }}
        />
      </div>

      {/* 使用者故事說明 */}
      <div className="bg-blue-50 p-3 rounded border border-blue-200 text-sm text-blue-900">
        {sceneType === "teacher" ? (
          <div>
            <p className="font-semibold">✓ US 3.1: 老師-星級直覺給分</p>
            <ul className="mt-2 list-disc list-inside space-y-1">
              <li>點選星級即送出，無需額外確認</li>
              <li>送出後顯示「已送出」氣泡提示</li>
              <li>快速完成評分，不干擾課堂互動</li>
            </ul>
          </div>
        ) : (
          <div>
            <p className="font-semibold">✓ US 3.2: 報告組-星級直覺給分</p>
            <ul className="mt-2 list-disc list-inside space-y-1">
              <li>同組成員無法評分（前端隱藏，後端防護）</li>
              <li>點選星級即送出，無需額外確認</li>
              <li>送出後顯示「已送出」氣泡提示</li>
              <li>防止自我給分，維護評分公正性</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
