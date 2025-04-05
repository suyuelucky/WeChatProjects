export interface FileInfo {
    path: string
    content: string
    timestamp: number
    changes: FileChange[]
}

export interface FileChange {
    type: 'create' | 'update' | 'delete'
    timestamp: number
    content?: string
}

export interface CodeNode {
    id: string
    type: string
    name: string
    dependencies: string[]
}

export interface CodeEdge {
    source: string
    target: string
    type: string
}

export interface CodeGraph {
    nodes: CodeNode[]
    edges: CodeEdge[]
}

export interface Error {
    code: string
    message: string
    stack?: string
    context?: Record<string, unknown>
}

export interface Action {
    type: string
    payload: unknown
    timestamp: number
}

export interface AIInteraction {
    query: string
    response: string
    timestamp: number
    context?: Record<string, unknown>
}

export interface Context {
    files: FileInfo[]
    actions: Action[]
    interactions: AIInteraction[]
}

export interface SessionState {
    id: string
    startTime: number
    lastActive: number
    context: Context
    currentStep?: string
    progress: number
    decisions: string[]
    preferences: Record<string, unknown>
}

export interface MetadataInfo {
    version: string
    lastUpdate: number
    stats: {
        totalFiles: number
        totalLines: number
        totalChanges: number
        averageResponseTime: number
    }
}

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export interface LogEntry {
    level: LogLevel
    message: string
    timestamp?: number
    context?: Record<string, unknown>
} 