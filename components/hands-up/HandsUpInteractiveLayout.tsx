'use client';

import React from 'react';

interface InteractiveLayoutProps {
  children?: React.ReactNode;
  overviewView: React.ReactNode; // 75%
  queueView: React.ReactNode; // 25%
}

export default function HandsUpInteractiveLayout({ overviewView, queueView, children }: InteractiveLayoutProps) {
  return (
    <div className="flex flex-col h-full w-full">
      {/* Optional Top Controller bar */}
      {children && (
        <div className="p-4 border-b border-gray-200 bg-white">
           {children}
        </div>
      )}
      <div className="flex flex-1 flex-row overflow-hidden">
         {/* Left 75% pane */}
        <div className="w-3/4 flex-none border-r border-gray-200 p-4 overflow-y-auto bg-gray-50">
           {overviewView}
        </div>

        {/* Right 25% pane */}
        <div className="w-1/4 flex-none p-4 overflow-y-auto bg-white flex flex-col gap-2">
           {queueView}
        </div>
      </div>
    </div>
  );
}