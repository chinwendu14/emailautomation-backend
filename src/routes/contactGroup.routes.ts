import { Router } from "express";
import {
  createContactGroup,
  getContactGroups,
  getContactGroupById,
  updateContactGroup,
  deleteContactGroup,
} from "../controllers/contactGroup.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = Router();

router.post("/", protect, createContactGroup);

router.get("/", protect, getContactGroups);

router.get("/:id", protect, getContactGroupById);

router.patch("/:id", protect, updateContactGroup);

router.delete("/:id", protect, deleteContactGroup);

export default router;
