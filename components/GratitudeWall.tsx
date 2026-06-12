"use client";

import React, { useEffect, useState } from 'react';
import type { GratitudePost } from '@/types/gratitude';

interface ClassOption {
  id: number;
  class_name: string;
}

interface ClassmateOption {
  id: number;
  name: string;
  student_no: string;
}

interface Props {
  user: { id?: string; student_no: string; name?: string; role?: string } | null;
}

export default function GratitudeWall({ user }: Props) {
  const [accountId, setAccountId] = useState<number | null>(null);

  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');

  const [classmates, setClassmates] = useState<ClassmateOption[]>([]);
  const [posts, setPosts] = useState<GratitudePost[]>([]);

  const [initialLoading, setInitialLoading] = useState(true);
  const [classmatesLoading, setClassmatesLoading] = useState(false);
  const [postsLoading, setPostsLoading] = useState(false);
  const [error, setError] = useState('');

  // Form state
  const [recipientId, setRecipientId] = useState('');
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Edit state
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editError, setEditError] = useState('');

  const isAdminOrTeacher = user?.role === 'admin' || user?.role === 'teacher';

  // On mount: fetch user's account info and all classes
  useEffect(() => {
    if (!user?.student_no) return;
    init();
  }, [user]);

  async function init() {
    try {
      const [acctRes, classRes] = await Promise.all([
        fetch(`/api/accounts?q=${encodeURIComponent(user!.student_no)}&page_size=1`),
        fetch('/api/classes'),
      ]);
      const acctData = await acctRes.json();
      const classData = await classRes.json();

      if (!acctData.ok || !acctData.accounts?.length) throw new Error('無法取得使用者資料');

      const acct = acctData.accounts[0];
      setAccountId(acct.id);

      const classList: ClassOption[] = classData.ok ? (classData.classes || []) : [];
      setClasses(classList);

      // Default to user's own class, or first class if admin/teacher without a class
      const defaultClass = acct.class_id
        ? String(acct.class_id)
        : classList.length > 0 ? String(classList[0].id) : '';
      setSelectedClassId(defaultClass);
    } catch (e: any) {
      setError(e.message || '載入失敗');
    } finally {
      setInitialLoading(false);
    }
  }

  // When selected class changes, reload classmates and posts
  useEffect(() => {
    if (!selectedClassId) return;
    const cid = Number(selectedClassId);
    setRecipientId('');
    loadClassmates(cid);
    loadPosts(cid);
  }, [selectedClassId]);

  async function loadClassmates(cid: number) {
    setClassmatesLoading(true);
    try {
      const res = await fetch(`/api/accounts?class_id=${cid}&page_size=200`);
      const data = await res.json();
      setClassmates(
        (data.accounts || []).map((a: any) => ({ id: a.id, name: a.name, student_no: a.student_no }))
      );
    } finally {
      setClassmatesLoading(false);
    }
  }

  async function loadPosts(cid: number) {
    setPostsLoading(true);
    try {
      const res = await fetch(`/api/gratitude?class_id=${cid}`);
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || '無法取得感謝牆');
      setPosts(data.data || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setPostsLoading(false);
    }
  }

  async function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault();
    if (!recipientId || !content.trim() || !accountId) return;
    setSubmitting(true);
    setSubmitError('');

    try {
      const res = await fetch('/api/gratitude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender_account_id: accountId,
          recipient_account_id: Number(recipientId),
          content: content.trim(),
          class_id: Number(selectedClassId),
        }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || '發送失敗');

      setPosts((prev) => [data.data, ...prev]);
      setRecipientId('');
      setContent('');
    } catch (e: any) {
      setSubmitError(e.message || '發送失敗');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('確定要刪除這張讚賞卡嗎？')) return;
    try {
      const res = await fetch(`/api/gratitude/${id}?role=${user?.role}`, { method: 'DELETE' });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || '刪除失敗');
      setPosts((prev) => prev.filter((p) => p.id !== id));
    } catch (e: any) {
      alert(e.message || '刪除失敗');
    }
  }

  function startEdit(post: GratitudePost) {
    setEditingId(post.id);
    setEditContent(post.content);
    setEditError('');
  }

  async function handleEditSave(id: number) {
    if (!editContent.trim()) return;
    setEditError('');
    try {
      const res = await fetch(`/api/gratitude/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: editContent.trim(), role: user?.role }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || '修改失敗');
      setPosts((prev) =>
        prev.map((p) => (p.id === id ? { ...p, content: editContent.trim() } : p))
      );
      setEditingId(null);
    } catch (e: any) {
      setEditError(e.message || '修改失敗');
    }
  }

  if (initialLoading) {
    return <div className="p-6 text-gray-500">載入中...</div>;
  }

  if (error && !selectedClassId) {
    return <div className="p-6 text-red-600 bg-red-50 rounded">{error}</div>;
  }

  return (
    <div className="space-y-6">
      {/* Post Form */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded shadow border border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">發送讚賞卡</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Sender */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              發送者
            </label>
            <div className="px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded text-gray-800 dark:text-gray-200 text-sm">
              {user?.name ?? user?.student_no}
            </div>
          </div>

          {/* Class selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              班別 <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- 請選擇班別 --</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.class_name}
                </option>
              ))}
            </select>
          </div>

          {/* Recipient selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              感謝對象 <span className="text-red-500">*</span>
            </label>
            <select
              value={recipientId}
              onChange={(e) => setRecipientId(e.target.value)}
              required
              disabled={classmatesLoading || !selectedClassId}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              <option value="">
                {classmatesLoading ? '載入中...' : '-- 請選擇同學 --'}
              </option>
              {classmates
                .filter((c) => String(c.id) !== String(accountId))
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}（{c.student_no}）
                  </option>
                ))}
            </select>
          </div>

          {/* Content */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              感謝內容 <span className="text-red-500">*</span>
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
              rows={3}
              placeholder="寫下你想感謝的話..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {submitError && (
            <div className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 p-2 rounded">
              {submitError}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || !recipientId || !content.trim() || !selectedClassId}
            className="px-6 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded hover:bg-blue-700 dark:hover:bg-blue-600 disabled:bg-gray-400 dark:disabled:bg-gray-600 transition-colors"
          >
            {submitting ? '發送中...' : '送出讚賞卡'}
          </button>
        </form>
      </div>

      {/* Posts List */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded shadow border border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">
          感謝牆
          {!postsLoading && (
            <span className="ml-2 text-sm font-normal text-gray-500 dark:text-gray-400">
              ({posts.length} 張)
            </span>
          )}
        </h2>

        {postsLoading ? (
          <p className="text-gray-500 dark:text-gray-400 text-sm">載入中...</p>
        ) : posts.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            {selectedClassId ? '這個班級還沒有讚賞卡，快來第一個發送吧！' : '請先選擇班別。'}
          </p>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => (
              <div
                key={post.id}
                className="border border-yellow-200 dark:border-yellow-700 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="space-y-1 text-sm mb-3">
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">發送者：</span>
                        <span className="font-semibold text-blue-700 dark:text-blue-400">
                          {post.sender_name ?? post.sender_student_no}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">感謝者：</span>
                        <span className="font-semibold text-green-700 dark:text-green-400">
                          {post.recipient_name ?? post.recipient_student_no}
                        </span>
                      </div>
                    </div>

                    <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">我想說的話：</div>
                    {editingId === post.id ? (
                      <div className="space-y-2">
                        <textarea
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-sm"
                        />
                        {editError && (
                          <p className="text-xs text-red-600">{editError}</p>
                        )}
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEditSave(post.id)}
                            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                          >
                            儲存
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="px-3 py-1 text-sm bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
                          >
                            取消
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-gray-800 dark:text-gray-200 text-sm whitespace-pre-wrap pl-2 border-l-2 border-yellow-400 dark:border-yellow-600">
                        {post.content}
                      </p>
                    )}

                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-3">
                      {new Date(post.created_at).toLocaleString('zh-TW')}
                    </p>
                  </div>

                  {isAdminOrTeacher && editingId !== post.id && (
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => startEdit(post)}
                        className="px-3 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                      >
                        修改
                      </button>
                      <button
                        onClick={() => handleDelete(post.id)}
                        className="px-3 py-1 text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                      >
                        刪除
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
