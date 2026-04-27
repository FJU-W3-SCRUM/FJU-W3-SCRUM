'use client';
import { useState } from 'react';

interface RatingModalProps {
  isOpen: boolean;
  studentName: string;
  studentId: string;
  studentNo: string;
  onClose: () => void;
  onSubmit: (stars: number) => void;
}

export default function RatingModal({ isOpen, studentName, studentId, studentNo, onClose, onSubmit }: RatingModalProps) {
  const [stars, setStars] = useState<number>(0);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-sm p-6 relative animate-in fade-in zoom-in duration-200">
        
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-800">
           X
        </button>

        <h3 className="text-xl font-bold mb-2">⭐ 點名發言評分</h3>
        <p className="text-gray-600 mb-6 border-b pb-4">
           請針對 <span className="font-semibold text-blue-600">{studentName} ({studentNo})</span> 的口頭回答給予星等評分。
        </p>

        <div className="flex justify-center gap-2 mb-8">
           {[1, 2, 3, 4, 5].map((s) => (
             <button
               key={s}
               type="button"
               onMouseEnter={() => setStars(s)}
               onClick={() => setStars(s)}
               className={`text-5xl transition-colors hover:scale-110 ${s <= stars ? 'text-yellow-400' : 'text-gray-200'}`}
             >
               ★
             </button>
           ))}
        </div>

        <div className="flex justify-end gap-3">
           <button onClick={onClose} className="px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded">
             取消並關閉
           </button>
           <button 
              onClick={() => { if(stars > 0) onSubmit(stars); }} 
              disabled={stars === 0}
              className="px-6 py-2 bg-blue-600 text-white disabled:bg-blue-300 font-bold rounded hover:bg-blue-700"
            >
             送出成績
           </button>
        </div>
      </div>
    </div>
  );
}