import { useEffect, useRef, useCallback } from 'react';
import * as signalR from '@microsoft/signalr';

const HUB_URL = 'http://localhost:5000/hubs/telemetry';

export interface TelemetryUpdate {
  deviceId: string;
  nodeName: string;
  patientId: string | null;
  seizureProbability: number;
  edgeLatencyMs: number;
  batteryPercentage: number;
  status: string;
  timestamp: string;
}

type TelemetryCallback = (update: TelemetryUpdate) => void;

/**
 * useTelemetry — Connects to the backend SignalR TelemetryHub and fires
 * `onUpdate` whenever a new telemetry packet arrives from any edge node.
 *
 * Usage:
 *   useTelemetry((update) => { ... update state ... });
 *
 * The hook manages reconnection automatically; it tears down the connection
 * when the component unmounts.
 */
export function useTelemetry(onUpdate: TelemetryCallback) {
  const connectionRef = useRef<signalR.HubConnection | null>(null);
  const callbackRef = useRef<TelemetryCallback>(onUpdate);

  // Always use latest callback without re-subscribing
  useEffect(() => {
    callbackRef.current = onUpdate;
  }, [onUpdate]);

  const startConnection = useCallback(async () => {
    if (connectionRef.current) return;

    const token = localStorage.getItem('auth_token');

    const connection = new signalR.HubConnectionBuilder()
      .withUrl(HUB_URL, token ? { accessTokenFactory: () => token } : {})
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    connection.on('ReceiveTelemetry', (update: TelemetryUpdate) => {
      callbackRef.current(update);
    });

    connection.onreconnecting(() => {
      console.info('[SignalR] Reconnecting to TelemetryHub...');
    });

    connection.onreconnected(() => {
      console.info('[SignalR] Reconnected to TelemetryHub.');
    });

    connection.onclose(() => {
      console.warn('[SignalR] TelemetryHub connection closed.');
      connectionRef.current = null;
    });

    try {
      await connection.start();
      connectionRef.current = connection;
      console.info('[SignalR] Connected to TelemetryHub ✅');
    } catch (err) {
      console.error('[SignalR] Failed to connect to TelemetryHub:', err);
      connectionRef.current = null;
    }
  }, []);

  useEffect(() => {
    startConnection();

    return () => {
      if (connectionRef.current) {
        connectionRef.current.stop();
        connectionRef.current = null;
      }
    };
  }, [startConnection]);
}
