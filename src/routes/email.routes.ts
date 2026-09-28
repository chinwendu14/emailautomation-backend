import { Router } from "express";
import {
  sendEmail,
  getSentEmails,
  getSentEmailById,
} from "../controllers/email.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = Router();

router.post("/send", protect, sendEmail);

router.get("/", protect, getSentEmails);

router.get("/:id", protect, getSentEmailById);

export default router;
