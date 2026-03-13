import http from "http";
import app from "./app";
import config from "./config/config";
import PrismaClientSingleton from "./data-server-clients/prisma-client";
import SocketService from "./services/socket.service";

const prisma = PrismaClientSingleton.getPrismaClient();

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.IO
SocketService.getInstance().initialize(server);


const PORT = config.port;

server.listen(PORT, () => {
    console.log(`Server is running on port [${PORT}]`);
    console.log(`Environment: ${config.env}`);
});

// Graceful shutdown
const gracefulShutdown = async () => {
    console.log("Shutting down gracefully...");

    server.close(() => {
        console.log("HTTP server closed");
    });

    await prisma.$disconnect();
    console.log("Database connection closed");

    process.exit(0);
};

process.on("SIGTERM", gracefulShutdown);
process.on("SIGINT", gracefulShutdown);
