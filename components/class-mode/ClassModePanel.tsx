"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getActiveClassSessions, createClassSession, getSeatMap, selectSeat, getTeacherClasses, TeacherClassSummary } from './client';
import { ClassModeSession, SeatMapEntry } from '../../types/classmode';

const SeatMatrix = ({ session, user }: { session: any, user: any }) => {
  const router = useRouter();
  const [seatMap, setSeatMap] = useState<SeatMapEntry[]>([]);
  const [selectedSeat, setSelectedSeat] = useState<{ x: number, y: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchSeatMap = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getSeatMap(session.id);
      setSeatMap(data.seatMap || []);

      const mySeat = data.seatMap.find((s: SeatMapEntry) => String(s.user_id) === String(user.id));
      if (mySeat) {
        setSelectedSeat({ x: mySeat.seat_x, y: mySeat.seat_y });
      }
    } catch (err: any) {
      setError(`無法讀取座位圖: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [session.id, user.id]);

  useEffect(() => {
    fetchSeatMap();
  }, [fetchSeatMap]);

  const handleSeatClick = (x: number, y: number) => {
    const isTaken = seatMap.some(s => s.seat_x === x && s.seat_y === y && s.user_id !== user.id);
    if (isTaken) {
      setError('此座位已被選擇');
      return;
    }
    setError('');
    setSelectedSeat({ x, y });
  };

  const handleConfirmSeat = async () => {
    if (!selectedSeat) {
      setError('請先選擇一個座位');
      return;
    }
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await selectSeat(session.id, selectedSeat.y, selectedSeat.x, user.id);
      setSuccess('座位選擇成功！');
      router.push(`/sessions/${session.id}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const renderSeat = (x: number, y: number) => {
    const seatData = seatMap.find(s => s.seat_x === x && s.seat_y === y);
    const isSelected = selectedSeat?.x === x && selectedSeat?.y === y;

    let content;
    let baseClasses = "w-full h-20 rounded-md flex flex-col items-center justify-center text-xs p-1 transition-all duration-200";
    let actionClasses = " cursor-pointer";

    if (seatData) {
      if (seatData.user_id === user.id) {
        content = (
          <>
            <span className="font-bold text-white">您的座位</span>
            <span className="text-gray-200 truncate text-center">{seatData.student_name}</span>
            <span className="text-gray-200">{seatData.student_id}</span>
          </>
        );
        baseClasses += " bg-green-600 shadow-lg";
      } else {
        content = (
          <>
            <span className="font-semibold text-gray-800 truncate">{seatData.student_name}</span>
            <span className="text-gray-600">{seatData.student_id}</span>
          </>
        );
        baseClasses += " bg-gray-400 dark:bg-gray-600";
        actionClasses = "";
      }
    } else {
      content = <span className="text-gray-500">空位</span>;
      baseClasses += " bg-gray-200 dark:bg-gray-700 hover:bg-blue-300 dark:hover:bg-blue-600";
    }

    if (isSelected) {
      baseClasses += " ring-4 ring-blue-500 ring-offset-2 ring-offset-gray-100 dark:ring-offset-gray-800";
    }

    return (
      <div key={`${y}-${x}`} className={baseClasses + actionClasses} onClick={() => actionClasses && handleSeatClick(x, y)}>
        {content}
      </div>
    );
  };

  const renderGrid = () => {
    const rows = 7;
    const cols = 10;
    const grid = [];
    for (let y = 0; y < rows; y++) {
      const row = [];
      for (let x = 0; x < cols; x++) {
        if (x === 2 || x === 7) {
          row.push(<div key={`aisle-${y}-${x}`} className="w-full h-20"></div>);
        } else {
          row.push(renderSeat(x, y));
        }
      }
      grid.push(
        <div key={`row-${y}`} className="grid grid-cols-10 gap-2 items-center">
          {row}
        </div>
      );
    }
    return grid;
  };

  return (
    <div className="w-full">
      {loading && <p className="text-center">載入座位圖...</p>}
      {error && <p className="text-center text-red-500 bg-red-100 dark:bg-red-900 p-2 rounded-md mb-4">{error}</p>}
      {success && <p className="text-center text-green-500 bg-green-100 dark:bg-green-900 p-2 rounded-md mb-4">{success}</p>}

      <div className="p-4 bg-gray-100 dark:bg-gray-900 rounded-lg">
        <div className="text-center mb-4 font-bold text-lg text-gray-700 dark:text-gray-300">--- 講台 ---</div>
        <div className="space-y-2">
          {renderGrid()}
        </div>
      </div>

      <div className="mt-6 flex justify-center">
        <button
          onClick={handleConfirmSeat}
          disabled={!selectedSeat || loading}
          className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold disabled:bg-gray-400 disabled:cursor-not-allowed text-lg"
        >
          {loading ? '處理中...' : '確認選擇此座位'}
        </button>
      </div>
    </div>
  );
};

export default function ClassModePanel({ user }: { user: any }) {
  const router = useRouter();
  const role = user?.role?.toLowerCase() || "student";
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [view, setView] = useState<'list' | 'seat_selection'>('list');

  const [availableSessions, setAvailableSessions] = useState<ClassModeSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<any>(null);

  const [classes, setClasses] = useState<TeacherClassSummary[]>([]);
  const [selectedClassId, setSelectedClassId] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setMessage('');
      try {
        if (role === 'student') {
          const data = await getActiveClassSessions();
          if ((data as any).error) throw new Error((data as any).error);
          setAvailableSessions((data.sessions || []) as ClassModeSession[]);
          if (!data.sessions || data.sessions.length === 0) {
            setMessage('目前沒有進行中的上課模式課堂。');
          }
        } else {
          const classList = await getTeacherClasses();
          setClasses(classList);
          if (classList.length > 0) {
            setSelectedClassId(classList[0].id);
          } else {
            setMessage('您尚未建立任何班級。');
          }
        }
      } catch (err: any) {
        setMessage(`讀取資料時發生錯誤: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [role]);

  const handleStartClassSession = async () => {
    if (!selectedClassId) {
      alert('請選擇一個班級');
      return;
    }
    setLoading(true);
    try {
      const selectedClass = classes.find(c => c.id === selectedClassId);
      const sessionName = `${selectedClass?.class_name || '課堂'} - ${new Date().toLocaleString()}`;

      const data = await createClassSession(selectedClassId, sessionName);
      router.push(`/sessions/${data.id}`);
    } catch (err: any) {
      alert(`啟動課堂失敗: ${err.message}`);
      setLoading(false);
    }
  };

  const handleSelectSession = (session: any) => {
    setSelectedSession(session);
    setView('seat_selection');
  };

  if (loading && view === 'list') {
    return <div className="p-4 text-center">載入中...</div>;
  }

  if (role === 'student') {
    if (view === 'list') {
      return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded shadow-md border border-gray-200 dark:border-gray-700 w-full max-w-4xl">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-6">請選擇要進入的上課模式課堂</h2>
          {availableSessions.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {availableSessions.map((s) => (
                <div
                  key={s.id}
                  className="p-4 border rounded-lg cursor-pointer transition-colors bg-gray-50 dark:bg-gray-900 hover:border-blue-500"
                  onClick={() => handleSelectSession(s)}
                >
                  <h3 className="font-bold text-lg text-gray-800 dark:text-gray-200">{s.class_name}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{s.title}</p>
                  <div className="mt-4 text-right font-bold text-blue-600">選擇座位 &rarr;</div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500 py-8">{message || '目前沒有進行中的上課模式課堂。'}</p>
          )}
        </div>
      );
    }

    if (view === 'seat_selection') {
      return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded shadow-md border border-gray-200 dark:border-gray-700 w-full">
          <button onClick={() => setView('list')} className="text-blue-600 mb-4">&larr; 返回課程列表</button>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            選擇您在「{selectedSession?.class_name}」的座位
          </h2>
          <SeatMatrix session={selectedSession} user={user} />
        </div>
      );
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded shadow-md border border-gray-200 dark:border-gray-700 max-w-2xl">
      <h2 className="text-xl font-semibold mb-6 text-gray-900 dark:text-gray-100">啟動上課模式</h2>
      {message && <p className="text-red-500 mb-4">{message}</p>}
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">選擇班級</label>
          <select
            className="w-full p-2 border rounded bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            disabled={classes.length === 0}
          >
            {classes.map(c => (
              <option key={c.id} value={c.id}>{c.class_name}</option>
            ))}
          </select>
        </div>
        <div className="pt-4 flex justify-end">
          <button
            onClick={handleStartClassSession}
            disabled={!selectedClassId || loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold disabled:bg-gray-400"
          >
            {loading ? '啟動中...' : '啟動課堂'}
          </button>
        </div>
      </div>
    </div>
  );
}