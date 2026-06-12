import { Router } from "express";
import { AuthMiddleware } from "../../middlewares/auth.middleware";
import upload, { validateUploadedFileSize } from "../../middlewares/file-upload";
import {
    createGuideline,
    uploadGuidelineFile,
    listGuidelines,
    deleteGuideline,
    downloadGuidelineFile,
} from "./guideline.controller";

const GuidelineRouter: Router = Router();

// Require authentication for all guideline routes
GuidelineRouter.use(AuthMiddleware.protect);

// Base routes
GuidelineRouter.route("/")
    .post(createGuideline)
    .get(listGuidelines);

// Upload routes
GuidelineRouter.post("/upload", upload.single("file"), validateUploadedFileSize, uploadGuidelineFile);

// Specific guideline deletion route
GuidelineRouter.route("/:id")
    .delete(deleteGuideline);

// Download route
GuidelineRouter.get("/files/:fileId/download", downloadGuidelineFile);

export default GuidelineRouter;
