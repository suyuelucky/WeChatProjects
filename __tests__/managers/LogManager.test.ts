import { describe, expect, test, beforeEach, jest } from '@jest/globals';
import { join } from 'path';

// 创建模拟函数
const mockMkdir = jest.fn().mockResolvedValue(undefined);
const mockWriteFile = jest.fn().mockResolvedValue(undefined);
const mockAppendFile = jest.fn().mockResolvedValue(undefined);

// 模拟fs/promises模块
jest.mock('fs/promises', () => ({
    mkdir: mockMkdir,
    writeFile: mockWriteFile,
    appendFile: mockAppendFile
}));

// 导入被测试的模块 (必须在模拟之后)
import { LogManager } from '../../src/managers/LogManager.js';

describe('LogManager', () => {
    let logManager: LogManager;
    const testLogDir = 'test-logs';
    const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation(() => {});
    const mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

    beforeEach(() => {
        jest.clearAllMocks();
        logManager = new LogManager({ logDir: testLogDir });
    });

    test('初始化时创建日志目录', () => {
        // 验证mkdir被调用
        expect(mockMkdir).toHaveBeenCalledWith(testLogDir, { recursive: true });
    });

    test('写入info日志', async () => {
        const message = '测试信息';
        const context = { test: true };
        
        await logManager.info(message, context);
        
        expect(mockAppendFile).toHaveBeenCalledTimes(1);
        const logCall = mockAppendFile.mock.calls[0];
        expect(logCall[0]).toBe(join(testLogDir, 'exobrain.log'));
        expect(logCall[1]).toMatch(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] INFO \| 测试信息 \| {"test":true}/);
    });

    test('写入error日志', async () => {
        const message = '错误信息';
        
        await logManager.error(message);
        
        expect(mockAppendFile).toHaveBeenCalledTimes(2); // 主日志和错误日志
        expect(mockConsoleError).toHaveBeenCalled();
    });

    test('调试模式下输出debug日志', async () => {
        // 创建一个新的调试模式日志管理器
        const debugManager = new LogManager({ logDir: testLogDir, debugMode: true });
        const message = '调试信息';
        
        // 重置模拟计数器，因为构造函数已经调用了一些方法
        jest.clearAllMocks();
        
        await debugManager.debug(message);
        
        expect(mockAppendFile).toHaveBeenCalled();
        expect(mockConsoleLog).toHaveBeenCalled();
    });

    test('非调试模式下不输出debug日志', async () => {
        const message = '调试信息';
        
        // 重置模拟计数器
        jest.clearAllMocks();
        
        await logManager.debug(message);
        
        expect(mockAppendFile).not.toHaveBeenCalled();
        expect(mockConsoleLog).not.toHaveBeenCalled();
    });

    test('清除日志文件', async () => {
        await logManager.clearLogs();
        
        expect(mockWriteFile).toHaveBeenCalledTimes(2);
        expect(mockWriteFile).toHaveBeenCalledWith(
            join(testLogDir, 'exobrain.log'),
            '',
            'utf-8'
        );
        expect(mockWriteFile).toHaveBeenCalledWith(
            join(testLogDir, 'error.log'),
            '',
            'utf-8'
        );
    });

    test('切换调试模式', async () => {
        const message = '调试信息';
        
        // 重置模拟计数器
        jest.clearAllMocks();
        
        logManager.setDebugMode(true);
        await logManager.debug(message);
        expect(mockAppendFile).toHaveBeenCalled();
        expect(mockConsoleLog).toHaveBeenCalled();
        
        jest.clearAllMocks();
        
        logManager.setDebugMode(false);
        await logManager.debug(message);
        expect(mockAppendFile).not.toHaveBeenCalled();
        expect(mockConsoleLog).not.toHaveBeenCalled();
    });

    test('处理文件操作错误', async () => {
        const error = new Error('文件操作失败');
        
        // 重置模拟计数器并设置下一次调用抛出错误
        jest.clearAllMocks();
        mockAppendFile.mockRejectedValueOnce(error);
        
        await logManager.info('测试信息');
        
        expect(mockConsoleError).toHaveBeenCalledWith('写入日志失败:', error);
    });

    test('should create instance', () => {
        const logManager = new LogManager();
        expect(logManager).toBeInstanceOf(LogManager);
    });
}); 