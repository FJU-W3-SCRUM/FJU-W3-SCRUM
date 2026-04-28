/**
 * Task01: Group Members with Student Scores Display
 * 
 * 在分組名單中顯示每位學生的發言統計
 * 格式: "姓名 (學號)<組長>     (被點次數/舉手次數; 分數)"
 */

"use client";

import React, { useEffect, useState } from "react";
import type { StudentScoreData } from "@/lib/services/student-score-service";

interface GroupMember {
  id: string;
  group_id: string;
  account_id: string;
  is_leader: boolean;
  student_no: string;
  name: string;
}

interface GroupMembersWithScoresProps {
  sessionId: string;
  members: GroupMember[];
  onMemberSelect?: (memberId: string) => void;
}

export default function GroupMembersWithScores({
  sessionId,
  members,
  onMemberSelect,
}: GroupMembersWithScoresProps) {
  const [scores, setScores] = useState<Map<string, StudentScoreData>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  // Load scores for all group members
  useEffect(() => {
    if (!sessionId || members.length === 0) {
      setLoading(false);
      return;
    }

    loadScores();
  }, [sessionId, members]);

  const loadScores = async () => {
    try {
      setLoading(true);
      setError("");

      const newScores = new Map<string, StudentScoreData>();

      // Fetch scores for each member
      for (const member of members) {
        try {
          const response = await fetch(
            `/api/scores/student-scores?sessionId=${sessionId}&accountId=${member.account_id}`
          );
          const data = await response.json();

          if (data.ok && data.data) {
            newScores.set(member.account_id, data.data);
          }
        } catch (err) {
          console.error(`Failed to load score for ${member.account_id}:`, err);
        }
      }

      setScores(newScores);
    } catch (err: any) {
      console.error("Error loading scores:", err);
      setError("無法加載分數統計");
    } finally {
      setLoading(false);
    }
  };

  const formatScoreDisplay = (member: GroupMember): string => {
    const score = scores.get(member.account_id);
    const leaderTag = member.is_leader ? "<組長>" : "";

    if (!score) {
      return `${member.name} (${member.student_no})${leaderTag}     (0/0; 0)`;
    }

    return (
      `${member.name} (${member.student_no})${leaderTag}     ` +
      `(${score.answerCount}/${score.raiseCount}; ${score.totalScore})`
    );
  };

  if (loading) {
    return (
      <div className="p-4 text-center text-gray-500 dark:text-gray-400">
        載入分數中...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded text-red-700 dark:text-red-200">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {members.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400 text-sm">無組員</p>
      ) : (
        members.map((member) => (
          <div
            key={member.id}
            onClick={() => onMemberSelect?.(member.id)}
            className="p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-400 dark:hover:border-blue-500 cursor-pointer transition-colors"
          >
            <div className="flex justify-between items-center">
              {/* Member Info */}
              <div className="flex-1">
                <p className="font-mono text-sm text-gray-900 dark:text-gray-100">
                  {formatScoreDisplay(member)}
                </p>
              </div>

              {/* Score Badges */}
              {scores.get(member.account_id) && (
                <div className="ml-4 flex gap-2">
                  <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-semibold rounded">
                    舉手: {scores.get(member.account_id)!.raiseCount}
                  </span>
                  <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs font-semibold rounded">
                    被點: {scores.get(member.account_id)!.answerCount}
                  </span>
                  <span className="px-2 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-xs font-semibold rounded">
                    分: {scores.get(member.account_id)!.totalScore}
                  </span>
                </div>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
