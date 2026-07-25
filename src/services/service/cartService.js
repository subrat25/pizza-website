const cartDba = require("../../dba/cartDba");
const inventoryDba = require("../../dba/inventoryDba");

const addToCart = async (userId, itemId, qty, cart=null) => {
  try {
    // Check inventory availability
    const available = await inventoryDba.checkAvailability(itemId, qty);
    if (!available) {
      throw new Error("Insufficient inventory");
    }

    // Get item details from inventory
    const item = await inventoryDba.getMenuItemById(itemId);
    if (!item) {
      throw new Error("Item not found");
    }
    let trueQty = qty;
    const retrivedCart = cart ? cart : await cartDba.getCartByUserId(userId);
    if (retrivedCart && retrivedCart.items.some((i) => i.id === itemId)) { 
      trueQty = retrivedCart.items.find((i) => i.id === itemId).qty + qty;
    }

    // Prepare cart item (normalize field names)
    const cartItem = {
      id: item.id,
      name: item.name || item.user_name,
      price: item.price,
      qty: trueQty,
      tags: item.tags || [],
    };

    // Add to cart
    const updatedCart  = await cartDba.addItemToCart(userId, cartItem);
    return updatedCart;
  } catch (error) {
    throw new Error(`Error adding to cart: ${error.message}`);
  }
};

const removeFromCart = async (userId, itemId) => {
  try {
    const cart = await cartDba.removeItemFromCart(userId, itemId);
    return cart;
  } catch (error) {
    throw new Error(`Error removing from cart: ${error.message}`);
  }
};

const updateCart = async (userId, itemId, qty) => {
  try {
    if (qty && qty <= 0) {
      const cart = await removeFromCart(userId, itemId);
      return cart;
    }
    // Check inventory availability for updated quantity
    const available = await inventoryDba.checkAvailability(itemId, qty);
    if (!available) {
      throw new Error("Insufficient inventory");
    }
    let cart1 = await cartDba.getCartByUserId(userId);
    let cart;
    if (cart1.items.some((i) => i.id === itemId)) {
      cart = await cartDba.updateCartItem(userId, itemId, qty, cart1);
    } else if (cart1.items.some((i) => i.id === itemId) === false) {
      cart = await addToCart(userId, itemId, qty, cart1);
    }

    return cart;
  } catch (error) {
    throw new Error(`Error updating cart: ${error.message}`);
  }
};

const getCart = async (userId) => {
  try {
    const cart = await cartDba.getCartByUserId(userId);
    return cart;
  } catch (error) {
    throw new Error(`Error fetching cart: ${error.message}`);
  }
};

const clearCart = async (userId) => {
  try {
    const cart = await cartDba.clearCart(userId);
    return cart;
  } catch (error) {
    throw new Error(`Error clearing cart: ${error.message}`);
  }
};

module.exports = {
  addToCart,
  removeFromCart,
  updateCart,
  getCart,
  clearCart,
};
