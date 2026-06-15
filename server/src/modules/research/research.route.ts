import { Router } from "express";
import { AuthMiddleware } from "../../middlewares/auth.middleware";
import {
  runResearch,
  getResearchStatus,
} from "./research.controller";

const ResearchRouter: Router = Router();

// Protect all routes with authentication
ResearchRouter.use(AuthMiddleware.protect);

// Research endpoints
ResearchRouter.post("/:id/research", runResearch);
ResearchRouter.get("/:id/research/status", getResearchStatus);

export default ResearchRouter;
