'use client';

import { FormEvent, useMemo, useState } from 'react';

interface GratitudeCard {
  id: string;
  sender_account_id: string;
  recipient_account_id: string;
  sender_name: string;
  recipient_name: string;
  message: string;
  created_at: string;
}

interface GratitudeWallProps {
  cards: GratitudeCard[];
  members: Array<{ id: string; name: string }>;
  currentUserAccountId: string;
  canPost: boolean;
  onSubmitCard: (recipientAccountId: string, message: string) => Promise<void>;
}

export default function GratitudeWall({
  cards,
  members,
  currentUserAccountId,
  canPost,
  onSubmitCard
}: GratitudeWallProps) {
  const [recipientAccountId, setRecipientAccountId] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const recipientOptions = useMemo(
    () => members.filter((m) => `${m.id}` !== `${currentUserAccountId}`),
    [members, currentUserAccountId]
  );

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!recipientAccountId || !message.trim()) return;

    try {
      setSubmitting(true);
      await onSubmitCard(recipientAccountId, message.trim());
      setRecipientAccountId('');
      setMessage('');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col bg-white border border-gray-200 rounded-lg shadow min-h-[360px]">
      <div className="p-4 border-b bg-pink-50">
        <h2 className="text-lg font-bold text-pink-700">💌 感謝牆</h2>
        <p className="text-xs text-gray-500 mt-1">投稿為具名訊息，所有同學皆可見。</p>
      </div>

      {canPost && (
        <form onSubmit={handleSubmit} className="p-3 border-b bg-gray-50 flex flex-col gap-2">
          <select
            value={recipientAccountId}
            onChange={(e) => setRecipientAccountId(e.target.value)}
            className="border border-gray-300 rounded p-2 text-sm bg-white"
            required
          >
            <option value="">選擇想感謝的同學</option>
            {recipientOptions.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="border border-gray-300 rounded p-2 text-sm resize-none"
            rows={2}
            maxLength={200}
            placeholder="寫下你想感謝的內容（最多 200 字）"
            required
          />
          <button
            type="submit"
            disabled={submitting || recipientOptions.length === 0}
            className="px-3 py-2 bg-pink-600 text-white text-sm font-semibold rounded hover:bg-pink-700 disabled:bg-gray-400"
          >
            {submitting ? '投稿中...' : '送出具名讚賞卡'}
          </button>
        </form>
      )}

      <div className="flex-1 overflow-y-auto p-3">
        {cards.length === 0 ? (
          <div className="h-full flex items-center justify-center text-sm text-gray-400">尚無投稿</div>
        ) : (
          <ul className="space-y-2">
            {cards.map((card) => (
              <li key={card.id} className="border border-pink-100 bg-pink-50/40 rounded p-3">
                <div className="text-sm font-semibold text-gray-800">
                  {card.sender_name} 感謝 {card.recipient_name}
                </div>
                <div className="text-sm text-gray-700 mt-1 break-words">{card.message}</div>
                <div className="text-xs text-gray-500 mt-2">
                  {new Date(card.created_at).toLocaleString('zh-TW')}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
