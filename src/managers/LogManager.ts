/// <reference types="node" />
import { mkdir, writeFile, appendFile } from 'fs/promises'
import { join } from 'path'
import type { LogEntry } from '../types.js'

interface LogManagerOptions {
    logDir: string;
    debugMode?: boolean;
}

export class LogManager {
    private logDir: string
    private logFile: string
    private errorLogFile: string
    private debugMode: boolean

    constructor(options: LogManagerOptions | string = './logs') {
        if (typeof options === 'string') {
            this.logDir = options;
            this.debugMode = false;
        } else {
            this.logDir = options.logDir;
            this.debugMode = options.debugMode || false;
        }
        this.logFile = join(this.logDir, 'exobrain.log')
        this.errorLogFile = join(this.logDir, 'error.log')
        this.initialize();
    }

    async initialize(): Promise<void> {
        try {
            await mkdir(this.logDir, { recursive: true })
        } catch (error) {
            console.error('创建日志目录失败:', error)
            throw error
        }
    }

    async log(entry: LogEntry): Promise<void> {
        try {
            const logMessage = `[${new Date().toISOString()}] ${entry.level}: ${entry.message}\n`
            await writeFile(this.logFile, logMessage, { flag: 'a' })
        } catch (error) {
            console.error('写入日志失败:', error)
            throw error
        }
    }

    async info(message: string, context?: Record<string, unknown>): Promise<void> {
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] INFO | ${message}${context ? ' | ' + JSON.stringify(context) : ''}\n`;
        try {
            await appendFile(this.logFile, logMessage);
        } catch (error) {
            console.error('写入日志失败:', error);
        }
    }

    async error(message: string, error?: Error): Promise<void> {
        const timestamp = new Date().toISOString();
        const errorDetails = error ? ` | ${error.name}: ${error.message}` : '';
        const logMessage = `[${timestamp}] ERROR | ${message}${errorDetails}\n`;
        
        try {
            await appendFile(this.logFile, logMessage);
            await appendFile(this.errorLogFile, logMessage);
            console.error(`[${timestamp}] ERROR:`, message, error || '');
        } catch (err) {
            console.error('写入错误日志失败:', err);
        }
    }

    async debug(message: string, data?: unknown): Promise<void> {
        if (!this.debugMode) return;
        
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] DEBUG | ${message}${data ? ' | ' + JSON.stringify(data) : ''}\n`;
        
        try {
            await appendFile(this.logFile, logMessage);
            console.log(`[${timestamp}] DEBUG:`, message, data || '');
        } catch (error) {
            console.error('写入调试日志失败:', error);
        }
    }

    async clearLogs(): Promise<void> {
        try {
            await writeFile(this.logFile, '', 'utf-8');
            await writeFile(this.errorLogFile, '', 'utf-8');
        } catch (error) {
            console.error('清除日志失败:', error);
        }
    }

    setDebugMode(enabled: boolean): void {
        this.debugMode = enabled;
    }
} 