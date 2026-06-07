'use client';

import { useEffect, useMemo, useState } from 'react';

interface GratitudePost {
  id: number;
  content: string;
  created_at: string;
  sender_name?: string;
  recipient_name?: string;
}

interface Recipient {
  id: number;
  name: string;
  student_no: string;
}

interface GratitudeWallPanelProps {
  user: { id?: string; student_no: string; name?: string; role?: string } | null;
}

export default function GratitudeWallPanel({ user }: GratitudeWallPanelProps) {
  const [posts, setPosts] = useState<GratitudePost[]>([]);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [selectedRecipientId, setSelectedRecipientId] = useState<string>('');
  const [content, setContent] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingContent, setEditingContent] = useState('');

  const isAdmin = user?.role === 'admin';

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/gratitude', { cache: 'no-store' });
      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || '無法載入感謝牆資料');
      }

      setPosts(data.posts || []);
      setRecipients(data.recipients || []);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      setError(message || '無法載入感謝牆資料');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      await fetchData();
    };

    void init();
  }, []);

  const validateForm = () => {
    const trimmed = content.trim();
    if (!selectedRecipientId) {
      return '請選擇一位要感謝的同學。';
    }
    if (!trimmed) {
      return '感謝內容不得為空。';
    }
    if (trimmed.length > 200) {
      return '感謝內容不得超過 200 字。';
    }
    return null;
  };

  const handleSubmit = async () => {
    const formError = validateForm();
    if (formError) {
      setError(formError);
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch('/api/gratitude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipient_id: Number(selectedRecipientId), content: content.trim() }),
      });
      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || '送出讚賞卡失敗');
      }

      setContent('');
      setSelectedRecipientId('');
      await fetchData();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      setError(message || '送出讚賞卡失敗');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStartEdit = (post: GratitudePost) => {
    setEditingId(post.id);
    setEditingContent(post.content);
    setError(null);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingContent('');
    setError(null);
  };

  const handleSaveEdit = async () => {
    const trimmed = editingContent.trim();
    if (!trimmed) {
      setError('感謝內容不得為空。');
      return;
    }
    if (trimmed.length > 200) {
      setError('感謝內容不得超過 200 字。');
      return;
    }

    if (!editingId) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/gratitude/${editingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: trimmed }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || '更新讚賞卡失敗');
      }
      setEditingId(null);
      setEditingContent('');
      await fetchData();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      setError(message || '更新讚賞卡失敗');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (postId: number) => {
    if (!window.confirm('確定要刪除這張讚賞卡嗎？此操作無法復原。')) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/gratitude/${postId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || '刪除讚賞卡失敗');
      }
      await fetchData();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      setError(message || '刪除讚賞卡失敗');
    } finally {
      setSubmitting(false);
    }
  };

  const visiblePosts = useMemo(() => posts, [posts]);

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow p-6">
        <div className="flex flex-col gap-2">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">感謝牆 (讚賞卡)</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            這裡可以即時發表讚賞內容，讓大家馬上看到你對同學的感謝。
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">發表新的讚賞卡</h3>
        <div className="space-y-4">
          <div className="rounded bg-blue-50 dark:bg-blue-900/30 px-4 py-2 text-sm text-blue-800 dark:text-blue-200">
            發送者：<strong>{user?.name ?? user?.student_no ?? '未知'}</strong>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">選擇感謝者</label>
            <select
              className="mt-2 w-full rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 p-3 text-sm text-gray-900 dark:text-gray-100"
              value={selectedRecipientId}
              onChange={(e) => setSelectedRecipientId(e.target.value)}
            >
              <option value="">請選擇一位同學</option>
              {recipients.map((recipient) => (
                <option key={recipient.id} value={recipient.id}>
                  {recipient.name} ({recipient.student_no})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">感謝內容</label>
            <textarea
              rows={6}
              maxLength={200}
              className="mt-2 w-full rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 p-3 text-sm text-gray-900 dark:text-gray-100"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="寫下你對這位同學的感謝內容，最多 200 字。"
            />
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">字數: {content.trim().length} / 200</p>
          </div>

          {error && <div className="rounded border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="inline-flex items-center justify-center rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-400"
          >
            {submitting ? '送出中...' : '送出讚賞卡'}
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">最新讚賞卡</h3>
          <span className="text-xs text-gray-500 dark:text-gray-400">自動顯示最新 30 筆</span>
        </div>

        {loading ? (
          <div className="text-center text-gray-500">載入中...</div>
        ) : visiblePosts.length === 0 ? (
          <div className="text-gray-500">目前還沒有任何讚賞卡。</div>
        ) : (
          <div className="space-y-4">
            {visiblePosts.map((post) => (
              <div key={post.id} className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="text-xs text-gray-500 dark:text-gray-400">{new Date(post.created_at).toLocaleString('zh-TW', { hour12: false })}</div>
                </div>
                {post.sender_name && (
                  <div className="mt-1 text-sm text-gray-700 dark:text-gray-300 font-medium">發送者：{post.sender_name}</div>
                )}
                {post.recipient_name && (
                  <div className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">感謝對象：{post.recipient_name}</div>
                )}
                <div className="mt-3 whitespace-pre-wrap text-gray-900 dark:text-gray-100">{post.content}</div>
                {isAdmin && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleStartEdit(post)}
                      className="rounded bg-yellow-500 px-3 py-1 text-sm text-white hover:bg-yellow-600"
                    >
                      編輯
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(post.id)}
                      className="rounded bg-red-600 px-3 py-1 text-sm text-white hover:bg-red-700"
                    >
                      刪除
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {isAdmin && editingId !== null && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">編輯讚賞卡內容</h3>
          <textarea
            rows={6}
            maxLength={200}
            className="w-full rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 p-3 text-sm text-gray-900 dark:text-gray-100"
            value={editingContent}
            onChange={(e) => setEditingContent(e.target.value)}
          />
          <div className="mt-3 flex flex-wrap gap-3">
            <button
              onClick={handleSaveEdit}
              disabled={submitting}
              className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-400"
            >
              {submitting ? '保存中...' : '保存變更'}
            </button>
            <button
              onClick={handleCancelEdit}
              disabled={submitting}
              className="rounded bg-gray-200 px-4 py-2 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
            >
              取消
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
