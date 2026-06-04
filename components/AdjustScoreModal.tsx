"use client";

import React, { useState } from "react";

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (adjusted: number) => Promise<void>;
  initialValue: number;
}

export default function AdjustScoreModal({ open, onClose, onSave, initialValue }: Props) {
  const [value, setValue] = useState<string>(String(initialValue || 0));
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    setValue(String(initialValue || 0));
  }, [initialValue, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-96">
        <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">調整分數</h3>
        <input
          className="w-full p-2 border rounded mb-4 dark:bg-gray-700"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
        <div className="flex justify-end gap-2">
          <button className="px-4 py-2 bg-gray-200 rounded" onClick={onClose}>取消</button>
          <button
            className="px-4 py-2 bg-yellow-500 text-white rounded"
            onClick={async () => {
              const n = parseInt(value, 10);
              if (Number.isNaN(n)) return alert('請輸入有效整數');
              setLoading(true);
              try {
                await onSave(n);
                onClose();
              } catch (e) {
                alert((e as any)?.message || '更新失敗');
              } finally {
                setLoading(false);
              }
            }}
            disabled={loading}
          >保存</button>
        </div>
      </div>
    </div>
  );
}
