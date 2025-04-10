import { jest } from '@jest/globals';
import { TaskManager } from '../index.js';

// 添加Jest的mock设置
const mockWx = {
  getStorage: jest.fn(),
  setStorage: jest.fn(),
  getStorageInfoSync: jest.fn(),
  clearStorage: jest.fn()
};

global.wx = mockWx;

describe('TaskManager - 错误处理测试', () => {
  let taskManager;

  beforeEach(() => {
    taskManager = new TaskManager();
    // 重置所有mock
    jest.clearAllMocks();
    mockWx.clearStorage();

    // 设置默认的mock返回值
    mockWx.getStorage.mockImplementation(async () => {
      throw { errMsg: 'getStorage:fail data not found' };
    });
    mockWx.getStorageInfoSync.mockReturnValue({
      currentSize: 0,
      limitSize: 100
    });
  });

  describe('初始化错误处理', () => {
    test('存储读取失败时应该抛出错误', async () => {
      // 模拟存储读取失败
      mockWx.getStorage.mockRejectedValueOnce(new Error('存储读取失败'));
      
      await expect(taskManager.initialize()).rejects.toThrow('存储读取失败');
    });

    test('未初始化时的操作应该抛出错误', async () => {
      await expect(taskManager.createTask({
        title: '测试任务'
      })).rejects.toThrow('TaskManager未初始化');

      await expect(taskManager.getAllTasks())
        .rejects.toThrow('TaskManager未初始化');
    });
  });

  describe('存储空间处理', () => {
    test('存储空间不足时应该抛出错误', async () => {
      await taskManager.initialize();
      
      // 模拟存储空间接近上限
      mockWx.getStorageInfoSync.mockReturnValueOnce({
        currentSize: 95,
        limitSize: 100
      });

      await expect(taskManager.createTask({
        title: '测试任务',
        description: '测试描述'
      })).rejects.toThrow('存储空间不足');
    });

    test('存储写入失败时应该抛出错误', async () => {
      await taskManager.initialize();
      
      // 模拟存储写入失败
      mockWx.setStorage.mockRejectedValueOnce(new Error('存储写入失败'));

      await expect(taskManager.createTask({
        title: '测试任务'
      })).rejects.toThrow('存储写入失败');
    });
  });

  describe('数据验证', () => {
    test('创建任务时缺少必要字段应该抛出错误', async () => {
      await taskManager.initialize();

      await expect(taskManager.createTask({}))
        .rejects.toThrow('任务标题不能为空');

      await expect(taskManager.createTask({ title: '' }))
        .rejects.toThrow('任务标题不能为空');
    });

    test('更新任务时的无效数据应该抛出错误', async () => {
      await taskManager.initialize();
      
      // 先创建一个任务
      mockWx.getStorageInfoSync.mockReturnValue({
        currentSize: 0,
        limitSize: 100
      });
      
      const task = await taskManager.createTask({
        title: '原始任务',
        description: '原始描述'
      });

      await expect(taskManager.updateTask(task.id, { title: '' }))
        .rejects.toThrow('任务标题不能为空');
    });
  });

  describe('并发操作处理', () => {
    test('并发更新同一任务应该正确处理', async () => {
      await taskManager.initialize();
      
      // 先创建一个任务
      mockWx.getStorageInfoSync.mockReturnValue({
        currentSize: 0,
        limitSize: 100
      });
      
      const task = await taskManager.createTask({
        title: '原始任务',
        description: '原始描述'
      });

      // 同时发起两个更新操作
      const update1 = taskManager.updateTask(task.id, { title: '更新1' });
      const update2 = taskManager.updateTask(task.id, { title: '更新2' });

      await Promise.all([update1, update2]);

      const finalTask = await taskManager.getTaskById(task.id);
      // 最后一次更新应该生效
      expect(finalTask.title).toBe('更新2');
    });
  });
}); 