/// <reference types="node" />
import { mkdir, writeFile } from 'fs/promises'
import { join } from 'path'
import type { LogEntry } from '../types.js'

export class LogManager {
    private logDir: string
    private logFile: string

    constructor(baseDir: string = './logs') {
        this.logDir = baseDir
        this.logFile = join(this.logDir, 'app.log')
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
} 