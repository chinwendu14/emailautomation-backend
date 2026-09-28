import { Router } from "express";
import { getCurrentUser } from "../controllers/user.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = Router();

router.get("/me", protect, getCurrentUser);

export default router;
