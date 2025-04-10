/**
 * DiffGenerator组件单元测试
 * 
 * 创建时间: 2025年4月9日 10:40:12 CST
 * 创建者: Claude 3.7 Sonnet
 */

'use strict';

// 导入被测试模块
const DiffGenerator = require('../../../services/sync/DiffGenerator');

describe('DiffGenerator', () => {
  let diffGenerator;
  
  // 在每个测试前创建实例
  beforeEach(() => {
    diffGenerator = new DiffGenerator();
  });
  
  // 基本功能测试
  describe('基本功能', () => {
    test('初始化应创建有效实例', () => {
      expect(diffGenerator).toBeDefined();
      expect(typeof diffGenerator.generateDiff).toBe('function');
      expect(typeof diffGenerator.applyDiff).toBe('function');
    });
    
    test('空对象比较应返回空差异', () => {
      const obj1 = {};
      const obj2 = {};
      const diff = diffGenerator.generateDiff(obj1, obj2);
      expect(diff).toEqual({
        type: 'object',
        changes: {}
      });
    });
    
    test('相同对象比较应返回空差异', () => {
      const obj1 = { a: 1, b: 'test', c: true };
      const obj2 = { a: 1, b: 'test', c: true };
      const diff = diffGenerator.generateDiff(obj1, obj2);
      expect(diff).toEqual({
        type: 'object',
        changes: {}
      });
    });
  });
  
  // 对象比较测试
  describe('对象比较', () => {
    test('基本属性变更检测', () => {
      const oldObj = { a: 1, b: 'test', c: true };
      const newObj = { a: 2, b: 'test', c: false };
      
      const diff = diffGenerator.generateDiff(oldObj, newObj);
      
      // 验证差异包含变更的字段
      expect(diff.changes).toHaveProperty('a');
      expect(diff.changes).toHaveProperty('c');
      expect(diff.changes).not.toHaveProperty('b');
      
      // 验证变更内容
      expect(diff.changes.a).toEqual({
        oldValue: 1,
        newValue: 2
      });
      
      expect(diff.changes.c).toEqual({
        oldValue: true,
        newValue: false
      });
    });
    
    test('属性增加检测', () => {
      const oldObj = { a: 1, b: 'test' };
      const newObj = { a: 1, b: 'test', c: true, d: [1, 2] };
      
      const diff = diffGenerator.generateDiff(oldObj, newObj);
      
      // 验证差异包含新增字段
      expect(diff.changes).toHaveProperty('c');
      expect(diff.changes).toHaveProperty('d');
      
      // 验证新增字段变更类型
      expect(diff.changes.c).toEqual({
        action: 'add',
        newValue: true
      });
      
      expect(diff.changes.d).toEqual({
        action: 'add',
        newValue: [1, 2]
      });
    });
    
    test('属性删除检测', () => {
      const oldObj = { a: 1, b: 'test', c: true, d: [1, 2] };
      const newObj = { a: 1, b: 'test' };
      
      const diff = diffGenerator.generateDiff(oldObj, newObj);
      
      // 验证差异包含删除字段
      expect(diff.changes).toHaveProperty('c');
      expect(diff.changes).toHaveProperty('d');
      
      // 验证删除字段变更类型
      expect(diff.changes.c).toEqual({
        action: 'remove',
        oldValue: true
      });
      
      expect(diff.changes.d).toEqual({
        action: 'remove',
        oldValue: [1, 2]
      });
    });
    
    test('嵌套对象变更检测', () => {
      const oldObj = {
        user: {
          name: 'John',
          profile: {
            age: 30,
            email: 'john@example.com'
          }
        }
      };
      
      const newObj = {
        user: {
          name: 'John',
          profile: {
            age: 31,
            email: 'john.doe@example.com'
          }
        }
      };
      
      const diff = diffGenerator.generateDiff(oldObj, newObj);
      
      // 验证嵌套路径差异
      expect(diff.changes).toHaveProperty('user.profile.age');
      expect(diff.changes).toHaveProperty('user.profile.email');
      
      // 验证嵌套变更内容
      expect(diff.changes['user.profile.age']).toEqual({
        oldValue: 30,
        newValue: 31
      });
      
      expect(diff.changes['user.profile.email']).toEqual({
        oldValue: 'john@example.com',
        newValue: 'john.doe@example.com'
      });
    });
  });
  
  // 数组比较测试
  describe('数组比较', () => {
    test('数组元素变更检测', () => {
      const oldArray = [1, 2, 3, 4];
      const newArray = [1, 5, 3, 6];
      
      const diff = diffGenerator.generateDiff(oldArray, newArray);
      
      // 验证差异类型和结构
      expect(diff.type).toBe('array');
      expect(diff.changes).toHaveProperty('1');
      expect(diff.changes).toHaveProperty('3');
      
      // 验证变更内容
      expect(diff.changes['1']).toEqual({
        oldValue: 2,
        newValue: 5
      });
      
      expect(diff.changes['3']).toEqual({
        oldValue: 4,
        newValue: 6
      });
    });
    
    test('数组长度变更 - 增加元素', () => {
      const oldArray = [1, 2, 3];
      const newArray = [1, 2, 3, 4, 5];
      
      const diff = diffGenerator.generateDiff(oldArray, newArray);
      
      // 验证增加的元素
      expect(diff.changes).toHaveProperty('3');
      expect(diff.changes).toHaveProperty('4');
      
      expect(diff.changes['3']).toEqual({
        action: 'add',
        newValue: 4
      });
      
      expect(diff.changes['4']).toEqual({
        action: 'add',
        newValue: 5
      });
      
      // 验证元素数量变更
      expect(diff.lengthChanged).toBe(true);
      expect(diff.oldLength).toBe(3);
      expect(diff.newLength).toBe(5);
    });
    
    test('数组长度变更 - 删除元素', () => {
      const oldArray = [1, 2, 3, 4, 5];
      const newArray = [1, 2, 3];
      
      const diff = diffGenerator.generateDiff(oldArray, newArray);
      
      // 验证删除的元素
      expect(diff.changes).toHaveProperty('3');
      expect(diff.changes).toHaveProperty('4');
      
      expect(diff.changes['3']).toEqual({
        action: 'remove',
        oldValue: 4
      });
      
      expect(diff.changes['4']).toEqual({
        action: 'remove',
        oldValue: 5
      });
      
      // 验证元素数量变更
      expect(diff.lengthChanged).toBe(true);
      expect(diff.oldLength).toBe(5);
      expect(diff.newLength).toBe(3);
    });
    
    test('复杂对象数组比较', () => {
      const oldArray = [
        { id: 1, name: 'Item 1' },
        { id: 2, name: 'Item 2' },
        { id: 3, name: 'Item 3' }
      ];
      
      const newArray = [
        { id: 1, name: 'Item 1 Updated' },
        { id: 2, name: 'Item 2' },
        { id: 4, name: 'Item 4' }
      ];
      
      // 使用ID字段作为对象标识符
      const diff = diffGenerator.generateDiff(oldArray, newArray, { 
        objectIdentifier: 'id'
      });
      
      // 验证基于ID的变更
      expect(diff.changes).toHaveProperty('0.name');
      expect(diff.changes).toHaveProperty('2');
      
      expect(diff.changes['0.name']).toEqual({
        oldValue: 'Item 1',
        newValue: 'Item 1 Updated'
      });
      
      // ID为3的对象被ID为4的对象替换
      expect(diff.changes['2']).toEqual({
        oldValue: { id: 3, name: 'Item 3' },
        newValue: { id: 4, name: 'Item 4' }
      });
    });
  });
  
  // 应用差异测试
  describe('应用差异', () => {
    test('应用对象差异', () => {
      const oldObj = { a: 1, b: 'test', c: true };
      const newObj = { a: 2, b: 'test', d: 'added' };
      
      // 先生成差异
      const diff = diffGenerator.generateDiff(oldObj, newObj);
      
      // 应用差异到原对象
      const result = diffGenerator.applyDiff(oldObj, diff);
      
      // 验证结果
      expect(result).toEqual(newObj);
      expect(result.a).toBe(2);        // 修改
      expect(result.b).toBe('test');   // 保持不变
      expect(result.c).toBeUndefined(); // 删除
      expect(result.d).toBe('added');  // 新增
    });
    
    test('应用数组差异', () => {
      const oldArray = [1, 2, 3, 4];
      const newArray = [1, 5, 3, 6, 7];
      
      // 先生成差异
      const diff = diffGenerator.generateDiff(oldArray, newArray);
      
      // 应用差异到原数组
      const result = diffGenerator.applyDiff(oldArray, diff);
      
      // 验证结果
      expect(result).toEqual(newArray);
      expect(result.length).toBe(5);
    });
    
    test('应用嵌套对象差异', () => {
      const oldObj = {
        user: {
          name: 'John',
          profile: {
            age: 30,
            email: 'john@example.com'
          }
        },
        settings: {
          theme: 'dark'
        }
      };
      
      const newObj = {
        user: {
          name: 'John',
          profile: {
            age: 31,
            email: 'john.doe@example.com'
          }
        },
        settings: {
          theme: 'light',
          notifications: true
        }
      };
      
      // 先生成差异
      const diff = diffGenerator.generateDiff(oldObj, newObj);
      
      // 应用差异到原对象
      const result = diffGenerator.applyDiff(oldObj, diff);
      
      // 验证结果
      expect(result).toEqual(newObj);
      expect(result.user.profile.age).toBe(31);
      expect(result.user.profile.email).toBe('john.doe@example.com');
      expect(result.settings.theme).toBe('light');
      expect(result.settings.notifications).toBe(true);
    });
  });
  
  // 差异格式优化测试
  describe('差异格式优化', () => {
    test('简洁差异格式', () => {
      const oldObj = { a: 1, b: 'test', c: [1, 2, 3], d: { nested: true } };
      const newObj = { a: 2, b: 'test', c: [1, 2, 4], d: { nested: false } };
      
      // 使用简洁格式选项
      const diff = diffGenerator.generateDiff(oldObj, newObj, { format: 'compact' });
      
      // 验证差异格式包含必要信息且更紧凑
      expect(diff.changes.a).toBeDefined();
      expect(diff.changes['c.2']).toBeDefined();
      expect(diff.changes['d.nested']).toBeDefined();
      
      // 验证简洁格式没有多余信息
      expect(diff.type).toBeUndefined();
      expect(diff.stats).toBeUndefined();
    });
    
    test('完整差异格式带统计信息', () => {
      const oldObj = { a: 1, b: 'test', c: true, d: [1, 2] };
      const newObj = { a: 2, b: 'test', e: 'new', f: { nested: true } };
      
      // 使用完整格式选项
      const diff = diffGenerator.generateDiff(oldObj, newObj, { 
        format: 'detailed',
        includeStats: true 
      });
      
      // 验证差异包含统计信息
      expect(diff.stats).toBeDefined();
      expect(diff.stats.changedProperties).toBe(1);  // a变更
      expect(diff.stats.addedProperties).toBe(2);    // e和f新增
      expect(diff.stats.removedProperties).toBe(2);  // c和d删除
      expect(diff.stats.totalChanges).toBe(5);
    });
  });
  
  // 性能测试
  describe('性能测试', () => {
    test('大对象差异性能', () => {
      // 创建两个大对象
      const oldObj = {};
      const newObj = {};
      
      // 添加1000个属性
      for (let i = 0; i < 1000; i++) {
        oldObj[`prop_${i}`] = i;
        // 修改一部分属性，保持一部分不变
        newObj[`prop_${i}`] = i % 3 === 0 ? i + 1 : i;
      }
      
      // 测量差异生成性能
      const startTime = Date.now();
      const diff = diffGenerator.generateDiff(oldObj, newObj);
      const endTime = Date.now();
      
      const duration = endTime - startTime;
      console.log(`大对象差异计算耗时: ${duration}ms`);
      
      // 验证性能在可接受范围内
      expect(duration).toBeLessThan(100); // 100ms以内
      
      // 验证差异内容的正确性
      expect(Object.keys(diff.changes).length).toBe(334); // 约1000/3个修改
    });
    
    test('大数组差异性能', () => {
      // 创建两个大数组
      const oldArray = [];
      const newArray = [];
      
      // 添加1000个元素
      for (let i = 0; i < 1000; i++) {
        oldArray.push(i);
        // 修改一部分元素，保持一部分不变
        newArray.push(i % 4 === 0 ? i + 1 : i);
      }
      
      // 测量差异生成性能
      const startTime = Date.now();
      const diff = diffGenerator.generateDiff(oldArray, newArray);
      const endTime = Date.now();
      
      const duration = endTime - startTime;
      console.log(`大数组差异计算耗时: ${duration}ms`);
      
      // 验证性能在可接受范围内
      expect(duration).toBeLessThan(100); // 100ms以内
      
      // 验证差异内容的正确性
      expect(Object.keys(diff.changes).length).toBe(250); // 约1000/4个修改
    });
  });
}); 