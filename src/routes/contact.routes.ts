import { Router } from "express";
import {
  createContact,
  getContacts,
  getContactById,
  updateContact,
  deleteContact,
} from "../controllers/contact.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = Router();

router.post("/", protect, createContact);

router.get("/", protect, getContacts);

router.get("/:id", protect, getContactById);
router.patch("/:id", protect, updateContact);
router.delete("/:id", protect, deleteContact);
export default router;
