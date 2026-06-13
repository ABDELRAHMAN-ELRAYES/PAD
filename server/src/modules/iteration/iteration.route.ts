import { Router } from "express";
import * as iterationController from "./iteration.controller";

const IterationRouter:Router = Router();

// Get (or auto-create) iteration session for an idea
IterationRouter.get("/idea/:ideaId", iterationController.getSession);

// Add a message to an iteration session
IterationRouter.post("/idea/:ideaId/message", iterationController.postMessage);

export default IterationRouter;
