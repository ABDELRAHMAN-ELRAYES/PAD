import dotenv from "dotenv";

dotenv.config();

interface Config {
    port: number;
    env: string;
    databaseUrl: string;
    jwt: {
        secret: string;
        expiresIn: string;
        resetPasswordSecret: string;
        resetPasswordExpiresIn: string;
    };
    cookies: {
        expiresIn: string;
    };
    otp: {
        expiresIn: number; // in minutes
    };
    mail: {
        host: string;
        port: number;
        secure: boolean;
        user: string;
        password: string;
        from: string;
        defaultFrom: string;
        service?: string;
    };
    stripe: {
        secretKey: string;
        webhookSecret: string;
    };
    agora: {
        appId: string;
        appCertificate: string;
    };
    upload: {
        maxFileSize: number;
        uploadDir: string;
    };
    cors: {
        origin: string;
    };
    adminDefault: {
        email: string;
        password: string;
    };
    webUrl: string;
    redis: {
        host: string;
        port: number;
    };
    google: {
        clientId: string;
        clientSecret: string;
        callbackUrl: string;
    };
    gemini: {
        apiKey: string;
    };
    claude: string;
    puter: {
        authToken: string;
    };
    ollama: {
        url: string;
        model: string;
    };
}

const config: Config = {
    port: parseInt(process.env.PORT || "8080", 10),
    env: process.env.NODE_ENV || "development",
    databaseUrl: process.env.DATABASE_URL || "",
    jwt: {
        secret: process.env.JWT_SECRET || "your-secret-key-change-this",
        expiresIn: process.env.JWT_EXPIRES_IN || "7d",
        resetPasswordSecret: process.env.JWT_RESET_PASSWORD_SECRET || "reset-secret-key-change-this",
        resetPasswordExpiresIn: process.env.JWT_RESET_PASSWORD_EXPIRES_IN || "15m",
    },
    cookies: {
        expiresIn: process.env.COOKIE_EXPIRES_IN || "7",
    },
    otp: {
        expiresIn: parseInt(process.env.OTP_EXPIRES_IN || "10", 10), // default 10 minutes
    },
    mail: {
        host: process.env.EMAIL_HOST || "smtp.gmail.com",
        port: parseInt(process.env.EMAIL_PORT || "587", 10),
        secure: process.env.EMAIL_SECURE === "true",
        user: process.env.EMAIL_USER || "",
        password: process.env.EMAIL_PASSWORD || "",
        from: process.env.EMAIL_FROM || "info@lynkr.com",
        defaultFrom: process.env.EMAIL_FROM || "info@lynkr.com",
        service: process.env.EMAIL_SERVICE,
    },
    stripe: {
        secretKey: process.env.STRIPE_SECRET_KEY || "",
        webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || "",
    },
    agora: {
        appId: process.env.AGORA_APP_ID || "",
        appCertificate: process.env.AGORA_APP_CERTIFICATE || "",
    },
    upload: {
        maxFileSize: parseInt(process.env.MAX_FILE_SIZE || "10485760", 10),
        uploadDir: process.env.UPLOAD_DIR || "./uploads",
    },
    cors: {
        origin: process.env.CORS_ORIGIN || "http://localhost:3000",
    },
    adminDefault: {
        email: process.env.ADMIN_EMAIL || "admin@lynkr.com",
        password: process.env.ADMIN_PASSWORD || "admin123",
    },
    webUrl: process.env.FRONTEND_URL || "http://localhost:3000",
    redis: {
        host: process.env.REDIS_HOST || "localhost",
        port: parseInt(process.env.REDIS_PORT || "6379", 10),
    },
    google: {
        clientId: process.env.GOOGLE_CLIENT_ID || "",
        clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
        callbackUrl: process.env.GOOGLE_CALLBACK_URL || "http://localhost:3000/api/v1/auth/google/callback",
    },
    gemini: {
        apiKey: process.env.GEMINI_API_KEY || "",
    },
    claude: process.env.CLAUDE_API || "",
    puter: {
        authToken: process.env.PUTER_AUTH_TOKEN || "",
    },
    ollama: {
        url: process.env.OLLAMA_URL || "http://localhost:11434",
        model: process.env.OLLAMA_MODEL || "qwen3.5:4b",
    },


};

export default config;
