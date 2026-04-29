"use client";

import React, { useState } from "react";
import RatingScene from "@/components/RatingScene";

export default function RatingDemoPage() {
  const [activeTab, setActiveTab] = useState<"teacher" | "group">("teacher");

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-4xl mx-auto">
        {/* 標題 */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            ⭐ 星級評分系統演示
          </h1>
          <p className="text-gray-600 text-lg">
            包含 US 3.1 (老師評分) 和 US 3.2 (報告組評分)
          </p>
        </div>

        {/* 功能說明 */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-blue-500">
            <h3 className="text-xl font-bold text-blue-900 mb-3">
              📌 US 3.1: 老師-星級直覺給分
            </h3>
            <ul className="space-y-2 text-gray-700 text-sm">
              <li>✓ 老師可為任何學生發言打分</li>
              <li>✓ 點選星級即送出（無需確定按鈕）</li>
              <li>✓ 送出後顯示「已送出」氣泡</li>
              <li>✓ 不干擾課堂互動流暢度</li>
            </ul>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-green-500">
            <h3 className="text-xl font-bold text-green-900 mb-3">
              📌 US 3.2: 報告組-星級直覺給分
            </h3>
            <ul className="space-y-2 text-gray-700 text-sm">
              <li>✓ 報告組代表為其他組別打分</li>
              <li>✓ 防弊機制：前端隱藏同組選項</li>
              <li>✓ 後端驗證：若收到請求則報錯</li>
              <li>✓ 保證評分公正性和安全性</li>
            </ul>
          </div>
        </div>

        {/* 頁籤切換 */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="flex border-b">
            <button
              onClick={() => setActiveTab("teacher")}
              className={`flex-1 py-4 px-6 text-center font-semibold transition-all ${
                activeTab === "teacher"
                  ? "bg-blue-500 text-white"
                  : "bg-gray-50 text-gray-700 hover:bg-gray-100"
              }`}
            >
              👨‍🏫 老師評分演示
            </button>
            <button
              onClick={() => setActiveTab("group")}
              className={`flex-1 py-4 px-6 text-center font-semibold transition-all ${
                activeTab === "group"
                  ? "bg-green-500 text-white"
                  : "bg-gray-50 text-gray-700 hover:bg-gray-100"
              }`}
            >
              👥 報告組評分演示
            </button>
          </div>

          <div className="p-8">
            {/* 老師評分演示 */}
            {activeTab === "teacher" && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  老師評分流程
                </h2>
                <RatingScene
                  sceneType="teacher"
                  sessionId={1}
                  answerId={5}
                  answererUserId={200}
                  answererName="李同學"
                  currentUserId={100}
                  currentUserName="王老師"
                  existingRating={{
                    averageStars: 4.2,
                    ratingCount: 5,
                  }}
                  onRatingSubmitted={() => {
                    console.log("老師評分已提交");
                  }}
                />

                {/* 技術細節 */}
                <div className="mt-8 bg-gray-50 p-6 rounded-lg border border-gray-200">
                  <h4 className="font-bold text-gray-900 mb-3">
                    🔧 技術實現
                  </h4>
                  <pre className="bg-gray-900 text-gray-100 p-4 rounded text-xs overflow-x-auto">
{`// 老師可以給任何人評分
<StarRating
  sessionId={1}
  answerId={5}
  currentUserId={100}
  userRole="teacher"
  answererUserId={200}
  onSubmit={(rating) => {
    console.log(\`老師給了 \${rating} 顆星\`);
  }}
/>`}
                  </pre>
                </div>
              </div>
            )}

            {/* 報告組評分演示 */}
            {activeTab === "group" && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  報告組評分流程（防弊機制）
                </h2>

                {/* 場景 1：可以評分 */}
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">
                    📍 場景 1：可以評分（不同組別）
                  </h3>
                  <RatingScene
                    sceneType="group_representative"
                    sessionId={1}
                    answerId={5}
                    answererUserId={200}
                    answererName="李同學 (B組)"
                    answererGroupId={11}
                    currentUserId={300}
                    currentUserName="陳組長 (A組)"
                    currentUserGroupId={10}
                    existingRating={{
                      averageStars: 3.8,
                      ratingCount: 3,
                    }}
                    onRatingSubmitted={() => {
                      console.log("組長評分已提交");
                    }}
                  />
                </div>

                {/* 場景 2：無法評分 */}
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">
                    🚫 場景 2：無法評分（同組別）
                  </h3>
                  <RatingScene
                    sceneType="group_representative"
                    sessionId={1}
                    answerId={6}
                    answererUserId={201}
                    answererName="劉同學 (A組)"
                    answererGroupId={10}
                    currentUserId={300}
                    currentUserName="陳組長 (A組)"
                    currentUserGroupId={10}
                  />
                  <p className="mt-2 text-sm text-gray-600">
                    💡 提示：同組成員無法互相評分，星星呈現灰色且無法點擊。
                  </p>
                </div>

                {/* 技術細節 */}
                <div className="mt-8 bg-gray-50 p-6 rounded-lg border border-gray-200">
                  <h4 className="font-bold text-gray-900 mb-3">
                    🔧 技術實現 - 防弊機制
                  </h4>
                  <pre className="bg-gray-900 text-gray-100 p-4 rounded text-xs overflow-x-auto">
{`// 前端防護：同組檢測
const isDisabled = userGroupId === answererGroupId;

// 如果禁用，顯示灰色星星和提示信息
if (isDisabled) {
  return <div>無法對自己評分</div>;
}

// 後端防護 (POST /api/ratings/submit)
if (source === "group_representative") {
  const raterGroup = await getRaterGroup(raterAccountId);
  const answererGroup = await getAnswererGroup(answererAccountId);
  
  if (raterGroup === answererGroup) {
    return 403 "無法對同組成員或自己評分";
  }
}`}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 功能特點 */}
        <div className="mt-8 bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            ✨ 核心特性
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="flex gap-4">
              <span className="text-2xl">⚡</span>
              <div>
                <h3 className="font-bold text-gray-900">極簡操作</h3>
                <p className="text-gray-600 text-sm">
                  點選星級即送出，無需額外確定按鈕
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <span className="text-2xl">💬</span>
              <div>
                <h3 className="font-bold text-gray-900">即時反饋</h3>
                <p className="text-gray-600 text-sm">
                  「✓ 已送出」綠色氣泡 2.5 秒後消失
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <span className="text-2xl">🔒</span>
              <div>
                <h3 className="font-bold text-gray-900">防弊機制</h3>
                <p className="text-gray-600 text-sm">
                  前端隱藏 + 後端驗證雙重防護
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <span className="text-2xl">♿</span>
              <div>
                <h3 className="font-bold text-gray-900">無障礙設計</h3>
                <p className="text-gray-600 text-sm">
                  鍵盤導航、ARIA labels、動畫支持
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 頁腳 */}
        <div className="mt-12 text-center text-gray-600 text-sm">
          <p>
            📖 詳見{" "}
            <code className="bg-gray-200 px-2 py-1 rounded">
              STAR_RATING_IMPLEMENTATION.md
            </code>
          </p>
        </div>
      </div>
    </div>
  );
}
