## 🧪 多瀏覽器實時同步測試指南

### 📋 本次修改的改進

根據您的測試反饋，我已實施以下修復：

#### ✅ **修改 1: 激進輪詢機制**
- **舊方案**：操作後短暫輪詢（3秒），容易錯過其他 client 的更新
- **新方案**：操作後加速輪詢（5秒，每 500ms），確保捕捉所有變更

#### ✅ **修改 2: 背景輪詢**
- **新增**：即使沒有操作，也會每 2 秒自動刷新一次
- **目的**：確保跨瀏覽器始終同步

#### ✅ **修改 3: 可配置的輪詢參數**
- 已添加到 `.env.local`
- 若同步仍有問題，您可調整這些參數

---

### 🔬 測試步驟

#### **Step 1: 重新啟動開發伺服器**
```bash
npm run dev
```

確保新的輪詢代碼已加載。

#### **Step 2: 打開 3 個瀏覽器，分別登入**

**Chrome（joery - 老師）**
1. 打開 `http://localhost:3000`
2. 登入 joery
3. 進入班級，建立課堂
4. 啟用「開放舉手」✅
5. **按 F12 打開 Developer Tools → Console**（查看日誌）

**Edge（ST001 - 學生1）**
1. 打開 `http://localhost:3000`
2. 登入 ST001
3. 進入相同課堂
4. **按 F12 打開 Console**

**Firefox（ST002 - 學生2）**
1. 打開 `http://localhost:3000`
2. 登入 ST002
3. 進入相同課堂
4. **按 F12 打開 Console**

---

#### **Step 3: 執行測試操作**

**測試 A: 學生舉手** ⬆️
1. 在 **Edge (ST001)** 點擊「我要舉手」
2. **觀察**：
   - Edge 會話中該學生應立即看到✋
   - **需在 2 秒內**：Chrome 和 Firefox 也應看到 ST001 舉手
   - 檢查 Console 日誌應看到 `[SessionPage] 🔄 背景輪詢` 和 `[useHandsUpSync] ⏱️ 激進輪詢`

**預期結果**：
```
[SessionPage] 🔄 背景輪詢 - 自動刷新...      (Chrome)
[useHandsUpSync] 激進輪詢 (500ms)...         (Edge)
[SessionPage] 🔄 背景輪詢 - 自動刷新...      (Firefox)
```

**測試 B: 學生2 放下舉手** ⬇️
1. 在 **Edge (ST001)** 點擊「放下」
2. **觀察**：
   - Edge 隊列應立即消失
   - **需在 2 秒內**：Chrome 和 Firefox 隊列也消失

**測試 C: 老師開關舉手** 🔘
1. 在 **Chrome (joery)** 點擊「開放舉手」切換開關
2. 觀察其他瀏覽器：
   - Edge 和 Firefox 的「我要舉手」按鈕應 **禁用**
   - 舉手隊列應 **清空**（因為 qna_open=false）

**測試 D: 評分** ⭐
1. 在 **Firefox (ST002)** 點擊「我要舉手」
2. 在 **Chrome (joery)** 的隊列中點擊 ST002
3. 給予評分（例如 5 星）
4. **觀察**：
   - Chrome：ST002 從隊列消失
   - Edge 和 Firefox：**2 秒內** 隊列也更新

---

### 🔍 診斷日誌

打開 **F12 Console**，查找以下日誌模式：

#### ✅ **正常運作的跡象**
```
[SessionPage] 🔄 背景輪詢 - 自動刷新...
[useHandsUpSync] Calling refresh() to sync data...
[useHandsUpSync] 🔄 啟動主動輪詢 (5秒內每500ms一次)
[useHandsUpSync] ⏱️ 激進輪詢 (500ms)...
```

#### ❌ **問題跡象**
```
[useHandsUpSync] API error: Session not found
[useHandsUpSync] Sync refresh failed: ...
[useHandsUpSync] 清理會話同步 for ...
```

如果看到 API error，檢查：
1. Session ID 是否正確
2. 網路連線是否穩定
3. 服務器日誌中是否有錯誤

---

### 🎛️ 調整輪詢參數

若同步仍不理想，修改 `.env.local`：

```env
# 選項 A: 加快背景輪詢（但增加伺服器負擔）
NEXT_PUBLIC_POLLING_INTERVAL=1000  # 改為 1 秒

# 選項 B: 增加激進輪詢時間
NEXT_PUBLIC_AGGRESSIVE_POLLING_TIMEOUT=8000  # 改為 8 秒

# 選項 C: 加快激進輪詢頻率
NEXT_PUBLIC_AGGRESSIVE_POLLING_INTERVAL=300  # 改為 300ms
```

**修改後重新啟動伺服器**：
```bash
npm run dev
```

---

### 📊 效能對照表

| 配置 | 背景輪詢 | 激進輪詢 | 預期同步時間 | 伺服器負荷 |
|------|--------|--------|-----------|---------|
| **保守** | 3000ms | 600ms | 3-4秒 | 低 ⬇️ |
| **預設** | 2000ms | 500ms | 2-3秒 | 中等 ➡️ |
| **激進** | 1000ms | 300ms | 1-2秒 | 高 ⬆️ |

**建議**：從預設開始，若無法同步再試激進。

---

### 📝 測試結果記錄

**日期**：_____________  
**瀏覽器**：Chrome ☐ | Edge ☐ | Firefox ☐

| 測試 | Chrome | Edge | Firefox | 同步時間 | 結果 |
|------|--------|------|---------|---------|------|
| A 舉手 | ⬜ | ⬜ | ⬜ | ___ | ✅/❌ |
| B 放下 | ⬜ | ⬜ | ⬜ | ___ | ✅/❌ |
| C 開關 | ⬜ | ⬜ | ⬜ | ___ | ✅/❌ |
| D 評分 | ⬜ | ⬜ | ⬜ | ___ | ✅/❌ |

---

### 🆘 若仍無法同步

**備用方案清單**（由激進到保守）：

1. **診斷 WebSocket**
   ```javascript
   // 在 Console 執行
   const { data, error } = await supabase.channel('test').subscribe();
   console.log('WebSocket status:', data?.status);
   ```

2. **檢查網路請求**
   - 按 F12 → Network 分頁
   - 過濾 `/api/hands-up/overview`
   - 應該看到每 2-3 秒一個請求

3. **臨時加速輪詢到 1 秒測試**
   - 修改 `.env.local` → `NEXT_PUBLIC_POLLING_INTERVAL=1000`
   - 若能同步，說明問題是時間太長

4. **若上述都無效，實施 Service Worker**
   - 使用 Service Worker 確保後台持續拉取
   - 即使瀏覽器標籤頁在背景也能同步
   - （您之前提到的方案）

---

### 📞 反饋與報告

測試完成後，請告訴我：

1. ✅/❌ 4 個測試場景的結果
2. 🕒 實際測量的同步時間（秒）
3. 📱 使用的瀏覽器版本
4. 🖧 網路延遲（可在 DevTools Network 看到）
5. 💬 Console 中看到的任何紅色錯誤

這樣我可以根據實際情況提供更精準的解決方案。

---

**最後建議**：
- 從預設配置開始測試（POLLING_INTERVAL=2000）
- 如果同步正常，就不需要進一步修改
- 如果仍有問題，逐步調整輪詢參數
- 收集 Console 日誌幫助診斷

🚀 **開始測試吧！**
