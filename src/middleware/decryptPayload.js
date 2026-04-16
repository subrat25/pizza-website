const crypto = require("crypto");

// ------------------------------
// AES-GCM Decryption (Outer Layer)
// ------------------------------
function decryptPayloadL1(req, res, next) {
  try {
    const { iv, payload } = req.body;

    if (!iv || !payload) {
      return res.status(400).json({ error: "Missing iv/payload" });
    }

    const UI_KEY = globalThis.UI_key;
    const salt = UI_KEY; 

    // Derive AES key from UI_KEY
    const key = crypto.pbkdf2Sync(UI_KEY, salt, 100000, 32, "sha256");

    const encryptedBuffer = Buffer.from(payload, "base64");

    // AES-GCM uses last 16 bytes as authTag
    const authTag = encryptedBuffer.slice(-16);
    const ciphertext = encryptedBuffer.slice(0, -16);

    // Convert IV array to Buffer
    const ivBuffer = Buffer.from(iv);

    const decipher = crypto.createDecipheriv("aes-256-gcm", key, ivBuffer);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(ciphertext);
    decrypted = Buffer.concat([decrypted, decipher.final()]);

    // decrypted is the inner RSA-OAEP encrypted payload
    const decryptedBody = decrypted.toString("utf8");

    req.body = decryptedBody; // keep as string for L2
    next();
  } catch (err) {
    console.error("AES-GCM decryption error:", err.message);
    return res.status(400).json({ error: "Invalid AES-GCM payload" });
  }
}

// ------------------------------
// RSA-OAEP Decryption (Inner Layer)
// ------------------------------
function decryptPayloadL2(req, res, next) {
  try {
    if (req.headers["x-payload-encrypted"] !== "1") return next();

    const privateKey = Buffer.from(process.env.PRIVATE_KEY, "base64").toString("utf8");

    let encrypted = req.body;

    // If body is stringified JSON
    if (typeof encrypted === "string") {
      encrypted = JSON.parse(encrypted); // Convert stringified JSON to base64 string
    }

    const buffer = Buffer.from(encrypted, "base64");

    const decrypted = crypto.privateDecrypt(
      {
        key: privateKey,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: "sha256",
      },
      buffer
    );

    const parsed = JSON.parse(decrypted.toString("utf8"));

    req.body = parsed; // final decrypted payload
    next();
  } catch (err) {
    console.error("RSA-OAEP decryption error:", err.message);
    return res.status(400).json({ error: "Invalid RSA-OAEP payload" });
  }
}

// ------------------------------
// Combined Middleware
// ------------------------------
function decryptPayload(req, res, next) {
  decryptPayloadL1(req, res, (err) => {
    if (err) return next(err);
    decryptPayloadL2(req, res, next);
  });
}

module.exports = { decryptPayload };