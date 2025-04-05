import { jest } from '@jest/globals'
import { mkdir, writeFile, appendFile } from 'fs/promises'
import { join } from 'path'
import { LogManager } from '../../src/managers/LogManager.js'

jest.mock('fs/promises')

describe('LogManager', () => {
    let logManager: LogManager
    const testLogDir = 'test-logs'
    const mockConsoleLog = jest.spyOn(console, 'log')
    const mockConsoleError = jest.spyOn(console, 'error')

    beforeEach(() => {
        jest.clearAllMocks()
        logManager = new LogManager({ logDir: testLogDir })
    })

    test('初始化时创建日志目录', () => {
        expect(mkdir).toHaveBeenCalledWith(testLogDir, { recursive: true })
    })

    test('写入info日志', async () => {
        const message = '测试信息'
        const context = { test: true }
        
        await logManager.info(message, context)
        
        expect(appendFile).toHaveBeenCalledTimes(1)
        const logCall = (appendFile as jest.Mock).mock.calls[0]
        expect(logCall[0]).toBe(join(testLogDir, 'exobrain.log'))
        expect(logCall[1]).toMatch(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] INFO \| 测试信息 \| {"test":true}/)
    })

    test('写入error日志', async () => {
        const message = '错误信息'
        
        await logManager.error(message)
        
        expect(appendFile).toHaveBeenCalledTimes(2) // 主日志和错误日志
        expect(mockConsoleError).toHaveBeenCalled()
    })

    test('调试模式下输出debug日志', async () => {
        const debugManager = new LogManager({ logDir: testLogDir, debugMode: true })
        const message = '调试信息'
        
        await debugManager.debug(message)
        
        expect(appendFile).toHaveBeenCalled()
        expect(mockConsoleLog).toHaveBeenCalled()
    })

    test('非调试模式下不输出debug日志', async () => {
        const message = '调试信息'
        
        await logManager.debug(message)
        
        expect(appendFile).not.toHaveBeenCalled()
        expect(mockConsoleLog).not.toHaveBeenCalled()
    })

    test('清除日志文件', async () => {
        await logManager.clearLogs()
        
        expect(writeFile).toHaveBeenCalledTimes(2)
        expect(writeFile).toHaveBeenCalledWith(
            join(testLogDir, 'exobrain.log'),
            '',
            'utf-8'
        )
        expect(writeFile).toHaveBeenCalledWith(
            join(testLogDir, 'error.log'),
            '',
            'utf-8'
        )
    })

    test('切换调试模式', async () => {
        const message = '调试信息'
        
        logManager.setDebugMode(true)
        await logManager.debug(message)
        expect(appendFile).toHaveBeenCalled()
        expect(mockConsoleLog).toHaveBeenCalled()
        
        jest.clearAllMocks()
        
        logManager.setDebugMode(false)
        await logManager.debug(message)
        expect(appendFile).not.toHaveBeenCalled()
        expect(mockConsoleLog).not.toHaveBeenCalled()
    })

    test('处理文件操作错误', async () => {
        const error = new Error('文件操作失败')
        ;(appendFile as jest.Mock).mockRejectedValueOnce(error)
        
        await logManager.info('测试信息')
        
        expect(mockConsoleError).toHaveBeenCalledWith('写入日志失败:', error)
    })
}) 