const CartModel = require("./models/cartModel");

const deduplicateCart = (cart) => {
  if (cart?.items?.length <= 1) {
    return  cart;
  }
  const itemMap = new Map();
  for (const item of cart.items) {
    const existing = itemMap.get(item.id);

    if (existing) {
      existing.qty += item.qty;
    } else {
      itemMap.set(item.id, { ...(item.toObject?.() ?? item) });
    }
  }

  // No duplicates found
  if (itemMap.size === cart.items.length) {
    return  cart;
  }

  const updatedItems = [...itemMap.values()];

  return {
    ...(cart.toObject?.() ?? cart),
    items: updatedItems,
    totalAmount: updatedItems.reduce(
      (sum, item) => sum + item.price * item.qty,
      0
    ),
  };
};

const getCartByUserId = async (userId) => {
  try {
    let cart = await CartModel.findOne({ userId });
    if (!cart) {
      cart = await CartModel.create({ userId, items: [], totalAmount: 0 });
    }
    return cart;
  } catch (error) {
    throw new Error(`Error fetching cart: ${error.message}`);
  }
};

const addItemToCart = async (userId, item) => {
  try {
    let cart = await CartModel.findOne({ userId });

    if (!cart) {
      cart = await CartModel.create({
        userId,
        items: [item],
        totalAmount: item.price * item.qty,
      });
    } else {
      const existingItem = cart.items.find((i) => i.id === item.id);

      if (existingItem) {
        existingItem.qty = item.qty;
      } else {
        cart.items.push(item);
      }

      const updatedCart = deduplicateCart(cart);

      cart.items = updatedCart.items;
      cart.totalAmount = updatedCart.totalAmount;

      await cart.save();
    }

    return cart;
  } catch (error) {
    throw new Error(`Error adding item to cart: ${error.message}`);
  }
};

const updateCartItem = async (userId, itemId, qty) => {
  try {
    const cart = await CartModel.findOne({ userId });

    if (!cart) {
      throw new Error("Cart not found");
    }

    const item = cart.items.find((i) => i.id === itemId);

    if (!item) {
      throw new Error("Item not found in cart");
    }

    if (qty <= 0) {
      cart.items = cart.items.filter((i) => i.id !== itemId);
    } else {
      item.qty = qty;
    }

    const updatedCart = deduplicateCart(cart);

    cart.items = updatedCart.items;
    cart.totalAmount = updatedCart.totalAmount;

    await cart.save();

    return cart;
  } catch (error) {
    throw new Error(`Error updating cart item: ${error.message}`);
  }
};

const removeItemFromCart = async (userId, itemId) => {
  try {
    const cart = await CartModel.findOne({ userId });

    if (!cart) {
      throw new Error("Cart not found");
    }

    cart.items = cart.items.filter((i) => i.id !== itemId);

    const updatedCart = deduplicateCart(cart);

    cart.items = updatedCart.items;
    cart.totalAmount = updatedCart.totalAmount;

    await cart.save();

    return cart;
  } catch (error) {
    throw new Error(`Error removing item from cart: ${error.message}`);
  }
};

const clearCart = async (userId) => {
  try {
    const cart = await CartModel.findOne({ userId });
    if (cart) {
      cart.items = [];
      cart.totalAmount = 0;
      await cart.save();
    }
    return cart;
  } catch (error) {
    throw new Error(`Error clearing cart: ${error.message}`);
  }
};

module.exports = {
  getCartByUserId,
  addItemToCart,
  removeItemFromCart,
  updateCartItem,
  clearCart,
};
