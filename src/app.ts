import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";
import emailAccountRoutes from "./routes/emailAccount.routes.js";
import emailRoutes from "./routes/email.routes.js";
import contactRoutes from "./routes/contact.routes.js";
import contactGroupRoutes from "./routes/contactGroup.routes.js";

const app = express();

app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  }),
);

app.use(express.json());
app.use(cookieParser());

app.get("/api/health", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "MailFlowAI backend is running 🚀",
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/email-accounts", emailAccountRoutes);
app.use("/api/emails", emailRoutes);
app.use("/api/contacts", contactRoutes);
app.use("/api/contact-groups", contactGroupRoutes);

export default app;
