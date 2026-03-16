import { useEffect, useState } from "react";

export type GestureCommand = {
  gesture: string;
  x?: number;
  y?: number;
  dx?: number;
  dy?: number;
  pinch_dist?: number;
};

export const useGestureWebSocket = (url: string = "ws://localhost:8765") => {
  const [lastCommand, setLastCommand] = useState<GestureCommand | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    let ws = new WebSocket(url);

    ws.onopen = () => {
      console.log("Connected to Gesture Backend");
      setIsConnected(true);
    };

    ws.onclose = () => {
      console.log("Disconnected from Gesture Backend");
      setIsConnected(false);
      // Optional: Add auto-reconnect logic here if needed
    };

    ws.onmessage = (event) => {
      try {
        const cmd: GestureCommand = JSON.parse(event.data);
        setLastCommand(cmd);
      } catch (e) {
        console.error("Failed to parse WebSocket message", e);
      }
    };

    return () => {
        if(ws.readyState === 1) {
            ws.close();
        }
    };
  }, [url]);

  return { lastCommand, isConnected };
};
