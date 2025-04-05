import { describe, expect, test, beforeEach } from '@jest/globals';
import { SessionManager } from '../../src/managers/SessionManager.js';
import { mkdir, rm } from 'fs/promises';

const TEST_DIR = './test-sessions';

describe('SessionManager', () => {
  let sessionManager: SessionManager;

  beforeEach(async () => {
    try {
      await rm(TEST_DIR, { recursive: true, force: true });
    } catch (error) {
      // 忽略目录不存在的错误
    }
    await mkdir(TEST_DIR, { recursive: true });
    sessionManager = new SessionManager(TEST_DIR);
  });

  test('should create new session', async () => {
    const session = await sessionManager.createNewSession();
    expect(session).toBeDefined();
    expect(session.id).toBeDefined();
    expect(session.startTime).toBeDefined();
    expect(session.context).toBeDefined();
    expect(session.progress).toBe(0);
    expect(session.decisions).toEqual([]);
    expect(session.preferences).toEqual({});
  });

  test('should save and load session state', async () => {
    const originalSession = await sessionManager.createNewSession();
    await sessionManager.updateProgress('测试步骤', 50);
    await sessionManager.addDecision('测试决定');
    await sessionManager.updatePreferences({ theme: 'dark' });

    const loadedSession = await sessionManager.loadState();
    expect(loadedSession).toBeDefined();
    expect(loadedSession?.id).toBe(originalSession.id);
    expect(loadedSession?.currentStep).toBe('测试步骤');
    expect(loadedSession?.progress).toBe(50);
    expect(loadedSession?.decisions).toContain('测试决定');
    expect(loadedSession?.preferences).toEqual({ theme: 'dark' });
  });

  test('should handle missing session file', async () => {
    const loadedSession = await sessionManager.loadState();
    expect(loadedSession).toBeNull();
  });

  test('should throw error when updating without active session', async () => {
    await expect(sessionManager.updateProgress('测试', 0)).rejects.toThrow('No active session');
    await expect(sessionManager.addDecision('测试')).rejects.toThrow('No active session');
    await expect(sessionManager.updatePreferences({})).rejects.toThrow('No active session');
  });
}); 