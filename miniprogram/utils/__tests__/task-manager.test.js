/**
 * 任务管理器单元测试
 * 测试任务管理器的核心功能，包括任务创建、状态更新、进度跟踪等
 */

const TaskManager = require('../task-manager');
const EventBus = require('../eventBus');

describe('TaskManager', () => {
  beforeEach(() => {
    // 重置任务管理器状态
    TaskManager.init();
    
    // 监听EventBus
    jest.spyOn(EventBus, 'emit');
    
    // 模拟wx.getStorage和wx.setStorage
    wx.getStorage = jest.fn();
    wx.setStorage = jest.fn();
  });
  
  afterEach(() => {
    jest.clearAllMocks();
  });
  
  describe('初始化', () => {
    test('init应该正确初始化任务管理器', () => {
      expect(TaskManager.taskMap).toEqual({});
    });
    
    test('checkInterruptedTasks应该加载并恢复中断的任务', () => {
      // 模拟存储中的任务数据
      wx.getStorage = jest.fn().mockImplementation(options => {
        if (options.key === 'tasks') {
          options.success({
            data: {
              'task_1': {
                id: 'task_1',
                type: 'upload',
                status: 'pending',
                data: { tempFilePath: '/tmp/file1.jpg' },
                createdAt: new Date().toISOString()
              },
              'task_2': {
                id: 'task_2',
                type: 'upload',
                status: 'failed',
                data: { tempFilePath: '/tmp/file2.jpg' },
                createdAt: new Date().toISOString()
              }
            }
          });
        }
      });
      
      TaskManager.checkInterruptedTasks();
      
      // 延迟验证，因为checkInterruptedTasks内部使用了setTimeout
      jest.runAllTimers();
      
      expect(wx.getStorage).toHaveBeenCalledWith(expect.objectContaining({
        key: 'tasks'
      }));
      
      expect(EventBus.emit).toHaveBeenCalledWith('task:resume', expect.any(Object));
    });
  });
  
  describe('任务管理', () => {
    test('createTask应该创建并返回新任务', () => {
      const task = TaskManager.createTask('upload', { tempFilePath: '/tmp/file.jpg' });
      
      expect(task).toMatchObject({
        id: expect.any(String),
        type: 'upload',
        status: 'created',
        data: { tempFilePath: '/tmp/file.jpg' },
        createdAt: expect.any(String)
      });
      
      expect(TaskManager.taskMap[task.id]).toBe(task);
      expect(EventBus.emit).toHaveBeenCalledWith('task:created', { task });
      expect(wx.setStorage).toHaveBeenCalled();
    });
    
    test('getTask应该返回正确的任务', () => {
      const task = TaskManager.createTask('upload', { photoId: '123' });
      const retrievedTask = TaskManager.getTask(task.id);
      
      expect(retrievedTask).toBe(task);
      
      const nonExistentTask = TaskManager.getTask('non_existent_id');
      expect(nonExistentTask).toBeUndefined();
    });
    
    test('getTasks应该返回符合条件的任务列表', () => {
      TaskManager.createTask('upload', { photoId: '123' });
      TaskManager.createTask('upload', { photoId: '456' });
      TaskManager.createTask('download', { fileId: '789' });
      
      const uploadTasks = TaskManager.getTasks('upload');
      expect(uploadTasks.length).toBe(2);
      expect(uploadTasks[0].type).toBe('upload');
      
      const downloadTasks = TaskManager.getTasks('download');
      expect(downloadTasks.length).toBe(1);
      expect(downloadTasks[0].type).toBe('download');
      
      const allTasks = TaskManager.getTasks();
      expect(allTasks.length).toBe(3);
    });
    
    test('updateTaskStatus应该正确更新任务状态', () => {
      const task = TaskManager.createTask('upload', { photoId: '123' });
      
      TaskManager.updateTaskStatus(task.id, 'processing');
      expect(task.status).toBe('processing');
      expect(EventBus.emit).toHaveBeenCalledWith('task:status:changed', {
        taskId: task.id,
        status: 'processing',
        previousStatus: 'created'
      });
      
      // 添加结果数据
      TaskManager.updateTaskStatus(task.id, 'completed', { url: 'https://example.com/photo.jpg' });
      expect(task.status).toBe('completed');
      expect(task.result).toEqual({ url: 'https://example.com/photo.jpg' });
      expect(EventBus.emit).toHaveBeenCalledWith('task:completed', { task });
      
      // 状态错误时应该抛出错误
      expect(() => {
        TaskManager.updateTaskStatus('non_existent_id', 'processing');
      }).toThrow();
    });
    
    test('updateTaskProgress应该正确更新任务进度', () => {
      const task = TaskManager.createTask('upload', { photoId: '123' });
      
      TaskManager.updateTaskProgress(task.id, 50);
      expect(task.progress).toBe(50);
      expect(EventBus.emit).toHaveBeenCalledWith('task:progress', {
        taskId: task.id,
        progress: 50
      });
      
      // 使用不存在的ID时应该抛出错误
      expect(() => {
        TaskManager.updateTaskProgress('non_existent_id', 75);
      }).toThrow();
    });
    
    test('removeTask应该从管理器中移除任务', () => {
      const task = TaskManager.createTask('upload', { photoId: '123' });
      
      expect(TaskManager.taskMap[task.id]).toBeDefined();
      
      TaskManager.removeTask(task.id);
      
      expect(TaskManager.taskMap[task.id]).toBeUndefined();
      expect(EventBus.emit).toHaveBeenCalledWith('task:removed', { taskId: task.id });
      expect(wx.setStorage).toHaveBeenCalled();
    });
  });
  
  describe('批量操作', () => {
    beforeEach(() => {
      // 创建多个测试任务
      TaskManager.createTask('upload', { photoId: '123' });
      TaskManager.createTask('upload', { photoId: '456' });
      
      const task = TaskManager.createTask('download', { fileId: '789' });
      TaskManager.updateTaskStatus(task.id, 'completed');
    });
    
    test('cleanCompletedTasks应该移除所有已完成的任务', () => {
      const tasksBefore = TaskManager.getTasks();
      expect(tasksBefore.length).toBe(3);
      
      const completedBefore = TaskManager.getTasks().filter(t => t.status === 'completed');
      expect(completedBefore.length).toBe(1);
      
      TaskManager.cleanCompletedTasks();
      
      const tasksAfter = TaskManager.getTasks();
      expect(tasksAfter.length).toBe(2); // 3 - 1 = 2
      
      const completedAfter = TaskManager.getTasks().filter(t => t.status === 'completed');
      expect(completedAfter.length).toBe(0);
      
      expect(EventBus.emit).toHaveBeenCalledWith('task:cleaned', expect.any(Object));
    });
    
    test('getTaskStats应该返回正确的任务统计信息', () => {
      const stats = TaskManager.getTaskStats();
      
      expect(stats).toMatchObject({
        total: 3,
        byType: {
          upload: 2,
          download: 1
        },
        byStatus: {
          created: 2,
          completed: 1
        }
      });
    });
  });
}); 