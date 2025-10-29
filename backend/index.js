import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";

dotenv.config();
const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3000;

app.use(helmet());
app.use(cors({ origin: [process.env.FRONTEND_URL], credentials: true }));
app.use(express.json());

app.get("/health", (_, res) => res.json({ ok: true, ts: Date.now() }));

// Exemple route sécurisée
app.get("/me", async (req, res) => {
  try {
    const token = (req.headers.authorization || "").replace("Bearer ", "");
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    res.json({ user });
  } catch (e) {
    res.status(401).json({ error: "unauthorized" });
  }
});

app.listen(PORT, () => console.log(`API running on ${PORT}`));
