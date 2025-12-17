import cors from "cors";
import express from "express";
import http from "http";
import { Server } from "socket.io";
import { connectDb } from "./config/db";
import dotenv from "dotenv";
import { createSeatService } from "./service/seatService";
import { buildRouter } from "./routes";

dotenv.config();

async function startServer() {
  await connectDb();

  const app = express();
  app.use(cors());
  app.use(express.json());

  // Health check endpoint
  app.get("/health", (_req, res) => {
    res.json({ ok: true });
  });

  const server = http.createServer(app);
  const io = new Server(server, {
    cors: {
      origin: "*"
    }
  });

  // Create seat service and setup routes
  const seatService = createSeatService(io);
  app.use("/api", buildRouter(seatService));

  // Socket connection handler
  io.on("connection", () => {
    console.log("Client connected");
  });

  // Start server
  const port = Number(process.env.PORT) || 5000;
  server.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
}

startServer().catch((error) => {
  // eslint-disable-next-line no-console
  console.error("Failed to start server", error);
});


