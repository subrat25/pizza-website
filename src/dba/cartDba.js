const cartMongo = require("./mongoose/cartMongo");
const cartPostgres = require("./postgres/cartPostgres");
const cartMysql = require("./mysql/cartMysql");

const DB_TYPE = process.env.DB_TYPE || "MONGO";

const dbServiceMap = {
  MONGO: cartMongo,
  POSTGRES: cartPostgres,
  MYSQL: cartMysql,
};

const getDbService = () => {
  const service = dbServiceMap[DB_TYPE];
  if (!service) {
    throw new Error(
      `Invalid DB_TYPE: ${DB_TYPE}. Supported types: MONGO, POSTGRES, MYSQL`
    );
  }
  return service;
};

const getCartByUserId = async (userId) => {
  const dbService = getDbService();
  return await dbService.getCartByUserId(userId);
};

const addItemToCart = async (userId, item, cart) => {
  const dbService = getDbService();
  return await dbService.addItemToCart(userId, item, cart);
};

const removeItemFromCart = async (userId, itemId) => {
  const dbService = getDbService();
  return await dbService.removeItemFromCart(userId, itemId);
};

const updateCartItem = async (userId, itemId, qty,cart) => {
  const dbService = getDbService();
  return await dbService.updateCartItem(userId, itemId, qty,cart);
};

const clearCart = async (userId) => {
  const dbService = getDbService();
  return await dbService.clearCart(userId);
};

module.exports = {
  getCartByUserId,
  addItemToCart,
  removeItemFromCart,
  updateCartItem,
  clearCart,
};
