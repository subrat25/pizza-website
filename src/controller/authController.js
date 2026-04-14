const authMockService = require("../services/mockService/authMockService");
const authService = require("../services/service/authService");
const jwt = require("jsonwebtoken");

const authMapperService =
  process.env.USE_MOCK_SERVICES_Auth === "true" ? authMockService : authService;


const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const result = await authMapperService.loginUser({ email, password });

    return res.json(result);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
};

const register = async (req, res) => {
  try {
    const { userName, userEmail, password, address } = req.body;

    const result = await authMapperService.registerUser({
      userName,
      userEmail,
      password,
      address,
    });

    return res.json(result);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
};

const getProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await authMapperService.getUserProfile(id);
    return res.json(result);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
};

const updateProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const payload = req.body;
    const result = await authMapperService.updateUserProfile(id, payload);
    return res.json(result);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
};

const addAddress = async (req, res) => {
  try {
    const { id } = req.params;
    const address = req.body;
    const result = await authMapperService.addUserAddress(id, address);
    return res.json(result);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
};

const updatePassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { oldPassword, newPassword } = req.body;
    const result = await authMapperService.updateUserPassword(id, oldPassword, newPassword);
    return res.json(result);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
};

const removeAddress = async (req, res) => {
  try {
    const { id, index } = req.params;
    if (req.userId !== id) return res.status(403).json({ error: 'Unauthorized' });
    const result = await authMapperService.removeUserAddress(id, parseInt(index));
    return res.json(result);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
};

const logout = async (req, res) => {
  try {
    return res.json({
      success: true,
      message: "Logout successful",
    });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
};

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const result = await authMapperService.forgotUserPassword(email);

    return res.json(result);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
};

const resetPassword = async (req, res) => {
  try {
    let { token, newPassword } = req.body;
    if(!token) token = req.query.token; // Support token in query params for GET requests
    const result = await authMapperService.resetUserPassword(
      token,
      newPassword
    );

    return res.json(result);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
};

module.exports = {
  login,
  register,
  logout,
  forgotPassword,
  resetPassword,
  getProfile,
  updateProfile,
  addAddress,
  updatePassword,
  removeAddress,
};