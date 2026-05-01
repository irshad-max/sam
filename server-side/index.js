require("dotenv").config();

const express = require("express");
const http = require("http");
const path = require("path");
const cors = require("cors");

const app = express();
const server = http.createServer(app);

// middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ================= STATIC FILES =================
const root = path.resolve();

// 👇 VERY IMPORTANT (correct path)
app.use(express.static(path.join(root, "client-side/dist")));

// 👇 fallback (React/Vite routing)
app.get("*", (req, res) => {
  res.sendFile(path.join(root, "client-side/dist/index.html"));
});

// ================= SERVER =================
const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});