const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const authDba = require("../../dba/authDba");
const crypto = require("crypto");
const emailService = require("./emailService");



const registerUser = async ({ userName, userEmail, password, address }) => {
  if (!userName || !userEmail || !password) {
    throw new Error("userName, userEmail and password are required");
  }

  const existingUser = await authDba.findUserByEmail(userEmail);
  if (existingUser) {
    throw new Error("User already exists with this email");
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const newUser = await authDba.createUser({
    userName,
    userEmail,
    password: hashedPassword,
    address: address || [],
  });

  return {
    success: true,
    user: {
      id: newUser.id || newUser._id,
      userName: newUser.userName || newUser.user_name,
      userEmail: newUser.userEmail || newUser.user_email,
      address: newUser.address,
    },
  };
};

const loginUser = async ({ email, password }) => {
  if (!email || !password) {
    throw new Error("Email and password are required");
  }

  const user = await authDba.findUserByEmail(email);
  if (!user) {
    throw new Error("Invalid email or password");
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    throw new Error("Invalid email or password");
  }

  const userId = user.id || user._id;
  const token = jwt.sign(
    {
      userId: userId,
      email: user.userEmail || user.user_email,
    },
    process.env.JWT_SECRET || "default_secret",
    { expiresIn: "1m" }
  );

  return {
    success: true,
    user: {
      id: userId,
      userName: user.userName || user.user_name,
      userEmail: user.userEmail || user.user_email,
      address: user.address,
    },
    token,
  };
};

const getUserProfile = async (userId) => {
  if (!userId) {
    throw new Error("User ID is required");
  }

  const user = await authDba.getUserById(userId);
  if (!user) {
    throw new Error("User not found");
  }

  return {
    success: true,
    user: {
      id: user.id || user._id,
      userName: user.userName || user.user_name,
      userEmail: user.userEmail || user.user_email,
      address: user.address || [],
    },
  };
};

const updateUserProfile = async (userId, updateData) => {
  if (!userId) {
    throw new Error("User ID is required");
  }

  const validData = {};
  if (updateData.userName) validData.userName = updateData.userName;
  if (updateData.userEmail) validData.userEmail = updateData.userEmail;
  if (updateData.address) validData.address = updateData.address;

  if (Object.keys(validData).length === 0) {
    throw new Error("Nothing to update");
  }

  const updatedUser = await authDba.updateUser(userId, validData);
  if (!updatedUser) {
    throw new Error("Failed to update user");
  }

  return {
    success: true,
    user: {
      id: updatedUser.id || updatedUser._id,
      userName: updatedUser.userName || updatedUser.user_name,
      userEmail: updatedUser.userEmail || updatedUser.user_email,
      address: updatedUser.address || [],
    },
  };
};

const addUserAddress = async (userId, address) => {
  if (!userId) {
    throw new Error("User ID is required");
  }

  if (!address || !address.line1 || !address.city || !address.state || !address.pin) {
    throw new Error("Complete address fields are required");
  }

  const user = await authDba.getUserById(userId);
  if (!user) {
    throw new Error("User not found");
  }

  const addresses = Array.isArray(user.address) ? [...user.address] : [];
  addresses.push(address);

  const updatedUser = await authDba.updateUser(userId, { address: addresses });
  if (!updatedUser) {
    throw new Error("Failed to add address");
  }

  return {
    success: true,
    user: {
      id: updatedUser.id || updatedUser._id,
      userName: updatedUser.userName || updatedUser.user_name,
      userEmail: updatedUser.userEmail || updatedUser.user_email,
      address: updatedUser.address || [],
    },
  };
};

const updateUserPassword = async (userId, oldPassword, newPassword) => {
  if (!userId) {
    throw new Error("User ID is required");
  }
  if (!oldPassword || !newPassword) {
    throw new Error("Old password and new password are required");
  }

  const user = await authDba.getUserById(userId);
  if (!user) {
    throw new Error("User not found");
  }

  const isMatch = await bcrypt.compare(oldPassword, user.password);
  if (!isMatch) {
    throw new Error("Current password is incorrect");
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);
  const updatedUser = await authDba.updateUser(userId, { password: hashedPassword });
  if (!updatedUser) {
    throw new Error("Failed to update password");
  }

  return {
    success: true,
    message: "Password updated successfully",
  };
};

const removeUserAddress = async (userId, index) => {
  if (!userId) {
    throw new Error("User ID is required");
  }

  const user = await authDba.getUserById(userId);
  if (!user) {
    throw new Error("User not found");
  }

  const addresses = Array.isArray(user.address) ? [...user.address] : [];
  if (index < 0 || index >= addresses.length) {
    throw new Error("Invalid address index");
  }

  addresses.splice(index, 1);
  const updatedUser = await authDba.updateUser(userId, { address: addresses });

  return {
    success: true,
    user: {
      id: updatedUser.id || updatedUser._id,
      userName: updatedUser.userName || updatedUser.user_name,
      userEmail: updatedUser.userEmail || updatedUser.user_email,
      address: updatedUser.address || [],
    },
  };
};

const forgotUserPassword = async (email) => {
  if (!email) {
    throw new Error("Email is required");
  }

  const user = await authDba.findUserByEmail(email);

  // Always respond same (security best practice)
  if (!user) {
    return {
      success: true,
      message: "If email exists, reset link sent",
    };
  }

  // generate raw token for user
  const resetToken = crypto.randomBytes(32).toString("hex");

  // hash token before storing 
  const hashedToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min

  await authDba.createPasswordResetToken({
    userId: user.id || user._id,
    token: hashedToken,
    expiresAt,
    used: false,
  });

  const resetLink = `${process.env.baseURL}/resetPasswordPage?token=${resetToken}`;

  const mailOptions = {
    from: {
      name: "The Pizza Store",
      address: process.env.GMAIL_USER,
    },
    to: email,
    subject: "Password Reset Request",
    html: `
      <h2>Password Reset</h2>
      <p>This link expires in 10 minutes.</p>
      <a href="${resetLink}">Reset Password</a>
    `,
  };

  try {
    await emailService.sendEmail(mailOptions);
  } catch (err) {
    console.error("Email failed:", err.message);
  }

  return {
    success: true,
    message: "If email exists, reset link sent",
  };
};


const resetUserPassword = async (token, newPassword) => {
  if (!token || !newPassword) {
    throw new Error("Token and new password are required");
  }

  // hash incoming token to match DB
  const hashedToken = crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");

  // fetch token record
  const tokenData = await authDba.getPasswordResetToken(hashedToken);

  if (!tokenData) {
    throw new Error("Invalid or expired token");
  }

  if (tokenData.used) {
    throw new Error("Token already used");
  }

  if (new Date() > new Date(tokenData.expiresAt)) {
    throw new Error("Token expired");
  }

  const user = await authDba.getUserById(tokenData.userId);
  if (!user) {
    throw new Error("User not found");
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);

  await authDba.updateUser(tokenData.userId, {
    password: hashedPassword,
  });

  // mark token as used (CRITICAL)
  await authDba.markTokenAsUsed(hashedToken);

  return {
    success: true,
    message: "Password reset successful",
  };
};


module.exports = {
  registerUser,
  loginUser,
  getUserProfile,
  updateUserProfile,
  addUserAddress,
  updateUserPassword,
  removeUserAddress,
   forgotUserPassword,   
  resetUserPassword,   
};