# 開發規範 (Next.js + Supabase)

此文件說明本專案使用 Next.js 結合 Supabase 的開發規範：命名、模組匯入、環境變數、Client/Server 使用、測試 mock 與 E2E 選擇器。

## 代碼風格概覽

### 命名慣例
- **檔案名稱**：PascalCase（React 元件 / pages 使用 `Page.jsx` 或 `Page.tsx`）與 camelCase（工具函式）
- **變數與函式**：camelCase
- **常數**：UPPER_SNAKE_CASE

### 匯入順序
1. 外部套件（React、Next.js、supabase-js）
2. Supabase client（`/lib/supabase`）
3. 本地元件與工具
4. 型別定義

## Next.js 與 Supabase 的使用準則

- 專案採用 App Router（`src/app/`），頁面與 server components 預設為伺服器端。當元件需要在瀏覽器執行（使用 state、effect、event handlers、Supabase client 的即時操作），請在檔案最上方加上 `"use client"`。
- 將 Supabase client 實作在 `lib/supabase/`：
  - `lib/supabase/client.ts`（或 `.js`）：給前端使用的匿名 client（使用 `NEXT_PUBLIC_` 變數）。
  - `lib/supabase/server.ts`：給伺服器使用的 client（可使用 service role key，僅在 server 環境載入）。

範例（`lib/supabase/client.ts`）：
```javascript
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);
```

範例（`lib/supabase/server.ts`）：
```javascript
import { createClient } from '@supabase/supabase-js';

export const supabaseServer = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
```

安全性注意：`SUPABASE_SERVICE_ROLE_KEY` 只應在 server-side code（API 路由、server actions、edge functions）使用，絕對不能暴露給 client。

### Auth 與 Session
- 建議使用 Supabase Auth 的 client-side 方法管理使用者登入（`supabase.auth`）或在 server-side 透過 cookies/session 驗證。若需要 SSR 認證，於 server route 取得 cookie 並用 `supabaseServer` 驗證。

### Realtime 與 RLS
- 若使用 Realtime 或 Postgres RLS，設計時優先考慮最小權限原則，client 端僅使用匿名 key 並配合 RLS policy 控制存取。

## 環境變數

- `NEXT_PUBLIC_SUPABASE_URL` — 可公開的 Supabase URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — 可公開的 anon key（只限 client）
- `SUPABASE_SERVICE_ROLE_KEY` — 伺服器專用的 service role key（不可公開）

在本機建立 `.env.local`，範例：
```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=public-anon-key
SUPABASE_SERVICE_ROLE_KEY=server-only-service-role-key
```

不要將 `.env.local` 加入版本控制；在 CI/Production 使用 secrets 管理。

## React 元件（Next.js）最佳實務

- Server Component：不應直接呼叫 client-side-only API（例如 `window`、`useState`、直接操作 `supabase` 的交互方法），適合用來 fetch server-side 資料。
- Client Component：會用到互動或 Supabase client 的元件需使用 `"use client"`。

範例元件（Client）：
```jsx
"use client";
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';

export default function JoinButton({ groupId }) {
  const [loading, setLoading] = useState(false);

  const join = async () => {
    setLoading(true);
    await supabase.from('group_members').insert({ group_id: groupId });
    setLoading(false);
  };

  return <button className="button button--primary" onClick={join}>加入</button>;
}
```

## 測試規範（Vitest）

- 所有單元測試放在 `__tests__/`。
- mock Supabase client 時建議 mock 本地 `lib/supabase`，而非直接 mock `@supabase/supabase-js`，以降低耦合。

範例（`__tests__/SelectGroup.test.jsx`）：
```javascript
import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({ select: vi.fn().mockResolvedValue({ data: [], error: null }) })),
    auth: { signIn: vi.fn(), signOut: vi.fn() },
  },
}));

describe('GroupSelector', () => {
  beforeEach(() => vi.clearAllMocks());
  it('renders groups', async () => {
    // 測試實作
  });
});
```

## E2E 測試（Playwright）

- 使用 `data-testid` 作為首選選擇器，並在規範中列出常用的 testids（下列為 group feature 範例）。

範例 testids：
- `data-testid="group-select-page"`
- `data-testid="group-row-<groupId>"`
- `data-testid="group-join-btn-<groupId>"`

## Feature-specific 規範：Group Selection

- Component 放置：頁面 wrapper 放在 `src/app/select-group/Page.jsx`；可重用組件放在 `src/components/`。
- Join 按鈕必須為 `<button>`，包含 `aria-label`（例如 `加入組別 {groupName}`）。
- 單元測試：`__tests__/SelectGroup.test.jsx`（mock `lib/supabase`）。
- E2E：`e2e/select-group.spec.js`，流程：前往 `/select-group` → 選擇組別 → 驗證教師檢視。

## Commit 與 CI

- 遵循 Conventional Commits 格式。
- 在 PR 中描述如何設定 Supabase keys 與任何需要啟用的 RLS policy。

## 其他注意事項

- 文件語言以繁體中文（台灣用語）為主。
- 若要 scaffold `lib/supabase` client 檔案，我可以幫你建立範例檔案與測試 mock。

---
**最後更新**：2026-04-10
