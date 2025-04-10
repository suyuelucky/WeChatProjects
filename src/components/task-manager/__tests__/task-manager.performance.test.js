import { TaskManager } from '../index.js';
import { PerformanceMonitor } from '../performance-monitor.js';

describe('TaskManager - 性能测试', () => {
  let taskManager;
  let performanceMonitor;

  beforeEach(() => {
    taskManager = new TaskManager();
    performanceMonitor = new PerformanceMonitor();
    wx.clearStorage();
  });

  test('存储操作性能', async () => {
    const startTime = performanceMonitor.startMeasure('storage_write');
    await taskManager.initialize();
    const duration = performanceMonitor.endMeasure('storage_write', startTime);
    expect(duration).toBeLessThan(100); // 存储操作应在100ms内完成
  });

  test('任务操作性能', async () => {
    await taskManager.initialize();
    
    const startTime = performanceMonitor.startMeasure('task_create');
    await taskManager.createTask({
      title: '测试任务',
      description: '这是一个测试任务',
      dueDate: new Date()
    });
    const duration = performanceMonitor.endMeasure('task_create', startTime);
    expect(duration).toBeLessThan(150); // 任务创建应在150ms内完成
  });

  test('批量操作性能', async () => {
    await taskManager.initialize();
    const tasks = [];
    
    const startTime = performanceMonitor.startMeasure('batch_create');
    for (let i = 0; i < 100; i++) {
      tasks.push(taskManager.createTask({
        title: `测试任务 ${i}`,
        description: `这是测试任务 ${i}`,
        dueDate: new Date()
      }));
    }
    await Promise.all(tasks);
    const duration = performanceMonitor.endMeasure('batch_create', startTime);
    expect(duration).toBeLessThan(3000); // 100个任务的创建应在3秒内完成
  });

  test('存储空间使用', async () => {
    await taskManager.initialize();
    const startSize = wx.getStorageInfoSync().currentSize;
    
    await taskManager.createTask({
      title: '大文本任务',
      description: '这是一个包含大量文本的任务'.repeat(100),
      dueDate: new Date()
    });
    
    const endSize = wx.getStorageInfoSync().currentSize;
    const sizeIncrease = endSize - startSize;
    expect(sizeIncrease).toBeLessThan(1024 * 10); // 单个任务不应增加超过10KB存储
  });

  test('极限条件测试', async () => {
    await taskManager.initialize();
    const largeTaskCount = 1000;
    const tasks = [];
    
    const startTime = performanceMonitor.startMeasure('extreme_test');
    for (let i = 0; i < largeTaskCount; i++) {
      tasks.push(taskManager.createTask({
        title: `极限测试任务 ${i}`,
        description: `这是极限测试任务 ${i}`,
        dueDate: new Date()
      }));
    }
    
    try {
      await Promise.all(tasks);
      const duration = performanceMonitor.endMeasure('extreme_test', startTime);
      expect(duration).toBeLessThan(30000); // 1000个任务的创建应在30秒内完成
    } catch (error) {
      // 如果出现存储空间不足的错误，这也是可接受的
      expect(error.message).toContain('存储空间不足');
    }
  });
}); 