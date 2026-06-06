import { io } from "socket.io-client";

// Socket.IO requires http(s):// scheme, not ws://
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1";
const SOCKET_URL = API_URL.replace("/api/v1", "").replace(/^ws:/, "http:").replace(/^wss:/, "https:");

export const socket = io(SOCKET_URL, {
    autoConnect: false,
    withCredentials: true,
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    transports: ["websocket", "polling"],
});

// Debug logging — helps diagnose connection issues
if (typeof window !== "undefined") {
    socket.on("connect", () => {
        console.log(`[Socket] Connected: ${socket.id} → ${SOCKET_URL}`);
    });
    socket.on("disconnect", (reason) => {
        console.log(`[Socket] Disconnected: ${reason}`);
    });
    socket.on("connect_error", (err) => {
        console.error(`[Socket] Connection error: ${err.message}`);
    });
    socket.on("reconnect_attempt", (attempt) => {
        console.log(`[Socket] Reconnect attempt: ${attempt}`);
    });
}
