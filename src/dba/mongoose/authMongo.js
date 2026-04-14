const UserProfile = require("./models/userProfileModel");
const PasswordResetToken = require("./models/passwordResetModel");
const findUserByEmail = async (email) => {
  try {
    const user = await UserProfile.findOne({ userEmail: email });
    return user;
  } catch (error) {
    throw new Error(`Error finding user by email: ${error.message}`);
  }
};

const createUser = async (userData) => {
  try {
    const { userName, userEmail, password, address } = userData;
    const newUser = await UserProfile.create({
      userName,
      userEmail,
      password,
      address: address || [],
    });
    return newUser;
  } catch (error) {
    if (error.code === 11000) {
      throw new Error("User already exists with this email");
    }
    throw new Error(`Error creating user: ${error.message}`);
  }
};

const getUserById = async (userId) => {
  try {
    const user = await UserProfile.findById(userId);
    return user;
  } catch (error) {
    throw new Error(`Error finding user by ID: ${error.message}`);
  }
};

const updateUser = async (userId, updateData) => {
  try {
    const user = await UserProfile.findByIdAndUpdate(userId, updateData, {
      new: true,
    });
    return user;
  } catch (error) {
    throw new Error(`Error updating user: ${error.message}`);
  }
};

const createPasswordResetToken = async (data) => {
  try {
    const { userId, token, expiresAt, used } = data;

    const resetToken = await PasswordResetToken.create({
      userId,
      token,
      expiresAt,
      used: used || false,
    });

    return resetToken;
  } catch (error) {
    throw new Error(`Error creating reset token: ${error.message}`);
  }
};
const getPasswordResetToken = async (token) => {
  try {
    const resetToken = await PasswordResetToken.findOne({ token });
    return resetToken;
  } catch (error) {
    throw new Error(`Error fetching reset token: ${error.message}`);
  }
};
const markTokenAsUsed = async (token) => {
  try {
    const updated = await PasswordResetToken.findOneAndUpdate(
      { token },
      { used: true },
      { new: true }
    );

    return updated;
  } catch (error) {
    throw new Error(`Error marking token as used: ${error.message}`);
  }
};


module.exports = {
  findUserByEmail,
  createUser,
  getUserById,
  updateUser,
  createPasswordResetToken,
  getPasswordResetToken,
  markTokenAsUsed,
};
