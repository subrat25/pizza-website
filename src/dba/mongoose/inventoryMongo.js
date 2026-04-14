const InventoryModel = require("./models/InventoryModel");

const getMenu = async () => {
  try {
    const items = await InventoryModel.find();
    // console.log("Fetched menu items:", JSON.stringify(items, null, 2));
    return items;
  } catch (error) {
    throw new Error(`Error fetching menu: ${error.message}`);
  }
};

const getMenuItemById = async (itemId) => {
  try {
    const item = await InventoryModel.findOne({ id: itemId });
    return item;
  } catch (error) {
    throw new Error(`Error fetching menu item: ${error.message}`);
  }
};

const checkAvailability = async (itemId, requestedQty) => {
  try {
    const item = await InventoryModel.findOne({ id: itemId });
    if (!item) {
      throw new Error("Item not found");
    }
    return item.availableQty >= requestedQty;
  } catch (error) {
    throw new Error(`Error checking availability: ${error.message}`);
  }
};

const decrementInventory = async (itemId, qty) => {
  try {
    const item = await InventoryModel.findOneAndUpdate(
      { id: itemId },
      { $inc: { availableQty: -qty } },
      { new: true }
    );
    if (!item || item.availableQty < 0) {
      throw new Error("Insufficient inventory");
    }
    return item;
  } catch (error) {
    throw new Error(`Error updating inventory: ${error.message}`);
  }
};

const incrementInventory = async (itemId, qty) => {
  try {
    const item = await InventoryModel.findOneAndUpdate(
      { id: itemId },
      { $inc: { availableQty: qty } },
      { new: true }
    );
    return item;
  } catch (error) {
    throw new Error(`Error updating inventory: ${error.message}`);
  }
};

module.exports = {
  getMenu,
  getMenuItemById,
  checkAvailability,
  decrementInventory,
  incrementInventory,
};
