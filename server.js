// server.js
require("dotenv").config();
const http = require("http");
const { Server } = require("socket.io");
const app = require("./app");

const { dashMatrixSequelize } = require("./config/db");
const startExamExpiryCron = require("./cron/examExpiryJob");

const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || "0.0.0.0";

// 1️⃣ Create HTTP server first
const server = http.createServer(app);

// 🌍 global socket instance store
global._io = new Server(server, {
  cors: { origin: "*" },
});

// ⬇️ ADD THIS MIDDLEWARE RIGHT AFTER io CREATION
app.use((req, res, next) => {
  req.io = global._io;
  next();
});

// 3️⃣ User joins room for personal notifications
global._io.on("connection", (socket) => {
  // console.log("🟢 Socket connected:", socket.id);
  socket.on("join_user", (userId) => {
    socket.join(`user_${userId}`);
  });
});

// 4️⃣ notification emitter handler
const sendNotificationToUser = (userId, notification) => {
  // console.log("emit →", `user_${userId}`, !!global._io);
  global._io.to(`user_${userId}`).emit("notification:new", notification);
};

// 5️⃣ make available everywhere
module.exports = { io: global._io, sendNotificationToUser };

// 6️⃣ START SERVER
const startServer = async () => {
  try {
    await dashMatrixSequelize.authenticate();
    await dashMatrixSequelize.sync({ force: true }); // ← yeh add karo
    console.log("✅ Database synchronized"); // ← yeh add karo

    startExamExpiryCron();

    server.listen(PORT, HOST, () => {
      console.log(`🚀 Server running on http://${HOST}:${PORT}`);
    });
  } catch (err) {
    console.error("❌ DB connection failed:", err);
    process.exit(1);
  }
};

startServer();
