import "dotenv/config";
import express from "express";
import cors from "cors";
import { PrismaClient } from "@prisma/client";
import systemRouter from "./routes/system.js";

const app = express();
const prisma = new PrismaClient();
const PORT = Number(process.env.PORT || 4000);

app.use(cors());
app.use(express.json());
app.use(systemRouter);

app.get("/", (_req, res) => res.json({ message: "BTPGo Backend running" }));
app.get("/health", async (_req, res) => {
  try {
    const skip = String(process.env.HEALTH_SKIP_DB || "").toLowerCase();
    if (!(skip === "1" || skip === "true")) {
      await prisma.$queryRaw`SELECT 1`;
    }
    res.json({ status: "ok" });
  } catch (e) {
    res.status(500).json({ status: "error", error: "db_unreachable" });
  }
});

app.listen(PORT, "0.0.0.0", () => console.log(`✅ Server listening on port ${PORT}`));
