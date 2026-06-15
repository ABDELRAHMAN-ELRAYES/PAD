import { Router } from "express";
import { AuthMiddleware } from "../../middlewares/auth.middleware";
import {
  getQuestionnaire,
  submitQuestionnaire,
  regenerateQuestionnaire,
} from "./discovery.controller";

const DiscoveryRouter: Router = Router();

// Protect all routes with authentication
DiscoveryRouter.use(AuthMiddleware.protect);

// Questionnaire sub-routes
DiscoveryRouter.get("/:id/questionnaire", getQuestionnaire);
DiscoveryRouter.post("/:id/questionnaire/submit", submitQuestionnaire);
DiscoveryRouter.post("/:id/questionnaire/regenerate", regenerateQuestionnaire);

export default DiscoveryRouter;
