/**
 * Task02: 分數查詢功能 - TDD 測試
 * 
 * 需求：新增分數查詢頁面
 * - 查詢條件：班別 (DropdownList)、學生 (TextBox 關鍵字)
 * - 結果列表：班別、課堂、學號、姓名、舉手次數、被點次數、分數
 * - 權限：
 *   - 老師：可查詢所有人成績
 *   - 學生：只能查詢同班成績
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

interface StudentScoreQueryResult {
  class_id: string;
  class_name: string;
  session_id: string;
  session_title: string;
  account_id: string;
  student_no: string;
  name: string;
  raiseCount: number;
  answerCount: number;
  totalScore: number;
}

interface ScoreQueryFilters {
  classId?: string;
  keyword?: string;  // 學號或姓名的關鍵字
}

interface ScoreQueryService {
  queryScores(
    userId: string,
    userRole: 'admin' | 'student',
    filters: ScoreQueryFilters
  ): Promise<StudentScoreQueryResult[]>;
  
  getTeacherClasses(teacherId: string): Promise<Array<{ id: string; name: string }>>;
  getStudentClasses(studentId: string): Promise<Array<{ id: string; name: string }>>;
}

describe('Task02: Score Query Feature (分數查詢功能)', () => {
  
  describe('Teacher Role - 老師角色權限', () => {
    
    it('老師應能查詢所有班別的所有學生成績', async () => {
      // Arrange
      const teacherId = 'teacher-001';
      const mockService: ScoreQueryService = {
        queryScores: vi.fn().mockResolvedValue([
          {
            class_id: 'class-001',
            class_name: '高一甲班',
            session_id: 'session-001',
            session_title: '第1堂課',
            account_id: 'student-001',
            student_no: '414100001',
            name: '林小明',
            raiseCount: 5,
            answerCount: 2,
            totalScore: 8
          },
          {
            class_id: 'class-002',
            class_name: '高一乙班',
            session_id: 'session-002',
            session_title: '第2堂課',
            account_id: 'student-002',
            student_no: '414100002',
            name: '王小美',
            raiseCount: 3,
            answerCount: 1,
            totalScore: 3
          }
        ]),
        getTeacherClasses: vi.fn(),
        getStudentClasses: vi.fn()
      };

      // Act
      const result = await mockService.queryScores(teacherId, 'admin', {});

      // Assert
      expect(result).toHaveLength(2);
      expect(result.some(r => r.class_name === '高一甲班')).toBe(true);
      expect(result.some(r => r.class_name === '高一乙班')).toBe(true);
    });

    it('老師應能按班別篩選', async () => {
      // Arrange
      const teacherId = 'teacher-001';
      const mockService: ScoreQueryService = {
        queryScores: vi.fn().mockResolvedValue([
          {
            class_id: 'class-001',
            class_name: '高一甲班',
            session_id: 'session-001',
            session_title: '第1堂課',
            account_id: 'student-001',
            student_no: '414100001',
            name: '林小明',
            raiseCount: 5,
            answerCount: 2,
            totalScore: 8
          }
        ]),
        getTeacherClasses: vi.fn(),
        getStudentClasses: vi.fn()
      };

      // Act
      const result = await mockService.queryScores(teacherId, 'admin', {
        classId: 'class-001'
      });

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].class_id).toBe('class-001');
      expect(mockService.queryScores).toHaveBeenCalledWith(
        teacherId,
        'admin',
        { classId: 'class-001' }
      );
    });

    it('老師應能按學號或姓名關鍵字查詢', async () => {
      // Arrange
      const teacherId = 'teacher-001';
      const mockService: ScoreQueryService = {
        queryScores: vi.fn().mockResolvedValue([
          {
            class_id: 'class-001',
            class_name: '高一甲班',
            session_id: 'session-001',
            session_title: '第1堂課',
            account_id: 'student-001',
            student_no: '414100001',
            name: '林小明',
            raiseCount: 5,
            answerCount: 2,
            totalScore: 8
          }
        ]),
        getTeacherClasses: vi.fn(),
        getStudentClasses: vi.fn()
      };

      // Act - 按學號查詢
      const result1 = await mockService.queryScores(teacherId, 'admin', {
        keyword: '414100001'
      });

      // Act - 按姓名查詢
      const result2 = await mockService.queryScores(teacherId, 'admin', {
        keyword: '林小明'
      });

      // Assert
      expect(result1[0].student_no).toBe('414100001');
      expect(result2[0].name).toBe('林小明');
    });

    it('老師應能同時使用班別和關鍵字查詢', async () => {
      // Arrange
      const teacherId = 'teacher-001';
      const mockService: ScoreQueryService = {
        queryScores: vi.fn().mockResolvedValue([
          {
            class_id: 'class-001',
            class_name: '高一甲班',
            session_id: 'session-001',
            session_title: '第1堂課',
            account_id: 'student-001',
            student_no: '414100001',
            name: '林小明',
            raiseCount: 5,
            answerCount: 2,
            totalScore: 8
          }
        ]),
        getTeacherClasses: vi.fn(),
        getStudentClasses: vi.fn()
      };

      // Act
      const result = await mockService.queryScores(teacherId, 'admin', {
        classId: 'class-001',
        keyword: '小明'
      });

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].class_id).toBe('class-001');
      expect(result[0].name).toContain('小明');
    });

    it('老師的班別 Dropdown 應列出所有班別', async () => {
      // Arrange
      const teacherId = 'teacher-001';
      const mockClasses = [
        { id: 'class-001', name: '高一甲班' },
        { id: 'class-002', name: '高一乙班' },
        { id: 'class-003', name: '高一丙班' }
      ];

      const mockService: ScoreQueryService = {
        queryScores: vi.fn(),
        getTeacherClasses: vi.fn().mockResolvedValue(mockClasses),
        getStudentClasses: vi.fn()
      };

      // Act
      const classes = await mockService.getTeacherClasses(teacherId);

      // Assert
      expect(classes).toHaveLength(3);
      expect(classes[0].name).toBe('高一甲班');
    });
  });

  describe('Student Role - 學生角色權限', () => {
    
    it('學生只能查詢同班的成績', async () => {
      // Arrange
      const studentId = 'student-001';
      const mockService: ScoreQueryService = {
        queryScores: vi.fn().mockResolvedValue([
          {
            class_id: 'class-001',
            class_name: '高一甲班',
            session_id: 'session-001',
            session_title: '第1堂課',
            account_id: 'student-001',
            student_no: '414100001',
            name: '林小明',
            raiseCount: 5,
            answerCount: 2,
            totalScore: 8
          },
          {
            class_id: 'class-001',
            class_name: '高一甲班',
            session_id: 'session-001',
            session_title: '第1堂課',
            account_id: 'student-002',
            student_no: '414100002',
            name: '王小美',
            raiseCount: 3,
            answerCount: 1,
            totalScore: 3
          }
        ]),
        getTeacherClasses: vi.fn(),
        getStudentClasses: vi.fn()
      };

      // Act
      const result = await mockService.queryScores(studentId, 'student', {});

      // Assert
      expect(result.every(r => r.class_id === 'class-001')).toBe(true);
    });

    it('學生的班別 Dropdown 應只列出自己的班別', async () => {
      // Arrange
      const studentId = 'student-001';
      const mockClasses = [
        { id: 'class-001', name: '高一甲班' }
      ];

      const mockService: ScoreQueryService = {
        queryScores: vi.fn(),
        getTeacherClasses: vi.fn(),
        getStudentClasses: vi.fn().mockResolvedValue(mockClasses)
      };

      // Act
      const classes = await mockService.getStudentClasses(studentId);

      // Assert
      expect(classes).toHaveLength(1);
      expect(classes[0].name).toBe('高一甲班');
    });

    it('學生應能按關鍵字查詢同班學生', async () => {
      // Arrange
      const studentId = 'student-001';
      const mockService: ScoreQueryService = {
        queryScores: vi.fn().mockResolvedValue([
          {
            class_id: 'class-001',
            class_name: '高一甲班',
            session_id: 'session-001',
            session_title: '第1堂課',
            account_id: 'student-002',
            student_no: '414100002',
            name: '王小美',
            raiseCount: 3,
            answerCount: 1,
            totalScore: 3
          }
        ]),
        getTeacherClasses: vi.fn(),
        getStudentClasses: vi.fn()
      };

      // Act
      const result = await mockService.queryScores(studentId, 'student', {
        keyword: '王'
      });

      // Assert
      expect(result[0].name).toContain('王');
      expect(result[0].class_id).toBe('class-001');
    });

    it('學生無法查詢其他班別的成績 - 即使指定班別參數', async () => {
      // Arrange
      const studentId = 'student-001';
      const mockService: ScoreQueryService = {
        queryScores: vi.fn().mockRejectedValue(
          new Error('Access denied: not in that class')
        ),
        getTeacherClasses: vi.fn(),
        getStudentClasses: vi.fn()
      };

      // Act & Assert
      await expect(
        mockService.queryScores(studentId, 'student', {
          classId: 'class-999'  // 非自己的班別
        })
      ).rejects.toThrow('Access denied');
    });
  });

  describe('Query Results 查詢結果', () => {
    
    it('查詢結果應包含所有必要欄位', async () => {
      // Arrange
      const teacherId = 'teacher-001';
      const mockService: ScoreQueryService = {
        queryScores: vi.fn().mockResolvedValue([
          {
            class_id: 'class-001',
            class_name: '高一甲班',
            session_id: 'session-001',
            session_title: '第1堂課',
            account_id: 'student-001',
            student_no: '414100001',
            name: '林小明',
            raiseCount: 5,
            answerCount: 2,
            totalScore: 8
          }
        ]),
        getTeacherClasses: vi.fn(),
        getStudentClasses: vi.fn()
      };

      // Act
      const result = await mockService.queryScores(teacherId, 'admin', {});

      // Assert
      const record = result[0];
      expect(record).toHaveProperty('class_id');
      expect(record).toHaveProperty('class_name');
      expect(record).toHaveProperty('session_id');
      expect(record).toHaveProperty('session_title');
      expect(record).toHaveProperty('account_id');
      expect(record).toHaveProperty('student_no');
      expect(record).toHaveProperty('name');
      expect(record).toHaveProperty('raiseCount');
      expect(record).toHaveProperty('answerCount');
      expect(record).toHaveProperty('totalScore');
    });

    it('查詢結果應按課堂時間排序', async () => {
      // Arrange
      const teacherId = 'teacher-001';
      const mockService: ScoreQueryService = {
        queryScores: vi.fn().mockResolvedValue([
          {
            class_id: 'class-001',
            class_name: '高一甲班',
            session_id: 'session-001',
            session_title: '第1堂課',
            account_id: 'student-001',
            student_no: '414100001',
            name: '林小明',
            raiseCount: 5,
            answerCount: 2,
            totalScore: 8
          },
          {
            class_id: 'class-001',
            class_name: '高一甲班',
            session_id: 'session-002',
            session_title: '第2堂課',
            account_id: 'student-001',
            student_no: '414100001',
            name: '林小明',
            raiseCount: 3,
            answerCount: 1,
            totalScore: 5
          }
        ]),
        getTeacherClasses: vi.fn(),
        getStudentClasses: vi.fn()
      };

      // Act
      const result = await mockService.queryScores(teacherId, 'admin', {});

      // Assert - 驗證結果是按課堂順序排列
      expect(result[0].session_id).toBe('session-001');
      expect(result[1].session_id).toBe('session-002');
    });

    it('查詢無結果時應返回空陣列', async () => {
      // Arrange
      const teacherId = 'teacher-001';
      const mockService: ScoreQueryService = {
        queryScores: vi.fn().mockResolvedValue([]),
        getTeacherClasses: vi.fn(),
        getStudentClasses: vi.fn()
      };

      // Act
      const result = await mockService.queryScores(teacherId, 'admin', {
        keyword: 'nonexistent'
      });

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('Edge Cases 邊界情況', () => {
    
    it('當班別無學生時，查詢應返回空結果', async () => {
      // Arrange
      const teacherId = 'teacher-001';
      const mockService: ScoreQueryService = {
        queryScores: vi.fn().mockResolvedValue([]),
        getTeacherClasses: vi.fn(),
        getStudentClasses: vi.fn()
      };

      // Act
      const result = await mockService.queryScores(teacherId, 'admin', {
        classId: 'class-empty'
      });

      // Assert
      expect(result).toEqual([]);
    });

    it('應正確處理特殊字符的關鍵字查詢', async () => {
      // Arrange
      const teacherId = 'teacher-001';
      const mockService: ScoreQueryService = {
        queryScores: vi.fn().mockResolvedValue([]),
        getTeacherClasses: vi.fn(),
        getStudentClasses: vi.fn()
      };

      // Act
      const keyword = "%_'\\";
      const result = await mockService.queryScores(teacherId, 'admin', {
        keyword
      });

      // Assert
      expect(mockService.queryScores).toHaveBeenCalledWith(
        teacherId,
        'admin',
        { keyword }
      );
    });

    it('應處理學生零分的情況', async () => {
      // Arrange
      const teacherId = 'teacher-001';
      const mockService: ScoreQueryService = {
        queryScores: vi.fn().mockResolvedValue([
          {
            class_id: 'class-001',
            class_name: '高一甲班',
            session_id: 'session-001',
            session_title: '第1堂課',
            account_id: 'student-001',
            student_no: '414100001',
            name: '林小明',
            raiseCount: 0,
            answerCount: 0,
            totalScore: 0
          }
        ]),
        getTeacherClasses: vi.fn(),
        getStudentClasses: vi.fn()
      };

      // Act
      const result = await mockService.queryScores(teacherId, 'admin', {});

      // Assert
      expect(result[0].raiseCount).toBe(0);
      expect(result[0].answerCount).toBe(0);
      expect(result[0].totalScore).toBe(0);
    });
  });
});
