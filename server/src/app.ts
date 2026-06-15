import express, { Express } from "express";
import morgan from "morgan";
import path from "path";
import helmet from "helmet";
import config from "./config/config";
import UserRepository from "./modules/user/user.repository";
import { hash } from "./utils/hashing-handler";
import { UserRole } from "./enum/UserRole";
import { globalErrorHandler, notFoundHandler } from "./middlewares/error-handler";
import { generalApiLimiter, authLimiter } from "./middlewares/rate-limit.middleware";

// Import all route modules
import AuthRouter from "./modules/auth/auth.route";
import UserRouter from "./modules/user/user.route";
import IdeaRouter from "./modules/idea/idea.route";
import DocumentRouter from "./modules/document/document.route";
import DiagramRouter from "./modules/diagram/diagram.route";
import FeatureRouter from "./modules/feature/feature.route";
import TaskRouter from "./modules/task/task.route";
import WorkflowRouter from "./modules/workflow/workflow.route";
import IterationRouter from "./modules/iteration/iteration.route";
import GuidelineRouter from "./modules/guideline/guideline.route";
import IRRouter from "./modules/ir/ir.route";
import DiscoveryRouter from "./modules/discovery/discovery.route";
import ResearchRouter from "./modules/research/research.route";
import { bodyParser, cookieParserMiddleware, corsMiddleware, formParser } from "./middlewares/middlewares";

// Seed default admin user
(async () => {
    const userRepo = UserRepository.getInstance();
    const user = await userRepo.getUserByUsernameOrEmail(
        config.adminDefault.email
    );

    if (user) return;

    const hashedPass = await hash(config.adminDefault.password);

    const userData = {
        email: config.adminDefault.email,
        username: "admin",
        password: hashedPass,
        firstName: "Admin",
        lastName: "User",
        phone: "+1234567890",
        role: UserRole.SUPER_ADMIN,
        active: true,
        emailVerified: true,
    };

    try {
        await userRepo.addUser(userData);
        console.log("Default admin user created");
    } catch (err) {
        console.error("Failed to create admin user:", err);
    }
})();

export const ROOT_DIR: string = process.cwd();

const app: Express = express();


// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "blob:"],
        },
    },
    crossOriginEmbedderPolicy: false,
}));

// Rate limiting
app.use("/api/", generalApiLimiter);

// Middleware setup
app.use(corsMiddleware);
app.use(formParser);
app.use(bodyParser);
app.use(cookieParserMiddleware);
app.use(morgan("dev"));

// Serve static files (uploads)
app.use(
    "/api/uploads",
    express.static(path.join(process.cwd(), "uploads"))
);



// API Routes
app.use("/api/v1/auth", authLimiter, AuthRouter);
app.use("/api/v1/users", UserRouter);
app.use("/api/v1/ideas", IdeaRouter);
app.use("/api/v1/ideas", IRRouter);
app.use("/api/v1/ideas", DiscoveryRouter);
app.use("/api/v1/ideas", ResearchRouter);
app.use("/api/v1/documents", DocumentRouter);
app.use("/api/v1/diagrams", DiagramRouter);
app.use("/api/v1/features", FeatureRouter);
app.use("/api/v1/tasks", TaskRouter);
app.use("/api/v1/workflows", WorkflowRouter);
app.use("/api/v1/iterations", IterationRouter);
app.use("/api/v1/guidelines", GuidelineRouter);

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(globalErrorHandler);

export default app;
