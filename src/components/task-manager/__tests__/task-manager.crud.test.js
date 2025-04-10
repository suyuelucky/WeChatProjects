import { jest } from '@jest/globals';
import { TaskManager } from '../index.js';
import { PerformanceMonitor } from '../performance-monitor.js';

describe('TaskManager - CRUD操作测试', () => {
  let taskManager;
  let performanceMonitor;
  let storedData = null;

  // 模拟wx API
  const mockWx = {
    getStorage: jest.fn(async ({ key }) => {
      if (key === 'tasks' && storedData) {
        return { data: storedData };
      }
      throw { errMsg: 'getStorage:fail data not found' };
    }),
    setStorage: jest.fn(async ({ key, data }) => {
      if (key === 'tasks') {
        storedData = data;
      }
    }),
    getStorageInfoSync: jest.fn(() => ({
      currentSize: 0,
      limitSize: 100
    })),
    clearStorage: jest.fn(() => {
      storedData = null;
    })
  };

  global.wx = mockWx;

  beforeEach(() => {
    taskManager = new TaskManager();
    performanceMonitor = new PerformanceMonitor();
    mockWx.clearStorage();
    // 重置mock的调用记录
    jest.clearAllMocks();
  });

  describe('任务更新操作', () => {
    test('更新任务基本信息', async () => {
      await taskManager.initialize();
      const task = await taskManager.createTask({
        title: '原始任务',
        description: '这是原始描述',
        dueDate: new Date('2024-04-07')
      });

      const updatedTask = await taskManager.updateTask(task.id, {
        title: '更新后的任务',
        description: '这是更新后的描述'
      });

      expect(updatedTask.title).toBe('更新后的任务');
      expect(updatedTask.description).toBe('这是更新后的描述');
      expect(updatedTask.dueDate).toEqual(task.dueDate);
    });

    test('更新不存在的任务应该抛出错误', async () => {
      await taskManager.initialize();
      await expect(
        taskManager.updateTask('不存在的ID', {
          title: '更新测试'
        })
      ).rejects.toThrow('任务不存在');
    });
  });

  describe('任务删除操作', () => {
    test('删除单个任务', async () => {
      await taskManager.initialize();
      const task = await taskManager.createTask({
        title: '待删除任务',
        description: '这个任务将被删除'
      });

      await taskManager.deleteTask(task.id);
      const tasks = await taskManager.getAllTasks();
      expect(tasks.length).toBe(0);
    });

    test('删除不存在的任务应该抛出错误', async () => {
      await taskManager.initialize();
      await expect(
        taskManager.deleteTask('不存在的ID')
      ).rejects.toThrow('任务不存在');
    });

    test('批量删除任务', async () => {
      await taskManager.initialize();
      const task1 = await taskManager.createTask({
        title: '任务1',
        description: '描述1'
      });
      const task2 = await taskManager.createTask({
        title: '任务2',
        description: '描述2'
      });

      await taskManager.deleteTasks([task1.id, task2.id]);
      const tasks = await taskManager.getAllTasks();
      expect(tasks.length).toBe(0);
    });
  });

  describe('数据一致性测试', () => {
    test('创建后立即读取应该返回相同数据', async () => {
      await taskManager.initialize();
      const createdTask = await taskManager.createTask({
        title: '一致性测试',
        description: '测试数据一致性',
        dueDate: new Date('2024-04-07')
      });

      const retrievedTask = await taskManager.getTaskById(createdTask.id);
      expect(retrievedTask).toEqual(createdTask);
    });

    test('更新后数据应该持久化', async () => {
      await taskManager.initialize();
      const task = await taskManager.createTask({
        title: '持久化测试',
        description: '测试数据持久化'
      });

      await taskManager.updateTask(task.id, {
        title: '已更新'
      });

      // 重新初始化TaskManager模拟应用重启
      taskManager = new TaskManager();
      await taskManager.initialize();

      const retrievedTask = await taskManager.getTaskById(task.id);
      expect(retrievedTask.title).toBe('已更新');
    });
  });
}); 