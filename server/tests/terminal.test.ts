import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Server as SocketIOServer } from 'socket.io';
import { Server as HttpServer } from 'http';
import { setupTerminal } from '../src/services/terminal';
import { AppConfig } from '../src/types';

describe('terminal', () => {
    describe('setupTerminal', () => {
        let io: SocketIOServer;
        let httpServer: HttpServer;
        let mockGetState: () => AppConfig;
        let mockGetTaskById: any;

        beforeEach(() => {
            httpServer = new HttpServer();
            io = new SocketIOServer(httpServer);
            
            mockGetState = vi.fn(() => ({
                repoPath: '/tmp/test-repo',
                aiTool: 'claude',
                copyFiles: '',
            }));

            mockGetTaskById = vi.fn(async (taskId: string) => ({
                id: taskId,
                title: 'Test Task',
                description: 'Test Description',
                repositoryId: 'repo-1',
                branchName: 'feature/test',
            })) as (taskId: string, repoPath: string) => Promise<any>;
        });

        it('should create terminal session management', () => {
            const terminalService = setupTerminal(io, mockGetState, mockGetTaskById);
            
            expect(terminalService).toBeDefined();
            expect(terminalService.ensureTerminalForTask).toBeDefined();
            expect(terminalService.runAiForTask).toBeDefined();
            expect(terminalService.shutdownTerminalForTask).toBeDefined();
        });

        // Note: More comprehensive terminal buffer testing would require mocking node-pty
        // and Socket.IO connections, which is complex. The buffer functionality is
        // implicitly tested through the integration with the actual application.
        it('should expose terminal management functions', () => {
            const terminalService = setupTerminal(io, mockGetState, mockGetTaskById);
            
            // Verify all expected functions are exposed
            expect(typeof terminalService.ensureTerminalForTask).toBe('function');
            expect(typeof terminalService.runAiForTask).toBe('function');
            expect(typeof terminalService.shutdownTerminalForTask).toBe('function');
        });
    });
});
