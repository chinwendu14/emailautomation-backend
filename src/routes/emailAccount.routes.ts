import { Router } from "express";
import { getEmailAccounts } from "../controllers/emailAccount.controller.js";
import {
  connectGoogle,
  googleCallback,
} from "../controllers/googleOAuth.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = Router();

router.get("/", protect, getEmailAccounts);

router.get("/google", protect, connectGoogle);

router.get("/google/callback", googleCallback);

export default router;
