import express from "express";
import health from "../services/aiService.js";

const router = express.Router();

// GET /api/ai/health → vérifie la disponibilité du moteur IA
router.get("/health", async (req, res) => {
  try {
    const status = await health();
    res.json(status);
  } catch (error) {
    res.status(503).json({
      status: "error",
      message: "AI Engine unreachable",
      detail: error?.message,
    });
  }
});

export default router;
