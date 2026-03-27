import { io } from "socket.io-client";

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL?.replace("/api/v1", "") || "http://localhost:8080";

export const socket = io(SOCKET_URL, {
    autoConnect: false,
    withCredentials: true,
});
