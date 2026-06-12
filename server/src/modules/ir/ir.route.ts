import { Router } from "express";
import { AuthMiddleware } from "../../middlewares/auth.middleware";
import {
  getIR,
  generateInitialIR,
  updateIR,
  patchIR,
  compileIR,
} from "./ir.controller";

const IRRouter: Router = Router();

// All routes protect by auth middleware
IRRouter.use(AuthMiddleware.protect);

// IR routes nested/prefix under /ideas/:id/ir
IRRouter.route("/:id/ir")
  .get(getIR)
  .post(updateIR);

IRRouter.post("/:id/ir/generate", generateInitialIR);
IRRouter.post("/:id/ir/patch", patchIR);
IRRouter.post("/:id/ir/compile", compileIR);

export default IRRouter;
