import { writeFile, readFile } from 'fs/promises';
import { join } from 'path';
import { randomUUID } from 'crypto';
import type { SessionState } from '../types.js';

export class SessionManager {
  private sessionState: SessionState | null = null;
  private sessionFile: string;

  constructor(baseDir: string = './sessions') {
    this.sessionFile = join(baseDir, 'session.json');
  }

  async saveState(): Promise<void> {
    if (!this.sessionState) {
      throw new Error('No session state to save');
    }

    try {
      await writeFile(this.sessionFile, JSON.stringify(this.sessionState, null, 2));
    } catch (error) {
      console.error('保存会话状态失败:', error);
      throw error;
    }
  }

  async loadState(): Promise<SessionState> {
    try {
      const data = await readFile(this.sessionFile, 'utf-8');
      this.sessionState = JSON.parse(data);
      return this.sessionState;
    } catch (error) {
      console.error('加载会话状态失败:', error);
      throw error;
    }
  }

  getCurrentState(): SessionState | null {
    return this.sessionState;
  }

  async createNewSession(): Promise<SessionState> {
    const newState: SessionState = {
      id: randomUUID(),
      startTime: Date.now(),
      lastActive: Date.now(),
      context: {
        files: [],
        actions: [],
        interactions: []
      },
      progress: 0,
      decisions: [],
      preferences: {}
    };

    this.sessionState = newState;
    await this.saveState();
    return newState;
  }

  async updateProgress(step: string, progress: number): Promise<void> {
    if (!this.sessionState) {
      throw new Error('No active session');
    }

    this.sessionState.currentStep = step;
    this.sessionState.progress = progress;
    this.sessionState.lastActive = Date.now();
    await this.saveState();
  }

  async addDecision(decision: string): Promise<void> {
    if (!this.sessionState) {
      throw new Error('No active session');
    }

    this.sessionState.decisions.push(decision);
    this.sessionState.lastActive = Date.now();
    await this.saveState();
  }

  async updatePreferences(preferences: Record<string, unknown>): Promise<void> {
    if (!this.sessionState) {
      throw new Error('No active session');
    }

    this.sessionState.preferences = {
      ...this.sessionState.preferences,
      ...preferences
    };
    this.sessionState.lastActive = Date.now();
    await this.saveState();
  }
} 