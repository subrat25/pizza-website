const crypto = require("crypto");

function decryptPayload(req, res, next) {
  try {
    if (req.headers["x-payload-encrypted"] !== "1") {
      return next();
    }

    const { key, iv, payload } = req.body;

    if (!key || !iv || !payload) {
      return res.status(400).json({ error: "Missing key/iv/payload" });
    }

    // -----------------------------
    // 1. Load Private Key
    // -----------------------------
    const privateKey = Buffer.from(
      process.env.PRIVATE_KEY,
      "base64"
    ).toString("utf8");

    // -----------------------------
    // 2. Decrypt AES key (RSA)
    // -----------------------------
    const encryptedKeyBuffer = Buffer.from(key, "base64");

    const aesKey = crypto.privateDecrypt(
      {
        key: privateKey,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: "sha256",
      },
      encryptedKeyBuffer
    );

    // -----------------------------
    // 3. Decrypt payload (AES-GCM)
    // -----------------------------
    const ivBuffer = Buffer.from(iv);
    const encryptedBuffer = Buffer.from(payload, "base64");

    // Extract authTag (last 16 bytes)
    const authTag = encryptedBuffer.slice(-16);
    const ciphertext = encryptedBuffer.slice(0, -16);

    const decipher = crypto.createDecipheriv(
      "aes-256-gcm",
      aesKey,
      ivBuffer
    );

    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(ciphertext, null, "utf8");
    decrypted += decipher.final("utf8");

    // -----------------------------
    // 4. Attach final JSON
    // -----------------------------
    req.body = JSON.parse(decrypted);

    next();
  } catch (err) {
    console.error("Decryption failed:", err.message);
    return res.status(400).json({ error: "Invalid encrypted payload" });
  }
}

module.exports = { decryptPayload };