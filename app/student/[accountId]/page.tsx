import React from 'react';
import StudentScorePanel from '@/components/StudentScorePanel';

interface Props {
  params: { accountId: string };
}

export default function Page({ params }: Props) {
  const { accountId } = params;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">學生個人積分</h1>
      <StudentScorePanel accountId={accountId} />
    </div>
  );
}
