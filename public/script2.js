const params = new URLSearchParams(window.location.search);
const tokenVal = params.get("token");

let UI_key_PUBLIC = null;
let isKeyReady = false;

// ❗ REMOVE hardcoded key (simulate fetching or session-based key)
let UI_key = null;

async function importPublicKey(pem) {
  const b64 = pem
    .replace("-----BEGIN PUBLIC KEY-----", "")
    .replace("-----END PUBLIC KEY-----", "")
    .replace(/\s/g, "");

  const binary = atob(b64);
  const bytes = new Uint8Array([...binary].map(c => c.charCodeAt(0)));

  return crypto.subtle.importKey(
    "spki",
    bytes.buffer,
    { name: "RSA-OAEP", hash: "SHA-256" },
    true,
    ["encrypt"]
  );
}

async function initEncryption() {
  try {
    const res = await fetch(`/api/publicKey`);
    const keyText = await res.text();

    UI_key_PUBLIC = await importPublicKey(keyText);

    // Fetch UI key securely (example endpoint)
    // const keyRes = await fetch(`/api/ui-key`);
    // UI_key = await keyRes.text();
     UI_key = "test_ui_key_12345";
    

    isKeyReady = true;
  } catch (err) {
    console.error("Key load failed:", err);
  }
}

initEncryption();

async function encryptBody(data, publicKey) {
  const encoded = new TextEncoder().encode(JSON.stringify(data));

  const encrypted = await crypto.subtle.encrypt(
    { name: "RSA-OAEP" },
    publicKey,
    encoded
  );

  return btoa(String.fromCharCode(...new Uint8Array(encrypted)));
}

async function encryptBody2(data, secretKey) {
  if (!secretKey) throw new Error("UI_key missing");

  const enc = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(secretKey),
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  const key = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: enc.encode("some_salt_value"),
      iterations: 100000,
      hash: "SHA-256"
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt"]
  );

  const encryptedBuffer = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    enc.encode(JSON.stringify(data))
  );

  return {
    iv: Array.from(iv),
    payload: btoa(String.fromCharCode(...new Uint8Array(encryptedBuffer)))
  };
}

async function securePost(url, bodyObj) {
  if (!isKeyReady) throw new Error("Encryption not ready");

  const encryptedL1 = await encryptBody(bodyObj, UI_key_PUBLIC);
  const encryptedL2 = await encryptBody2(encryptedL1, UI_key);

  return fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-payload-encrypted": "1"
    },
    body: JSON.stringify(encryptedL2)
  });
}

// 👁 toggle password
function togglePassword(id) {
  const input = document.getElementById(id);
  input.type = input.type === "password" ? "text" : "password";
}

// ✅ validation
function validatePasswords() {
  const password = document.getElementById("password").value;
  const confirmPassword = document.getElementById("confirmPassword").value;
  const messageDiv = document.getElementById("message");
  const submitBtn = document.getElementById("submitBtn");

  if (!password || !confirmPassword) {
    submitBtn.disabled = true;
    messageDiv.innerText = "";
    return;
  }

  if (password.length < 8) {
    messageDiv.innerText = "Password must be at least 8 characters";
    messageDiv.style.color = "red";
    submitBtn.disabled = true;
    return;
  }

  if (password !== confirmPassword) {
    messageDiv.innerText = "Passwords do not match";
    messageDiv.style.color = "red";
    submitBtn.disabled = true;
  } else {
    messageDiv.innerText = "Passwords match";
    messageDiv.style.color = "green";
    submitBtn.disabled = false;
  }
}

// attach listeners
document.getElementById("password").addEventListener("input", validatePasswords);
document.getElementById("confirmPassword").addEventListener("input", validatePasswords);

// submit
document.getElementById("submitBtn").addEventListener("click", resetPassword);

async function resetPassword() {
  const password = document.getElementById("password").value;
  const messageDiv = document.getElementById("message");
  const submitBtn = document.getElementById("submitBtn");
  const loginBtn = document.getElementById("loginBtn");

  if (!tokenVal) {
    messageDiv.innerText = "Invalid or expired link";
    messageDiv.style.color = "red";
    return;
  }

  submitBtn.disabled = true;
  submitBtn.innerText = "Processing...";

  try {
    const response = await securePost("/api/auth/reset-password", {
      newPassword: password,
      token: tokenVal
    });

    let data = {};
    try {
      data = await response.json();
    } catch {}

    if (response.ok) {
      messageDiv.innerText = "Password reset successful!";
      messageDiv.style.color = "green";

      loginBtn.classList.remove("hidden");
    } else {
      messageDiv.innerText = data.message || "Something went wrong";
      messageDiv.style.color = "red";
      submitBtn.disabled = false;
      submitBtn.innerText = "Submit";
    }
  } catch (err) {
    console.error(err);
    messageDiv.innerText = "Server error. Try again.";
    messageDiv.style.color = "red";
    submitBtn.disabled = false;
    submitBtn.innerText = "Submit";
  }
}

// go to login
document.getElementById("loginBtn").addEventListener("click", () => {
  window.location.href = "/";
});