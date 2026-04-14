const OrderModel = require("./models/OrderModel");

const createOrder = async (orderData) => {
  try {
    const {
      orderId,
      userId,
      items,
      subtotal,
      tax,
      platformFee,
      deliveryFee,
      totalAmount,
      paymentIntent,
      customerEmail,
      customerName,
      shippingAddress,
    } = orderData;
console.log("Creating order with data:", orderData);
    const order = await OrderModel.create({
      orderId,
      userId,
      items,
      subtotal,
      tax,
      platformFee,
      deliveryFee,
      totalAmount,
      paymentIntent,
      customerEmail,
      customerName,
      shippingAddress,
      status: "pending",
    });

    return order;
  } catch (error) {
    throw new Error(`Error creating order: ${error.message}`);
  }
};

const getOrderById = async (orderId) => {
  try {
    const order = await OrderModel.findOne({ orderId });
    return order;
  } catch (error) {
    throw new Error(`Error fetching order: ${error.message}`);
  }
};

const updateOrderStatus = async (orderId, status) => {
  try {
    const order = await OrderModel.findOneAndUpdate(
      { orderId },
      { status },
      { new: true }
    );
    return order;
  } catch (error) {
    throw new Error(`Error updating order status: ${error.message}`);
  }
};

const getUserOrders = async (userId) => {
  try {
    const orders = await OrderModel.find({ userId }).sort({ createdAt: -1 });
    return orders;
  } catch (error) {
    throw new Error(`Error fetching user orders: ${error.message}`);
  }
};

module.exports = {
  createOrder,
  getOrderById,
  updateOrderStatus,
  getUserOrders,
};
