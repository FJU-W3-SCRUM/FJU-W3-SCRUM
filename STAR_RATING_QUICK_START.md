# ⭐ 星級評分快速開始指南

## 🚀 5 分鐘快速上手

### 1️⃣ 查看演示

```bash
npm run dev
# 開啟 http://localhost:3000/rating-demo
```

演示頁面包含：
- ✅ 老師評分場景
- ✅ 報告組評分場景（包括防弊機制）
- ✅ 即時互動體驗

---

### 2️⃣ 在你的頁面中使用

**基本用法 - 老師評分：**

```tsx
import StarRating from "@/components/StarRating";

export default function GradePage() {
  return (
    <StarRating
      sessionId={1}
      answerId={5}
      currentUserId={100}      // 老師 ID
      userRole="teacher"
      answererUserId={200}     // 學生 ID
    />
  );
}
```

**進階用法 - 報告組評分：**

```tsx
import StarRating from "@/components/StarRating";

export default function GroupGradePage() {
  return (
    <StarRating
      sessionId={1}
      answerId={5}
      currentUserId={300}           // 組長 ID
      userRole="group_representative"
      answererUserId={200}
      userGroupId={10}              // 組長所屬組別
      answererGroupId={11}          // 被評分者所屬組別
      onSubmit={(rating) => {
        console.log(`給了 ${rating} 顆星`);
      }}
    />
  );
}
```

---

### 3️⃣ 後端 API 調用

星級評分組件會自動調用 `/api/ratings/submit`：

```javascript
POST /api/ratings/submit

{
  "sessionId": 1,
  "answerId": 5,
  "raterAccountId": 100,
  "star": 5,
  "source": "teacher"  // 或 "group_representative"
}
```

✅ 成功 (201):
```json
{
  "success": true,
  "message": "評分已送出",
  "rating": { /* 完整評分紀錄 */ }
}
```

❌ 錯誤 (403):
```json
{
  "error": "無法對同組成員或自己評分"
}
```

---

## 🎯 使用場景

### 場景 1：課堂上老師即時評分

```tsx
// pages/classroom/[classId]/sessions/[sessionId].tsx
export default function ClassroomPage({ classId, sessionId }) {
  return (
    <div>
      <h1>課堂互動</h1>
      {/* 學生的答題列表 */}
      {answers.map((answer) => (
        <div key={answer.id} className="mb-4">
          <p>{answer.studentName}: {answer.content}</p>
          <StarRating
            sessionId={sessionId}
            answerId={answer.id}
            currentUserId={currentTeacherId}
            userRole="teacher"
            answererUserId={answer.studentId}
          />
        </div>
      ))}
    </div>
  );
}
```

### 場景 2：分組報告評分

```tsx
// pages/reports/[sessionId].tsx
export default function GroupReportPage({ sessionId }) {
  const [currentUserGroup, setCurrentUserGroup] = useState(null);
  
  return (
    <div>
      <h1>報告評分</h1>
      {/* 其他組別的報告 */}
      {otherGroups.map((group) => (
        <div key={group.id} className="mb-6">
          <h2>{group.name}</h2>
          {group.answers.map((answer) => (
            <StarRating
              key={answer.id}
              sessionId={sessionId}
              answerId={answer.id}
              currentUserId={currentGroupLeaderId}
              userRole="group_representative"
              answererUserId={answer.studentId}
              userGroupId={currentUserGroup?.id}
              answererGroupId={group.id}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
```

---

## 📊 顯示評分統計

使用 `RatingDisplay` 組件顯示已有的評分：

```tsx
import RatingDisplay from "@/components/RatingDisplay";

export default function AnswerCard({ answer, averageRating, ratingCount }) {
  return (
    <div>
      <p>{answer.content}</p>
      {/* 顯示平均評分 */}
      <RatingDisplay
        stars={averageRating}
        count={ratingCount}
      />
    </div>
  );
}
```

效果：
```
★ ★ ★ ★ ☆ 4.2 (15 評分)
```

---

## 🔧 自訂樣式

### 修改顏色

編輯 `components/StarRating.module.css`：

```css
/* 更改星色 */
.star.filled {
  color: #ff6b6b;  /* 改成紅色 */
}

/* 更改大小 */
.star {
  font-size: 3rem;  /* 變大 */
}

/* 更改氣泡顏色 */
.successBubble {
  background: #a78bfa;  /* 紫色 */
}
```

---

## ❓ 常見問題

### Q: 為什麼老師和學生都看不到評分按鈕？
**A:** 檢查：
- ✅ `NEXT_PUBLIC_SUPABASE_URL` 和 `NEXT_PUBLIC_SUPABASE_ANON_KEY` 已設置
- ✅ Supabase `ratings` 表已建立
- ✅ 組件中 `userRole` 值正確

### Q: 報告組無法評分，總是顯示「無法對自己評分」？
**A:** 檢查：
- ✅ `userGroupId` 和 `answererGroupId` 值正確且不相同
- ✅ `group_members` 表中有正確的組別信息
- ✅ 後端無 RLS 或 RLS 策略已正確配置

### Q: 點選星級後沒有反應？
**A:** 檢查：
- ✅ 瀏覽器控制台是否有錯誤信息
- ✅ 網路連接是否正常
- ✅ `/api/ratings/submit` 端點是否可訪問

### Q: 評分後"已送出"氣泡消失太快？
**A:** 在 `components/StarRating.module.css` 中修改：

```css
/* 從 2.5 秒改成 5 秒 */
@keyframes slideOut {
  /* 改這裡 */
  from { ... }
  to { ... }
}
```

並在 `components/StarRating.tsx` 中：

```tsx
// 從 2500 改成 5000 毫秒
setTimeout(() => {
  setSubmitted(false);
}, 5000);  // 改這裡
```

---

## 📚 完整文檔

詳見 [`STAR_RATING_IMPLEMENTATION.md`](./STAR_RATING_IMPLEMENTATION.md)

---

## ✅ 檢清單

部署前確保：

- [ ] 已閱讀並理解 US 3.1 和 US 3.2
- [ ] 環境變數已正確配置
- [ ] 數據庫遷移已運行 (`003_ratings_schema.sql`)
- [ ] 測試通過 (`npm run test`)
- [ ] 演示頁面正常運行 (`http://localhost:3000/rating-demo`)
- [ ] 集成到自己的頁面
- [ ] 向用戶展示新功能！🎉

---

## 🆘 需要幫助？

遇到問題？

1. 檢查 [STAR_RATING_IMPLEMENTATION.md](./STAR_RATING_IMPLEMENTATION.md) 的「防弊機制」部分
2. 查看 `__tests__/` 中的測試用例
3. 查看 `app/rating-demo/page.tsx` 中的完整示例
4. 檢查 Supabase 控制台中的評分紀錄

---

## 🚀 下一步

建議進階功能：

1. **評分修改** - 允許重新評分和覆蓋
2. **批量統計** - 導出評分 CSV/PDF
3. **定性反饋** - 添加評論功能
4. **實時同步** - Supabase Realtime 更新
5. **排行榜** - 顯示最高評分和最低評分

---

**祝你使用愉快！🎉**
