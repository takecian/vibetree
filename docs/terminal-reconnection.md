# Terminal Reconnection

## Overview

Vibetree's terminal feature includes robust reconnection support that allows terminal sessions to persist across page reloads and socket disconnections.

## How It Works

### Server Side

1. **Session Persistence**: Terminal (PTY) sessions remain active on the server even when clients disconnect
2. **Output Buffering**: The server maintains a buffer of recent terminal output (up to 1000 entries per session)
3. **Automatic Reattachment**: When a client reconnects with the same task ID, the server:
   - Reuses the existing PTY session
   - Sends all buffered output to restore terminal state
   - Continues capturing new output

### Client Side

1. **Socket.IO Configuration**: The client is configured with automatic reconnection:
   - Up to 5 reconnection attempts
   - 1 second delay between attempts
2. **Session Reuse**: Terminal instances are cached and reused across component re-renders
3. **Buffer Restoration**: On reconnection, the client receives and displays all buffered output

## Usage Scenarios

### Page Reload (F5)
When you reload the page with F5:
1. The Socket.IO connection is lost
2. The server keeps the terminal session alive
3. On page load, a new socket connection is established
4. The server detects the existing session and sends buffered data
5. Your terminal is restored with the previous output visible

### Network Disconnection
If the network connection is temporarily lost:
1. Socket.IO automatically attempts to reconnect
2. The server preserves the terminal session
3. On reconnection, buffered output is sent to the client
4. Terminal operation continues seamlessly

### Switching Between Tasks
When you switch between tasks:
1. Each task has its own terminal session
2. Sessions remain active in the background
3. Switching back to a task reconnects to its existing terminal
4. Previous output is still visible

## Technical Details

### Server Implementation (`server/src/services/terminal.ts`)
```typescript
interface TerminalSession {
    pty: pty.IPty;           // The pseudo-terminal
    socket: Socket | null;   // Currently connected socket
    buffer: string[];        // Output buffer for reconnection
}
```

### Client Implementation (`client/src/context/TerminalContext.tsx`)
```typescript
const socket: Socket = io(SOCKET_URL, {
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
});
```

### Events

- `terminal:create`: Client requests a terminal session
- `terminal:data`: Real-time output from server to client
- `terminal:input`: User input from client to server
- `terminal:resize`: Terminal size changes
- `terminal:reconnect`: Buffered data sent on reconnection

## Limitations

1. **Buffer Size**: Only the most recent 1000 output entries are preserved
2. **Server Restart**: Terminal sessions are lost if the server restarts
3. **Stale Sessions**: Sessions persist until explicitly closed (task deletion)

## Future Improvements

Potential enhancements:
- Configurable buffer size
- Session persistence across server restarts
- Visual indicators for reconnection state
- Option to clear buffer manually
