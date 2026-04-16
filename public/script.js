const panels = {
  login: document.getElementById("login-section"),
  register: document.getElementById("register-section"),
  forgotUserPassword: document.getElementById("forgot-password-section"),
  menu: document.getElementById("menu-section"),
  checkout: document.getElementById("checkout-section"),
  status: document.getElementById("status-section"),
  orderHistory: document.getElementById("order-history-section"),
  profile: document.getElementById("profile-section"),
  address: document.getElementById("address-section"),
};

const baseURL = "";
const loginForm = document.getElementById("login-form");
const registerForm = document.getElementById("register-form");
const forgotPasswordForm = document.getElementById("forgot-password-form");
const goRegisterBtn = document.getElementById("go-register");
const goForgotPasswordBtn = document.getElementById("go-forgot-password");
const goLoginBtn = document.getElementById("go-login");
const registerStatus = document.getElementById("register-status");
const forgotPasswordStatus = document.getElementById("forgot-password-status");
const menuSearch = document.getElementById("menu-search");
const menuList = document.getElementById("menu-list");
const cartList = document.getElementById("cart-list");
const hamburgerBtn = document.getElementById("hamburger-btn");
const hamburgerMenu = document.getElementById("hamburger-menu");
const menuUserInfo = document.getElementById("menu-user-info");
const menuProfile = document.getElementById("menu-profile");
const menuAddress = document.getElementById("menu-address");
const menuOrders = document.getElementById("menu-orders");
const menuLogout = document.getElementById("menu-logout");
const totalAmount = document.getElementById("total-amount");
const clearCartBtn = document.getElementById("clear-cart-btn");
const toCheckoutBtn = document.getElementById("to-checkout");
const checkoutSummary = document.getElementById("checkout-summary");
const payNowBtn = document.getElementById("pay-now");
const paymentStatus = document.getElementById("payment-status");
const statusOrderId = document.getElementById("status-order-id");
const statusState = document.getElementById("status-state");
const statusTotal = document.getElementById("status-total");
const backHomeBtn = document.getElementById("back-home");

const profileEmail = document.getElementById("profile-email");
const profileName = document.getElementById("profile-name");
const profileAddressList = document.getElementById("profile-address-list");
const currentPassword = document.getElementById("current-password");
const newPassword = document.getElementById("new-password");
const updatePasswordBtn = document.getElementById("update-password-btn");
const saveProfileBtn = document.getElementById("save-profile-btn");
const backFromProfileBtn = document.getElementById("back-from-profile");
const profileStatus = document.getElementById("profile-status");

const manageAddressList = document.getElementById("manage-address-list");
const newAddressLine1 = document.getElementById("new-address-line1");
const newAddressCity = document.getElementById("new-address-city");
const newAddressState = document.getElementById("new-address-state");
const newAddressPin = document.getElementById("new-address-pin");
const addAddressBtn = document.getElementById("add-address-btn");
const backFromAddressBtn = document.getElementById("back-from-address");
const addressStatus = document.getElementById("address-status");

const loadingSpinner = document.getElementById("loading-spinner");

let currentUser = null;
let menuItems = [];
let cart = [];
let currentOrderId = null;
let stripe;
let cardElement;

let UI_key_PUBLIC;
const UI_key = "test_ui_key_12345";
async function importPublicKey(pem) {
  const b64 = pem
    .replace("-----BEGIN PUBLIC KEY-----", "")
    .replace("-----END PUBLIC KEY-----", "")
    .replace(/\s/g, "");

  const binary = atob(b64);
  const bytes = new Uint8Array([...binary].map((c) => c.charCodeAt(0)));

  return crypto.subtle.importKey(
    "spki",
    bytes.buffer,
    {
      name: "RSA-OAEP",
      hash: "SHA-256",
    },
    true,
    ["encrypt"],
  );
}
async function initEncryption() {
  try {
    const UI_key_raw = await fetch(`${baseURL}/api/publicKey`).then((res) =>
      res.text(),
    );

    UI_key_PUBLIC = await importPublicKey(UI_key_raw);
  } catch (err) {
    console.error("Key load failed:", err);
  }
}

initEncryption();

// -----------------------------
// ENCRYPTION HELPERS
// -----------------------------
async function encryptBody(data, publicKey) {
  const encoded = new TextEncoder().encode(JSON.stringify(data));

  const encrypted = await crypto.subtle.encrypt(
    { name: "RSA-OAEP" },
    publicKey,
    encoded,
  );

  return btoa(String.fromCharCode(...new Uint8Array(encrypted)));
}
async function encryptBody2(data, secretKey) {
  if (!secretKey || secretKey === undefined) {
    console.log("UI_key is missing. Cannot encrypt request.");
    throw new Error("UI_key missing. Cannot encrypt request.");
  }

  const enc = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(secretKey),
    "PBKDF2",
    false,
    ["deriveKey"],
  );

  const key = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: enc.encode(UI_key),
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt"],
  );

  const encryptedBuffer = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    enc.encode(JSON.stringify(data)),
  );

  return {
    iv: Array.from(iv),
    payload: btoa(String.fromCharCode(...new Uint8Array(encryptedBuffer))),
  };
}
async function securePost(url, bodyObj, extraHeaders = {}) {
  const encryptedL1 = await encryptBody(bodyObj, UI_key_PUBLIC);
  const encryptedL2 = await encryptBody2(encryptedL1, UI_key);
  return fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-payload-encrypted": "1",
      ...extraHeaders,
      ...getAuthHeaders(),
    },
    body: JSON.stringify(encryptedL2),
  });
}

// -----------------------------
// UI HELPERS
// -----------------------------
function showPanel(key) {
  Object.values(panels).forEach((node) => node.classList.remove("active"));
  panels[key].classList.add("active");
}

function formatPrice(RUPPES) {
  return (RUPPES - 0.0).toFixed(2);
}

function updateUserMenuState() {
  if (currentUser && currentUser.user) {
    const email =
      currentUser.user.userEmail || currentUser.user.email || "Unknown";
    const name = currentUser.user.userName || currentUser.user.name || "Guest";
    menuUserInfo.textContent = `Logged in as ${name} <${email}>`;
    menuLogout.style.display = "block";
  } else {
    menuUserInfo.textContent = "Not logged in";
    menuLogout.style.display = "none";
  }
}

function showSpinner() {
  loadingSpinner.style.display = "block";
}

function hideSpinner() {
  loadingSpinner.style.display = "none";
}

function getAuthHeaders() {
  return currentUser && currentUser.token
    ? { Authorization: `Bearer ${currentUser.token}` }
    : {};
}

// -----------------------------
// FETCH USER
// -----------------------------
async function fetchAndRefreshCurrentUser() {
  if (!currentUser?.user?.id) return null;
  showSpinner();
  try {

    const res = await fetch(
      `${baseURL}/api/auth/profile/${currentUser.user.id}`,
      {
        headers: {...getAuthHeaders()},
      },
    );
    if (!res.ok) {
      throw new Error("Failed to fetch profile data.");
    }

    const data = await res.json();
    if (!data.success || !data.user) {
      throw new Error(data.error || "Failed to fetch profile data.");
    }

    currentUser.user = data.user;
    localStorage.setItem("currentUser", JSON.stringify(currentUser));
    updateUserMenuState();
    return data.user;
  } finally {
    hideSpinner();
  }
}

// -----------------------------
// RENDER PROFILE
// -----------------------------
function renderProfile(user) {
  if (!user) return;
  profileEmail.textContent = user.userEmail;
  profileName.value = user.userName || "";

  profileAddressList.innerHTML = "";
  if (!user.address || user.address.length === 0) {
    profileAddressList.innerHTML =
      "<p style='color:#666'>No saved addresses.</p>";
  } else {
    user.address.forEach((adr, idx) => {
      const row = document.createElement("div");
      row.style.border = "1px solid #ddd";
      row.style.padding = "8px";
      row.style.marginBottom = "6px";
      row.innerHTML = `<strong>Address ${idx + 1}</strong><br>${adr.line1}, ${
        adr.city
      }, ${adr.state}, ${adr.pin}`;
      profileAddressList.appendChild(row);
    });
  }
}

function renderAddress(user) {
  if (!user) return;
  manageAddressList.innerHTML = "";

  if (!user.address || user.address.length === 0) {
    manageAddressList.innerHTML =
      "<p style='color:#666'>No saved addresses yet.</p>";
  } else {
    user.address.forEach((adr, idx) => {
      const div = document.createElement("div");
      div.style.marginBottom = "6px";
      div.style.border = "1px solid #ddd";
      div.style.borderRadius = "4px";
      div.style.padding = "8px";
      div.className = "manage-address-row";
      div.innerHTML = `
        <span>${idx + 1}. ${adr.line1}, ${adr.city}, ${adr.state}, ${
          adr.pin
        }</span>
       <button type="button" class="remove-addr-btn" data-index="${idx}">Remove</button>
      `;
      manageAddressList.appendChild(div);
    });
  }
}

// -----------------------------
// PASSWORD HELPERS
// -----------------------------
function checkPasswordStrength(password) {
  let strength = 0;
  if (password.length >= 8) strength++;
  if (/[a-z]/.test(password)) strength++;
  if (/[A-Z]/.test(password)) strength++;
  if (/[0-9]/.test(password)) strength++;
  if (/[^A-Za-z0-9]/.test(password)) strength++;

  const strengthEl = document.getElementById("password-strength");
  strengthEl.className = "password-strength";
  if (strength <= 2) strengthEl.classList.add("weak");
  else if (strength <= 4) strengthEl.classList.add("medium");
  else strengthEl.classList.add("strong");
}

function togglePasswordVisibility(targetId, button) {
  const input = document.getElementById(targetId);
  const isPassword = input.getAttribute("type") === "password";
  input.setAttribute("type", isPassword ? "text" : "password");
  if (button) {
    button.textContent = isPassword ? "🙈" : "👁️";
  }
}

// Hamburger menu actions
hamburgerBtn.addEventListener("click", () => {
  hamburgerMenu.classList.toggle("show");
});

document.addEventListener("click", (e) => {
  if (!e.target.closest(".hamburger-wrap")) {
    hamburgerMenu.classList.remove("show");
  }
});

menuProfile.addEventListener("click", async () => {
  hamburgerMenu.classList.remove("show");
  if (!currentUser) {
    alert("Please login to see profile details.");
    return;
  }

  try {
    const user = await fetchAndRefreshCurrentUser();
    renderProfile(user);
    showPanel("profile");
    profileStatus.textContent = "";
  } catch (error) {
    alert(`Unable to load profile: ${error.message}`);
  }
});

menuAddress.addEventListener("click", async () => {
  hamburgerMenu.classList.remove("show");
  if (!currentUser) {
    alert("Please login to manage address.");
    return;
  }

  try {
    const user = await fetchAndRefreshCurrentUser();
    renderAddress(user);
    showPanel("address");
    addressStatus.textContent = "";
  } catch (error) {
    alert(`Unable to load addresses: ${error.message}`);
  }
});

menuOrders.addEventListener("click", async () => {
  hamburgerMenu.classList.remove("show");
  if (!currentUser) {
    alert("Please login to view order history.");
    return;
  }

  try {
       const res = await fetch(`${baseURL}/api/orders/${currentUser.user.id}`, {
      headers: {
        
      ...getAuthHeaders(),
      },
    });
    if (!res.ok) {
      const err = await res.json();
      alert(`Unable to fetch order history: ${err.error || err.message}`);
      return;
    }

    const orders = await res.json();
    const orderHistoryList = document.getElementById("order-history-list");
    const orderHistoryEmpty = document.getElementById("order-history-empty");

    if (!orders || orders.length === 0) {
      orderHistoryList.innerHTML = "";
      orderHistoryEmpty.textContent = "No order history found.";
      orderHistoryEmpty.style.display = "block";
    } else {
      orderHistoryEmpty.style.display = "none";
      orderHistoryList.innerHTML = orders
        .map((o) => {
          const id = o.orderId || o.order_id;
          const status = o.status || "Unknown";
          const items = o.items || [];

          const itemsHTML = items
            .map(
              (item) => `
        <div style="display:flex;justify-content:space-between;margin:4px 0;">
          <span>${item.name} x <b>${item.qty}</b></span>
          <span>₹<b>${formatPrice(item.price * item.qty)}</b></span>
        </div>
      `,
            )
            .join("");

          return `
    <li style="
      margin:12px 0;
      border:1px solid #ccc;
      border-radius:8px;
      background:#fff;
      font-family:monospace;
      overflow:hidden;
    ">
      <details>
        <summary style="
          cursor:pointer;
          padding:12px;
          font-weight:bold;
          background:#f5f5f5;
        ">
          Order ID: ${id} | ${status} <br> | ${new Date(o.createdAt).toLocaleString()} | Total: ₹${formatPrice(o.totalAmount)}
        </summary>

        <div style="padding:12px;">
          <div><strong>Date:</strong> ${new Date(o.createdAt).toLocaleString()}</div>

          <hr/>

          <div><strong>Items:</strong></div>
          ${itemsHTML}

          <hr/>

          <div style="display:flex;justify-content:space-between;">
            <span><b>Subtotal</b></span>
            <span>₹${formatPrice(o.subtotal)}</span>
          </div>

          <div style="display:flex;justify-content:space-between;">
            <span><b>Tax</b></span>
            <span>₹${formatPrice(o.tax)}</span>
          </div>

          <div style="display:flex;justify-content:space-between;">
            <span><b>Platform Fee</b></span>
            <span>₹${formatPrice(o.platformFee)}</span>
          </div>

          <div style="display:flex;justify-content:space-between;">
            <span><b>Delivery Fee</b></span>
            <span>₹${formatPrice(o.deliveryFee)}</span>
          </div>

          <hr/>

          <div style="display:flex;justify-content:space-between;font-weight:bold;">
            <span>Total</span>
            <span>₹${formatPrice(o.totalAmount)}</span>
          </div>
        </div>
      </details>
    </li>
  `;
        })
        .join("");
    }

    showPanel("orderHistory");
  } catch (error) {
    alert(`Error fetching order history: ${error.message}`);
  }
});

// Save profile
saveProfileBtn.onclick = async () => {
  if (!currentUser) {
    alert("Please login first.");
    return;
  }

  const userNameValue = profileName.value.trim();
  if (!userNameValue) {
    profileStatus.textContent = "Name cannot be empty.";
    return;
  }

  showSpinner();
  try {
    const res = await fetch(
      `${baseURL}/api/auth/profile/${currentUser.user.id}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ userName: userNameValue }),
      },
    );

    const data = await res.json();
    if (!res.ok || !data.success) {
      profileStatus.textContent = data.error || "Failed to save profile.";
      return;
    }

    currentUser.user = data.user;
    localStorage.setItem("currentUser", JSON.stringify(currentUser));
    updateUserMenuState();
    profileStatus.style.color = "#2e7d32";
    profileStatus.textContent = "Profile updated successfully.";
    renderProfile(data.user);
  } catch (err) {
    profileStatus.style.color = "#d32f2f";
    profileStatus.textContent = `Error: ${err.message}`;
  } finally {
    hideSpinner();
  }
};

// Update password
updatePasswordBtn.onclick = async () => {
  if (!currentUser) {
    alert("Please login first.");
    return;
  }

  const oldPass = currentPassword.value;
  const newPass = newPassword.value;

  if (!oldPass || !newPass) {
    profileStatus.style.color = "#d32f2f";
    profileStatus.textContent = "Current and new password are required.";
    return;
  }

  showSpinner();
  try {
    const res = await fetch(
      `${baseURL}/api/auth/profile/${currentUser.user.id}/password`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ oldPassword: oldPass, newPassword: newPass }),
      },
    );

    const data = await res.json();
    if (!res.ok || !data.success) {
      profileStatus.style.color = "#d32f2f";
      profileStatus.textContent = data.error || "Failed to update password.";
      return;
    }

    profileStatus.style.color = "#2e7d32";
    profileStatus.textContent =
      data.message || "Password updated successfully.";
    currentPassword.value = "";
    newPassword.value = "";
  } catch (err) {
    profileStatus.style.color = "#d32f2f";
    profileStatus.textContent = `Error: ${err.message}`;
  } finally {
    hideSpinner();
  }
};

backFromProfileBtn.onclick = () => {
  profileStatus.textContent = "";
  showPanel("menu");
};

// Add address
addAddressBtn.onclick = async () => {
  if (!currentUser) {
    alert("Please login first.");
    return;
  }

  const address = {
    line1: newAddressLine1.value.trim(),
    city: newAddressCity.value.trim(),
    state: newAddressState.value.trim(),
    pin: newAddressPin.value.trim(),
  };

  if (!address.line1 || !address.city || !address.state || !address.pin) {
    addressStatus.textContent = "All address fields are required.";
    return;
  }

  showSpinner();
  try {
    const res = await fetch(
      `${baseURL}/api/auth/profile/${currentUser.user.id}/address`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify(address),
      },
    );

    const data = await res.json();
    if (!res.ok || !data.success) {
      addressStatus.textContent = data.error || "Failed to add address.";
      return;
    }

    currentUser.user = data.user;
    localStorage.setItem("currentUser", JSON.stringify(currentUser));
    renderAddress(data.user);
    addressStatus.style.color = "#2e7d32";
    addressStatus.textContent = "Address added successfully.";

    newAddressLine1.value = "";
    newAddressCity.value = "";
    newAddressState.value = "";
    newAddressPin.value = "";
  } catch (err) {
    addressStatus.textContent = `Error: ${err.message}`;
  } finally {
    hideSpinner();
  }
};

backFromAddressBtn.onclick = () => {
  addressStatus.textContent = "";
  showPanel("menu");
};

// Event listeners for eye buttons
document.addEventListener("click", (e) => {
  if (e.target.classList.contains("eye-btn")) {
    const targetId = e.target.dataset.target;
    togglePasswordVisibility(targetId, e.target);
  }
});

// Password strength checker
newPassword.addEventListener("input", (e) => {
  checkPasswordStrength(e.target.value);
});

// Remove address event
manageAddressList.addEventListener("click", async (e) => {
  if (e.target.classList.contains("remove-addr-btn")) {
    const index = e.target.dataset.index;
    if (confirm("Are you sure you want to remove this address?")) {
      showSpinner();
      try {
        const res = await fetch(
          `${baseURL}/api/auth/profile/${currentUser.user.id}/address/${index}`,
          {
            method: "DELETE",
            headers: {...getAuthHeaders()},
          },
        );

        const data = await res.json();
        if (!res.ok || !data.success) {
          addressStatus.textContent = data.error || "Failed to remove address.";
          return;
        }

        currentUser.user = data.user;
        localStorage.setItem("currentUser", JSON.stringify(currentUser));
        renderAddress(data.user);
        addressStatus.style.color = "#2e7d32";
        addressStatus.textContent = "Address removed successfully.";
      } catch (err) {
        addressStatus.textContent = `Error: ${err.message}`;
      } finally {
        hideSpinner();
      }
    }
  }
});

function renderMenu(items) {
  //  safety: do not clear UI if empty list passed accidentally
  let aliasItems = items || [];
  if (!aliasItems || aliasItems.length === 0) {
    console.warn("renderMenu called with empty items. Skipping render.");
    const savedMenu = localStorage.getItem("menuItems");
    menuItems = JSON.parse(savedMenu);
    aliasItems = menuItems || [];
    // return;
  }

  menuList.innerHTML = "";

  aliasItems.forEach((item) => {
    const imgUrl = 'images/' + (item.name) + '.jpg';
    const card = document.createElement("div");
    card.className = "menu-card";

    const availableQty = item.availableQty || item.available_qty || 0;
    const isOutOfStock = availableQty <= 0;
    const cartItemCurrentQty = cart.find((i) => i.id === item.id)?.qty || 0;
    card.innerHTML = `
      <img src="${imgUrl}" alt="${item.name}" class="menu-item-image" onerror="this.onerror=null;this.src='images/default.jpg';"><br>
      <strong>${item.name}</strong>
      <br> <small>₹${formatPrice(item.price)}</small>
      <p>Tags: ${(item.tags || []).join(", ")}</p>
      <p style="color: ${
        isOutOfStock ? "red" : "green"
      }; font-weight: bold;">Stock: ${availableQty}</p>

     <p style="color: BLACK; font-weight: bold;">Cart Qty  : <B>${cartItemCurrentQty}</B></p>
      <div class="menu-qty-controls" data-id="${item.id}">
  <button class="menu-qty-btn" data-action="decrease" ${
    cartItemCurrentQty <= 0 ? "disabled" : ""
  }>-</button>
  
  <button class="menu-qty-btn" data-action="increase" ${
    isOutOfStock ? "disabled" : ""
  }>+</button>
</div>


    `;

    menuList.appendChild(card);
  });
}

function refreshCart() {
  cartList.innerHTML = "";

  const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  totalAmount.textContent = formatPrice(total);

  if (cart.length === 0) {
    cartList.innerHTML = "<li>No items in cart</li>";
    toCheckoutBtn.disabled = true;
    return;
  }

  cart.forEach((item) => {
    const li = document.createElement("li");
    li.className = "cart-item";
    li.style.display = "flex";
    li.style.justifyContent = "space-between";
    li.style.alignItems = "center";
    li.style.padding = "8px 0";
    li.style.borderBottom = "1px solid #eee";

    const itemInfo = document.createElement("span");
    itemInfo.textContent = `${item.name} (₹${formatPrice(item.price)})`;

    const qtyControls = document.createElement("div");
    qtyControls.style.display = "flex";
    qtyControls.style.alignItems = "center";
    qtyControls.style.gap = "8px";

    const decreaseBtn = document.createElement("button");
    decreaseBtn.textContent = "-";
    decreaseBtn.style.padding = "4px 8px";
    decreaseBtn.style.cursor = "pointer";
    decreaseBtn.dataset.itemId = item.id;
    decreaseBtn.dataset.action = "decrease";
    decreaseBtn.className = "cart-qty-btn";
    decreaseBtn.type = "button";
    const qtyDisplay = document.createElement("span");
    qtyDisplay.textContent = item.qty;
    qtyDisplay.style.minWidth = "20px";
    qtyDisplay.style.textAlign = "center";
    qtyDisplay.style.fontWeight = "bold";

    const increaseBtn = document.createElement("button");
    increaseBtn.textContent = "+";
    increaseBtn.style.padding = "4px 8px";
    increaseBtn.style.cursor = "pointer";
    increaseBtn.dataset.itemId = item.id;
    increaseBtn.dataset.action = "increase";
    increaseBtn.className = "cart-qty-btn";
    increaseBtn.type = "button";
    const subtotal = document.createElement("span");
    subtotal.textContent = formatPrice(item.price * item.qty);
    subtotal.style.minWidth = "60px";
    subtotal.style.textAlign = "right";
    subtotal.style.fontWeight = "bold";

    qtyControls.appendChild(decreaseBtn);
    qtyControls.appendChild(qtyDisplay);
    qtyControls.appendChild(increaseBtn);
    qtyControls.appendChild(subtotal);

    li.appendChild(itemInfo);
    li.appendChild(qtyControls);
    cartList.appendChild(li);
  });

  toCheckoutBtn.disabled = false;
}

async function loadMenu() {
   try {
    const res = await fetch(`${baseURL}/api/menu`, {
      headers: {
        ...getAuthHeaders()
      },
    });
    if (!res.ok) {
      throw new Error(`Failed to load menu: ${res.status}`);
    }

    menuItems = await res.json();
    localStorage.setItem("menuItems", JSON.stringify(menuItems));
    renderMenu(menuItems);
  } catch (error) {
    console.error("Error loading menu:", error);
    const savedMenu = localStorage.getItem("menuItems");
    if (savedMenu) {
      console.warn("Loading menu from localStorage fallback...");
      menuItems = JSON.parse(savedMenu);
      renderMenu(menuItems);
      return;
    }

    menuList.innerHTML = `
      <p style='text-align: center; color: #d32f2f; padding: 20px;'>
        Failed to load menu. Please try refreshing the page.
      </p>`;
  }
}

async function loadCart() {
  try {
    if (!currentUser?.user?.id) return;
   
    const res = await fetch(`${baseURL}/api/cart/${currentUser.user.id}`, {
      headers: {
        ...getAuthHeaders()
      },
    });
    if (!res.ok) return;

    const cartData = await res.json();
    cart = cartData.items || [];
    refreshCart();
  } catch (error) {
    console.error("Error loading cart:", error);
  }
}

// -----------------------------
// NAVIGATION
// -----------------------------
goRegisterBtn.onclick = () => showPanel("register");
goLoginBtn.onclick = () => showPanel("login");
goForgotPasswordBtn.onclick = () => showPanel("forgotUserPassword");

const backLoginBtn = document.getElementById("back-login");
if (backLoginBtn) backLoginBtn.onclick = () => showPanel("login");
const backLoginBtn2 = document.getElementById("back-login2");
if (backLoginBtn2) backLoginBtn2.onclick = () => showPanel("login");
const backMenuBtn = document.getElementById("back-menu");
if (backMenuBtn) backMenuBtn.onclick = () => showPanel("menu");

const backToMenuBtn = document.getElementById("back-to-menu");
if (backToMenuBtn) backToMenuBtn.onclick = () => showPanel("menu");

// Clear cart button
clearCartBtn.onclick = async () => {
  if (!confirm("Are you sure you want to clear your cart?")) return;

  try {
       const res = await fetch(`${baseURL}/api/cart/clear`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders()
      },
      body: JSON.stringify({ userId: currentUser?.user?.id }),
    });

    if (!res.ok) {
      throw new Error("Failed to clear cart");
    }

    cart = [];
    refreshCart();
    renderMenu(menuItems);
  } catch (error) {
    alert(`Error: ${error.message}`);
  }
};

// -----------------------------
// REGISTER FLOW (ENCRYPTED)
// -----------------------------
registerForm.onsubmit = async (ev) => {
  ev.preventDefault();
  registerStatus.textContent = "Registering user...";

  const userName = document.getElementById("reg-name").value.trim();
  const userEmail = document.getElementById("reg-email").value.trim();
  const password = document.getElementById("reg-password").value;

  const address = [
    {
      line1: document.getElementById("reg-line1").value.trim(),
      city: document.getElementById("reg-city").value.trim(),
      state: document.getElementById("reg-state").value.trim(),
      pin: document.getElementById("reg-pin").value.trim(),
    },
  ];

  try {
    const res = await securePost(`${baseURL}/api/auth/register`, {
      userName,
      userEmail,
      password,
      address,
    });

    const data = await res.json();

    if (!res.ok) {
      registerStatus.textContent = `Registration failed: ${data.error}`;
      return;
    }

    registerStatus.textContent = "Registration successful! Please login.";
    showPanel("login");
  } catch (err) {
    registerStatus.textContent = `Error: ${err.message}`;
  }
};

// -----------------------------
// LOGIN FLOW (ENCRYPTED)
// -----------------------------
loginForm.onsubmit = async (ev) => {
  ev.preventDefault();

  const email = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value;

  try {
    const res = await securePost(`${baseURL}/api/auth/login`, {
      email,
      password,
    });

    if (!res.ok) {
      alert("Login failed");
      return;
    }

    currentUser = await res.json();
    // Persist user after refresh
    localStorage.setItem("currentUser", JSON.stringify(currentUser));
    updateUserMenuState();
    await loadCart();
    showPanel("menu");
    await loadMenu();
  } catch (err) {
    alert(`Login error: ${err.message}`);
  }
};

// -----------------------------
// Forgot Password FLOW 
// -----------------------------
forgotPasswordForm.onsubmit = async (ev) => {
  ev.preventDefault();
  const email = document.getElementById("forgot-password-email").value.trim();
  forgotPasswordStatus.textContent = "Sending reset link...";

  try {
     const res = await fetch(`${baseURL}/api/auth/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });


    const data = await res.json();

    if (!res.ok) {
      forgotPasswordStatus.textContent = `Failed to send reset link: ${data.error}`;
      return;
    }

    forgotPasswordStatus.textContent = "Reset link sent successfully!";
    showPanel("login");
  } catch (err) {
    forgotPasswordStatus.textContent = `Error: ${err.message}`;
  }
};
// -----------------------------
// MENU EVENTS
// -----------------------------
// menuList.addEventListener("input", (e) => {
//   if (e.target.matches(".qty-input")) {
//     const id = e.target.dataset.id;
//     const count = Number(e.target.value);
//     const item = menuItems.find((i) => i.id === id);

//     if (!item) return;

//     const availableQty = item.availableQty || item.available_qty || 0;
//     const existingInCart = cart.find((i) => i.id === id)?.qty || 0;
//     const maxAddable = availableQty - existingInCart;

//     if (count > maxAddable) {
//       e.target.max = maxAddable;
//       e.target.value = maxAddable;
//       if (maxAddable === 0) {
//         alert(
//           `This item is already fully in your cart (${existingInCart} items). No more available.`,
//         );
//       } else {
//         alert(`You can only add ${maxAddable} more of this item.`);
//       }
//       return;
//     }

//     let cartItem = cart.find((i) => i.id === id);

//     if (count <= 0) {
//       cart = cart.filter((i) => i.id !== id);
//     } else if (cartItem) {
//       cartItem.qty = count;
//     }

//     refreshCart();
//   }
// });
// Handle increase/decrease buttons
menuList.addEventListener("click", async (e) => {
  if (!e.target.classList.contains("menu-qty-btn")) return;

  const action = e.target.dataset.action;
  const container = e.target.closest(".menu-qty-controls");
  const itemId = container.dataset.id;

  const cartItem = cart.find((i) => i.id === itemId);
  const menuItem = menuItems.find((i) => i.id === itemId);

  if (!menuItem) return;

  const availableQty = menuItem.availableQty || menuItem.available_qty || 0;
  let newQty = cartItem ? cartItem.qty : 0;

  if (action === "increase") {
    if (newQty >= availableQty) {
      alert(`Max available is ${availableQty}`);
      return;
    }
    newQty += 1;
  }

  if (action === "decrease") {
    newQty = newQty > 1 ? newQty - 1 : 0;
  }

  try {
    const res = await fetch(`${baseURL}/api/cart/update`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
      body: JSON.stringify({
        userId: currentUser?.user?.id,
        itemId,
        qty: newQty,
        itemPrice: menuItem.price,
      }),
    });

    if (!res.ok) {
      throw new Error("Failed to update cart");
    }

    if (newQty === 0) {
      cart = cart.filter((i) => i.id !== itemId);
    } else if (cartItem) {
      cartItem.qty = newQty;
    } else {
      cart.push({ ...menuItem, qty: newQty });
    }

    refreshCart();
    renderMenu(menuItems); // re-render to update UI
  } catch (err) {
    alert(err.message);
  }
});

/*
//Handle bulk add button
// menuList.addEventListener("click", async (e) => {
//   if (!e.target.matches("button")) return;

//   const id = e.target.dataset.id;
//   const qtyEl = e.target.closest(".menu-card").querySelector(".qty-input");
//   const qty = Number(qtyEl.value) || 1;

//   const item = menuItems.find((i) => i.id === id);
//   if (!item) return;

//   const availableQty = item.availableQty || item.available_qty || 0;
//   const existingInCart = cart.find((i) => i.id === id)?.qty || 0;
//   const totalRequested = existingInCart + qty;

//   if (totalRequested > availableQty) {
//     alert(
//       `Only ${availableQty - existingInCart} more of this item available. Already have ${existingInCart} in cart.`,
//     );
//     return;
//   }

//   if (qty <= 0) {
//     alert("Please select a quantity");
//     return;
//   }

//   try {
//     const res = await fetch(`${baseURL}/api/cart/add`, {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({
//         itemId: id,
//         qty: qty,
//         userId: currentUser?.user?.id,
//       }),
//     });

//     if (!res.ok) {
//       throw new Error("Failed to add item to cart");
//     }
//     console.log("cart:", cart);
//     const cartData = await res.json();
//     cart = cartData.items || [];
//     const existing = cart.find((i) => i.id === id);
//     qtyEl.value = 0;
//     renderMenu(menuItems);
//     refreshCart();
//   } catch (error) {
//     alert(`Error: ${error.message}`);
//   }
// });
*/

menuSearch.oninput = (e) => {
  const term = e.target.value.toLowerCase();

  renderMenu(
    menuItems.filter(
      (i) =>
        i.name.toLowerCase().includes(term) ||
        (i.tags || []).some((t) => t.toLowerCase().includes(term)),
    ),
  );
};

// -----------------------------
// CART QUANTITY CONTROLS
// -----------------------------
cartList.addEventListener("click", async (e) => {
  if (!e.target.matches(".cart-qty-btn")) return;

  const itemId = e.target.dataset.itemId;
  const action = e.target.dataset.action;
  const cartItem = cart.find((i) => i.id === itemId);
  const menuItem = menuItems.find((i) => i.id === itemId);

  if (!cartItem || !menuItem) return;

  const availableQty = menuItem.availableQty || menuItem.available_qty || 0;
  let newQty = cartItem.qty;

  if (action === "increase") {
    if (cartItem.qty >= availableQty) {
      alert(`Maximum available quantity is ${availableQty}`);
      return;
    }
    newQty = cartItem.qty + 1;
  } else if (action === "decrease") {
    if (cartItem.qty > 1) {
      newQty = cartItem.qty - 1;
    } else {
      newQty = 0;
    }
  }

  try {
    const res = await fetch(`${baseURL}/api/cart/update`, {
      method: "POST",
      headers: { "Content-Type": "application/json",
        ...getAuthHeaders()
       },
      body: JSON.stringify({
        userId: currentUser?.user?.id,
        itemId: itemId,
        qty: newQty,
      }),
    });

    if (!res.ok) {
      throw new Error("Failed to update cart");
    }

    if (newQty <= 0) {
      cart = cart.filter((i) => i.id !== itemId);
    } else {
      cartItem.qty = newQty;
    }

    refreshCart();
    renderMenu(menuItems);
  } catch (error) {
    alert(`Error: ${error.message}`);
    await loadCart();
  }
});

// -----------------------------
// CHECKOUT FLOW
// -----------------------------
toCheckoutBtn.onclick = async () => {
  if (cart.length === 0) return;
  currentOrderId = `WEB-${Date.now()}`;

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const taxRate = 0.05;
  const tax = subtotal * taxRate;
  const roundedTax = Math.floor(tax);

  const platformFee = 4 + Math.ceil(tax - roundedTax);
  const deliveryFee = subtotal > 500 ? 0 : 50;
  const total = subtotal + roundedTax + platformFee + deliveryFee;

  let summaryHTML = `
    <div style="border: 1px solid #ddd; padding: 15px; border-radius: 5px; background: #f9f9f9;">
      <h4 style="margin-top: 0; border-bottom: 2px solid #333; padding-bottom: 10px;">Order Items</h4>
      <table style="width: 100%; margin-bottom: 15px; border-collapse: collapse;">
        <tr style="border-bottom: 1px solid #eee; background: #f0f0f0;">
          <th style="text-align: left; padding: 8px;">Item</th>
          <th style="text-align: center; padding: 8px;">Qty</th>
          <th style="text-align: right; padding: 8px;">Price</th>
          <th style="text-align: right; padding: 8px;">Subtotal</th>
        </tr>
  `;

  cart.forEach((item) => {
    const itemSubtotal = item.price * item.qty;
    summaryHTML += `
      <tr style="border-bottom: 1px solid #eee;">
        <td style="padding: 8px;">${item.name}</td>
        <td style="text-align: center; padding: 8px;">${item.qty}</td>
        <td style="text-align: right; padding: 8px;">₹${formatPrice(
          item.price,
        )}</td>
        <td style="text-align: right; padding: 8px; font-weight: bold;">₹${formatPrice(
          itemSubtotal,
        )}</td>
      </tr>
    `;
  });

  summaryHTML += `
      </table>

      <h4 style="border-bottom: 2px solid #333; padding-bottom: 10px; margin-top: 15px;">Order Summary</h4>
      <div style="margin-bottom: 10px;">
        <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee;">
          <span>Subtotal:</span>
          <span>₹${formatPrice(subtotal)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee;">
          <span>Tax (5%):</span>
          <span>₹${formatPrice(roundedTax)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee;">
          <span>Platform Fee:</span>
          <span>₹${formatPrice(platformFee)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 2px solid #333;">
          <span>Delivery Fee:</span>
          <span>${
            deliveryFee === 0
              ? '<span style="color: green;">FREE</span>'
              : "₹" + formatPrice(deliveryFee)
          }</span>
        </div>
        <div style="display: flex; justify-content: space-between; padding: 12px 0; font-size: 1.1em; font-weight: bold; color: #d32f2f;">
          <span>Total Amount:</span>
          <span>₹${formatPrice(total)}</span>
        </div>
      </div>

      <p style="color: #666; font-size: 0.9em; margin-top: 10px;">
        <strong>Order ID:</strong> ${currentOrderId}
      </p>
    </div>
  `;

  checkoutSummary.innerHTML = summaryHTML;

  const keyRes = await fetch(`${baseURL}/api/stripe-publishable-key`,{ headers: { ...getAuthHeaders() }   });
  const { publishableKey } = await keyRes.json();

  stripe = Stripe(publishableKey);
  const elements = stripe.elements();

  if (cardElement) cardElement.unmount();
  cardElement = elements.create("card");
  cardElement.mount("#card-element");

  showPanel("checkout");
};

// -----------------------------
// PAYMENT FLOW
// -----------------------------
payNowBtn.onclick = async () => {
  if (!currentOrderId || !currentUser) return;

  paymentStatus.textContent = "Creating order from cart...";

  try {
    const createOrderRes = await fetch(`${baseURL}/api/create-order`, {
      method: "POST",
      headers: { "Content-Type": "application/json" ,
        ...getAuthHeaders()
      },
      body: JSON.stringify({
        orderId: currentOrderId,
        userId: currentUser.user.id,
      }),
    });

    if (!createOrderRes.ok) {
      const error = await createOrderRes.json();
      paymentStatus.textContent = `Order creation failed: ${error.error}`;
      return;
    }

    const orderData = await createOrderRes.json();
    const finalTotalAmount = orderData.totalAmount || orderData.total_amount;

    paymentStatus.textContent = "Initiating payment...";

    const paymentRes = await fetch(`${baseURL}/api/create-payment-intent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify({
        orderId: currentOrderId,
        amount: finalTotalAmount,
        customer: currentUser.user,
      }),
    });

    const body = await paymentRes.json();

    if (!paymentRes.ok) {
      paymentStatus.textContent = `Payment initialization failed: ${body.error}`;
      return;
    }

    const userAddress = currentUser.user.address?.[0] || {};

    const result = await stripe.confirmCardPayment(body.clientSecret, {
      payment_method: {
        card: cardElement,
        billing_details: {
          name: currentUser.user.userName || "Test User",
          email: currentUser.user.userEmail,
          address: {
            line1: userAddress.line1 || "Street 1",
            city: userAddress.city || "Mumbai",
            state: userAddress.state || "Maharashtra",
            postal_code: userAddress.pin || "751001",
            country: "IN",
          },
        },
      },
    });

    if (result.error) {
      paymentStatus.textContent = `Payment failed: ${result.error.message}`;
      return;
    }

    if (result.paymentIntent.status === "succeeded") {
      await fetch(`${baseURL}/api/order-complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ orderId: currentOrderId }),
      });

      paymentStatus.textContent = "Payment succeeded! Fetching order status...";

      const stateRes = await fetch(
        `${baseURL}/api/order-status/${currentOrderId}`,
        {
          headers: { ...getAuthHeaders() },
        }
      );

      const orderState = await stateRes.json();

      statusOrderId.textContent = orderState.id;
      statusState.textContent = orderState.status;
      statusTotal.textContent = formatPrice(orderState.amount);

      showPanel("status");
    }
  } catch (error) {
    paymentStatus.textContent = `Error: ${error.message}`;
  }
};

// -----------------------------
// RESET FLOW
// -----------------------------
backHomeBtn.onclick = () => {
  cart = [];
  currentOrderId = null;
  paymentStatus.textContent = "";

  updateUserMenuState();
  renderMenu(menuItems);
  refreshCart();
  showPanel("menu");
};

// -----------------------------
// AUTO LOGIN ON REFRESH
// -----------------------------
const savedUser = localStorage.getItem("currentUser");

if (savedUser) {
  currentUser = JSON.parse(savedUser);
  updateUserMenuState();
  showPanel("menu");
  (async function init() {
    await loadCart();
    await loadMenu();
  })();
} else {
  updateUserMenuState();
  showPanel("login");
}

// -----------------------------
// LOGOUT
// -----------------------------
menuLogout.onclick = async () => {
  if (!confirm("Are you sure you want to logout?")) return;

  try {
    await fetch(`${baseURL}/api/auth/logout`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    });
  } catch (err) {
    console.error("Logout API error:", err);
  }

  localStorage.removeItem("currentUser");
  localStorage.removeItem("menuItems");
  currentUser = null;
  cart = [];
  currentOrderId = null;

  updateUserMenuState();
  cartList.innerHTML = "";
  totalAmount.textContent = "0.00";

  showPanel("login");
};
