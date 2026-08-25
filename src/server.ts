import express from "express";

const app = express();

app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "MailFlowAI backend is running 🚀",
  });
});

export default app;