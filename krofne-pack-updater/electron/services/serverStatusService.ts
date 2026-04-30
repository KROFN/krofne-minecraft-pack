import net from 'net';
import type { ServerStatusResult } from '../../shared/types/ipc';
import { log } from './logService';

/**
 * Check Minecraft server status via a simple TCP connection.
 * Connects to the given address:port with a 5-second timeout.
 */
export async function checkServerStatus(
  address: string,
  port: number,
): Promise<ServerStatusResult> {
  log('info', `Checking server status: ${address}:${port}`);

  return new Promise((resolve) => {
    const startTime = Date.now();

    const socket = new net.Socket();
    socket.setTimeout(5000);

    socket.on('connect', () => {
      const latency = Date.now() - startTime;
      socket.destroy();
      log('info', `Server ${address}:${port} is reachable (${latency}ms)`);
      resolve({
        reachable: true,
        latencyMs: latency,
        error: null,
      });
    });

    socket.on('timeout', () => {
      socket.destroy();
      log('warn', `Server ${address}:${port} connection timed out`);
      resolve({
        reachable: false,
        latencyMs: null,
        error: 'Connection timed out (5s)',
      });
    });

    socket.on('error', (err: Error) => {
      socket.destroy();
      log('warn', `Server ${address}:${port} error: ${err.message}`);
      resolve({
        reachable: false,
        latencyMs: null,
        error: err.message,
      });
    });

    socket.on('close', () => {
      // If close fires without connect/timeout/error, consider it unreachable
      // This is handled by the other events
    });

    try {
      socket.connect(port, address);
    } catch (err: any) {
      log('warn', `Server ${address}:${port} connect error: ${err.message}`);
      resolve({
        reachable: false,
        latencyMs: null,
        error: err.message,
      });
    }
  });
}
