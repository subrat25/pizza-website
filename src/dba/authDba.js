const authMongo = require("./mongoose/authMongo");
const authPostgres = require("./postgres/authPostgres");
const authMysql = require("./mysql/authMysql");

const DB_TYPE = process.env.DB_TYPE || "MONGO";

const dbServiceMap = {
  MONGO: authMongo,
  POSTGRES: authPostgres,
  MYSQL: authMysql,
};

const getDbService = () => {
  const service = dbServiceMap[DB_TYPE];
  if (!service) {
    throw new Error(
      `Invalid DB_TYPE: ${DB_TYPE}. Supported types: MONGO, POSTGRES, MYSQL`,
    );
  }
  return service;
};

const findUserByEmail = async (email) => {
  const dbService = getDbService();
  return await dbService.findUserByEmail(email);
};

const createUser = async (userData) => {
  const dbService = getDbService();
  return await dbService.createUser(userData);
};

const getUserById = async (userId) => {
  const dbService = getDbService();
  return await dbService.getUserById(userId);
};

const updateUser = async (userId, updateData) => {
  const dbService = getDbService();
  return await dbService.updateUser(userId, updateData);
};

const createPasswordResetToken = async (data) => {
  const dbService = getDbService();

  return await dbService.createPasswordResetToken({
    userId: data.userId,
    token: data.token, // already hashed
    expiresAt: data.expiresAt,
    used: data.used || false,
  });
};

const getPasswordResetToken = async (token) => {
  const dbService = getDbService();

  return await dbService.getPasswordResetToken(token);
};

const markTokenAsUsed = async (token) => {
  const dbService = getDbService();

  return await dbService.markTokenAsUsed(token);
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
