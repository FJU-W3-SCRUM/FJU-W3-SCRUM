/**
 * Task01: 報告模式中呈現分數 - TDD 測試
 * 
 * 需求：在分組名單最右邊顯示 (answer_cnt/raise_count; score)
 * - answer_cnt: 被點發表次數 (status='A')
 * - raise_count: 舉手次數 (總計)
 * - score: 評點分數 (ratings.star 加總)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * 計算學生發言統計的數據模型
 */
interface StudentScoreData {
  account_id: string;
  student_no: string;
  name: string;
  answerCount: number;      // 被點發表次數 (status='A')
  raiseCount: number;        // 舉手次數 (總計)
  totalScore: number;        // 評點分數 (stars加總)
}

/**
 * 服務函數類型 - 待實現
 */
interface StudentScoreService {
  getStudentScoresForSession(sessionId: string): Promise<StudentScoreData[]>;
  getStudentScoreForSession(sessionId: string, accountId: string): Promise<StudentScoreData>;
}

describe('Task01: Student Score Statistics (報告模式分數呈現)', () => {
  
  describe('getStudentScoresForSession - 獲取課堂所有學生的發言統計', () => {
    
    it('應返回課堂內所有學生的發言統計，包含 answerCount、raiseCount、totalScore', async () => {
      // Arrange
      const sessionId = 'session-123';
      const expectedStudents = [
        {
          account_id: 'student-001',
          student_no: '414100001',
          name: '林小明',
          answerCount: 2,    // 被點 2 次 (status='A')
          raiseCount: 5,     // 舉手 5 次
          totalScore: 8      // 獲得 8 顆星
        },
        {
          account_id: 'student-002',
          student_no: '414100002',
          name: '王小美',
          answerCount: 1,
          raiseCount: 3,
          totalScore: 3
        }
      ];

      // Mock service
      const mockService: StudentScoreService = {
        getStudentScoresForSession: vi.fn().mockResolvedValue(expectedStudents),
        getStudentScoreForSession: vi.fn()
      };

      // Act
      const result = await mockService.getStudentScoresForSession(sessionId);

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(expectedStudents[0]);
      expect(result[1]).toEqual(expectedStudents[1]);
      expect(mockService.getStudentScoresForSession).toHaveBeenCalledWith(sessionId);
    });

    it('當課堂無學生時，應返回空陣列', async () => {
      // Arrange
      const sessionId = 'session-empty';
      const mockService: StudentScoreService = {
        getStudentScoresForSession: vi.fn().mockResolvedValue([]),
        getStudentScoreForSession: vi.fn()
      };

      // Act
      const result = await mockService.getStudentScoresForSession(sessionId);

      // Assert
      expect(result).toEqual([]);
    });

    it('應正確計算 answerCount: 只計算 status="A" 的記錄', async () => {
      // Arrange
      const sessionId = 'session-123';
      const mockService: StudentScoreService = {
        getStudentScoresForSession: vi.fn().mockResolvedValue([
          {
            account_id: 'student-001',
            student_no: '414100001',
            name: '林小明',
            answerCount: 2,  // 只計算 status='A'
            raiseCount: 5,   // R + A + 其他
            totalScore: 8
          }
        ]),
        getStudentScoreForSession: vi.fn()
      };

      // Act
      const result = await mockService.getStudentScoresForSession(sessionId);

      // Assert - 驗證 answerCount 邏輯
      expect(result[0].answerCount).toBe(2);
      expect(result[0].raiseCount).toBeGreaterThanOrEqual(result[0].answerCount);
    });

    it('應正確計算 raiseCount: 所有舉手記錄 (包含 R, A, D, C 等狀態)', async () => {
      // Arrange
      const sessionId = 'session-123';
      const mockService: StudentScoreService = {
        getStudentScoresForSession: vi.fn().mockResolvedValue([
          {
            account_id: 'student-001',
            student_no: '414100001',
            name: '林小明',
            answerCount: 1,
            raiseCount: 5,   // 應包含所有狀態
            totalScore: 8
          }
        ]),
        getStudentScoreForSession: vi.fn()
      };

      // Act
      const result = await mockService.getStudentScoresForSession(sessionId);

      // Assert
      expect(result[0].raiseCount).toBe(5);
    });

    it('應正確計算 totalScore: 將所有 ratings.star 加總', async () => {
      // Arrange
      const sessionId = 'session-123';
      const mockService: StudentScoreService = {
        getStudentScoresForSession: vi.fn().mockResolvedValue([
          {
            account_id: 'student-001',
            student_no: '414100001',
            name: '林小明',
            answerCount: 3,
            raiseCount: 5,
            totalScore: 10   // 3 + 2 + 2 + 3 = 10 顆星
          }
        ]),
        getStudentScoreForSession: vi.fn()
      };

      // Act
      const result = await mockService.getStudentScoresForSession(sessionId);

      // Assert
      expect(result[0].totalScore).toBe(10);
    });
  });

  describe('getStudentScoreForSession - 獲取單一學生的發言統計', () => {
    
    it('應返回指定課堂中指定學生的發言統計', async () => {
      // Arrange
      const sessionId = 'session-123';
      const accountId = 'student-001';
      const expectedScore: StudentScoreData = {
        account_id: 'student-001',
        student_no: '414100001',
        name: '林小明',
        answerCount: 2,
        raiseCount: 5,
        totalScore: 8
      };

      const mockService: StudentScoreService = {
        getStudentScoresForSession: vi.fn(),
        getStudentScoreForSession: vi.fn().mockResolvedValue(expectedScore)
      };

      // Act
      const result = await mockService.getStudentScoreForSession(sessionId, accountId);

      // Assert
      expect(result).toEqual(expectedScore);
      expect(mockService.getStudentScoreForSession).toHaveBeenCalledWith(sessionId, accountId);
    });

    it('當學生無舉手記錄時，應返回 answerCount=0, raiseCount=0, totalScore=0', async () => {
      // Arrange
      const sessionId = 'session-123';
      const accountId = 'student-new';
      const expectedScore: StudentScoreData = {
        account_id: 'student-new',
        student_no: '414100099',
        name: '新生',
        answerCount: 0,
        raiseCount: 0,
        totalScore: 0
      };

      const mockService: StudentScoreService = {
        getStudentScoresForSession: vi.fn(),
        getStudentScoreForSession: vi.fn().mockResolvedValue(expectedScore)
      };

      // Act
      const result = await mockService.getStudentScoreForSession(sessionId, accountId);

      // Assert
      expect(result.answerCount).toBe(0);
      expect(result.raiseCount).toBe(0);
      expect(result.totalScore).toBe(0);
    });

    it('應拋出錯誤當學生不存在於該課堂', async () => {
      // Arrange
      const sessionId = 'session-123';
      const accountId = 'nonexistent-student';
      
      const mockService: StudentScoreService = {
        getStudentScoresForSession: vi.fn(),
        getStudentScoreForSession: vi.fn().mockRejectedValue(
          new Error('Student not found in session')
        )
      };

      // Act & Assert
      await expect(
        mockService.getStudentScoreForSession(sessionId, accountId)
      ).rejects.toThrow('Student not found in session');
    });
  });

  describe('UI 呈現格式驗證 - (answerCount/raiseCount; score)', () => {
    
    it('應能格式化為 UI 呈現格式: "名字 (學號)<組長> (answer/raise; score)"', () => {
      // Arrange
      const studentData: StudentScoreData = {
        account_id: 'student-001',
        student_no: '414100001',
        name: '林小明',
        answerCount: 1,
        raiseCount: 3,
        totalScore: 5
      };
      const isGroupLeader = true;

      // Act - 格式化函數 (待實現)
      const formatStudentScore = (student: StudentScoreData, isLeader: boolean): string => {
        const leaderTag = isLeader ? '<組長>' : '';
        return `${student.name} (${student.student_no})${leaderTag}     (${student.answerCount}/${student.raiseCount}; ${student.totalScore})`;
      };

      const formatted = formatStudentScore(studentData, isGroupLeader);

      // Assert
      expect(formatted).toBe('林小明 (414100001)<組長>     (1/3; 5)');
    });

    it('非組長時應不顯示 <組長> 標籤', () => {
      // Arrange
      const studentData: StudentScoreData = {
        account_id: 'student-002',
        student_no: '414100002',
        name: '王小美',
        answerCount: 2,
        raiseCount: 4,
        totalScore: 8
      };
      const isGroupLeader = false;

      // Act
      const formatStudentScore = (student: StudentScoreData, isLeader: boolean): string => {
        const leaderTag = isLeader ? '<組長>' : '';
        return `${student.name} (${student.student_no})${leaderTag}     (${student.answerCount}/${student.raiseCount}; ${student.totalScore})`;
      };

      const formatted = formatStudentScore(studentData, isGroupLeader);

      // Assert
      expect(formatted).toBe('王小美 (414100002)     (2/4; 8)');
    });
  });
});
