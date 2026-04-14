console.debug("DEBUG START");
debugger;
require("dotenv").config();
const express = require("express");
const path = require("path");
const cors = require("cors");

const logger = require("./src/middleware/logger");
const dBMapper = require("./src/dba/mapper/dbMapper");
const routes = require("./src/routes");
const ddosProtection = require("./src/middleware/ddosProtectionCustom");
const app = express();
const PORT = process.env.PORT || 3000;
app.use(express.static(path.join(__dirname, "public")));

app.get('/api/publicKey', (req, res) => {
  const publicKey = process.env.PUBLIC_KEY ;
  const decodedPublicKey = Buffer.from(publicKey, "base64").toString("utf8");
res.send(decodedPublicKey);
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});
app.get("/resetPasswordPage", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "reset.html"));
});

globalThis.UI_key = process.env.UI_key || "default_ui_key";
app.use(express.json());
app.enable('trust proxy');
app.use(logger);

app.use(
  cors({
    origin: "*",
  })
);


app.use(ddosProtection);
app.use("/", routes);

app.use((req, res) => {
  res.status(404).json({
    status: "error",
    message: "Page Not Found",
    path: req.originalUrl,
  });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ status: "error", message: "Internal Server Error" });
});

const startServer = async () => {
  try {
    console.log("Connecting to DB...");
    await dBMapper.connectToDatabases();

    console.log("DB connected");

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });

  } catch (error) {
    console.error("Failed to start the server:", error.message);
  }
};

startServer();