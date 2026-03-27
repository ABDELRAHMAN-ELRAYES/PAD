import { Server, Socket } from "socket.io";
import { Server as HttpServer } from "http";

export default class SocketService {
    private static instance: SocketService;
    private io: Server | null = null;

    private constructor() { }

    public static getInstance(): SocketService {
        if (!SocketService.instance) {
            SocketService.instance = new SocketService();
        }
        return SocketService.instance;
    }

    public initialize(server: HttpServer): void {
        this.io = new Server(server, {
            cors: {
                origin: "*",
                methods: ["GET", "POST"],
                credentials: true,
            },
        });

        this.io.on("connection", (socket: Socket) => {
            console.log(`Socket connected: ${socket.id}`);

            socket.on("join-room", (roomId: string) => {
                socket.join(roomId);
                console.log(`Socket ${socket.id} joined room ${roomId}`);
            });

            socket.on("disconnect", () => {
                console.log(`Socket disconnected: ${socket.id}`);
            });
        });
    }

    public emitToRoom(roomId: string, event: string, data: any): void {
        if (this.io) {
            this.io.to(roomId).emit(event, data);
        }
    }

    public emitToAll(event: string, data: any): void {
        if (this.io) {
            this.io.emit(event, data);
        }
    }
}
