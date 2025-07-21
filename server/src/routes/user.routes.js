import express from "express";
import {
  getUserData,
  isAuthenticated,
} from "../controllers/user.controller.js";
import authMiddleware from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/", authMiddleware, getUserData);
router.get("/check", isAuthenticated);

export default router;
