const orderDba = require("../../dba/orderDba");
const cartDba = require("../../dba/cartDba");
const userDba = require("../../dba/authDba");
const inventoryDba = require("../../dba/inventoryDba");
const emailService = require("./emailService");
const createOrderFromCart = async (userId, orderId, paymentIntent, customerInfo) => {
  try {
    // Fetch user's cart
    const cart = await cartDba.getCartByUserId(userId);
    if (
      !customerInfo ||
      (!customerInfo?.userEmail && !customerInfo?.email) ||
      (!customerInfo?.userName && !customerInfo?.name)
    ) {
      const user = await userDba.getUserById(userId);
      const { userName, userEmail } = user || {};
      customerInfo.userName = customerInfo.userName || userName;
      customerInfo.userEmail = customerInfo.userEmail || userEmail;
    }

    if (!cart || !cart.items || cart.items.length === 0) {
      throw new Error("Cart is empty");
    }

    // Validate inventory and decrement quantities
    for (const item of cart.items) {
      const available = await inventoryDba.checkAvailability(item.id, item.qty);
      if (!available) {
        throw new Error(`Insufficient inventory for ${item.name}`);
      }
      await inventoryDba.decrementInventory(item.id, item.qty);
    }

    // Calculate charges
    const subtotal = cart.total_amount || cart.totalAmount;
    const taxRate = 0.05; // 5% tax
    const tax = subtotal * taxRate;
    const roundedTax = Math.floor(tax);
    const platformFee = 4 + Math.ceil(tax - roundedTax);
    const deliveryFee = subtotal > 500 ? 0 : 50; // Free delivery if > ₹500
    const totalAmount = subtotal + roundedTax + platformFee + deliveryFee;

    // Create order from cart
    const orderData = {
      orderId,
      userId,
      items: cart.items,
      subtotal,
      tax: roundedTax,
      deliveryFee,
      platformFee,
      totalAmount,
      paymentIntent,
      customerEmail: customerInfo.userEmail || customerInfo.email,
      customerName: customerInfo.userName || customerInfo.name,
      shippingAddress: customerInfo.address?.[0] || {},
    };

    const order = await orderDba.createOrder(orderData);

    // Clear cart after successful order creation
    await cartDba.clearCart(userId);

    return order;
  } catch (error) {
    throw new Error(`Error creating order: ${error.message}`);
  }
};

const completeOrder = async (orderId) => {
  try {
    const order = await orderDba.updateOrderStatus(orderId, "completed");
    // console.log("orders::",JSON.stringify(order,2,null));
    
    // await sendOrderConfirmationEmail(order); // Send confirmation email asynchronously awaiting
    //fire and forget email sending to avoid delaying response to client
      sendOrderConfirmationEmail(order).catch(err => {
        console.error(`Failed to send order confirmation email for order ${orderId}:`, err);
      });
    return order;
  } catch (error) {
    throw new Error(`Error completing order: ${error.message}`);
  }
};

const failOrder = async (orderId) => {
  try {
    const order = await orderDba.getOrderById(orderId);
    if (!order) {
      throw new Error("Order not found");
    }

    // Return inventory items to stock
    for (const item of order.items) {
      await inventoryDba.incrementInventory(item.id, item.qty);
    }

    const updatedOrder = await orderDba.updateOrderStatus(orderId, "failed");
    return updatedOrder;
  } catch (error) {
    throw new Error(`Error failing order: ${error.message}`);
  }
};

const getOrderStatus = async (orderId) => {
  try {
    const order = await orderDba.getOrderById(orderId);
    if (!order) {
      throw new Error("Order not found");
    }

    const id = order.order_id || order.orderId;
    const status = order.status;
    const amount = order.total_amount || order.totalAmount;

    return { id, status, amount };
  } catch (error) {
    throw new Error(`Error fetching order status: ${error.message}`);
  }
};

const getUserOrders = async (userId) => {
  try {
    const orders = await orderDba.getUserOrders(userId);
    return orders;
  } catch (error) {
    throw new Error(`Error fetching user orders: ${error.message}`);
  }
};

function formatOrderDataHTML(orderData) {
  const {
    orderId,
    customerName,
    customerEmail,
    items,
    subtotal,
    tax,
    deliveryFee,
    platformFee,
    totalAmount
  } = orderData;

  const itemsRows = items.map(item => `
    <tr>
      <td style="padding: 10px;">${item.name}</td>
      <td style="padding: 10px; text-align: center;">${item.qty}</td>
      <td style="padding: 10px;">₹${item.price}</td>
      <td style="padding: 10px; font-weight: 500;">₹${item.qty * item.price}</td>
    </tr>
  `).join('');

  return `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 700px; margin: auto; border-radius: 10px; overflow: hidden; border: 1px solid #e0e0e0; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">
      
      <!-- Header -->
      <div style="background: linear-gradient(90deg, #4CAF50, #2E7D32); color: white; padding: 20px;">
        <h2 style="margin: 0; text-align: center;">🧾 Invoice</h2>
      </div>

      <!-- Customer Info -->
      <div style="padding: 20px; background-color: #fafafa;">
        <p><strong>Order ID:</strong> ${orderId}</p>
        <p><strong>Name:</strong> ${customerName}</p>
        <p><strong>Email:</strong> ${customerEmail}</p>
      </div>

      <!-- Table -->
      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr style="background-color: #e8f5e9; color: #2e7d32;">
            <th style="padding: 12px; text-align: left;">Item</th>
            <th style="padding: 12px; text-align: center;">Qty</th>
            <th style="padding: 12px; text-align: left;">Price</th>
            <th style="padding: 12px; text-align: left;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemsRows}
        </tbody>
      </table>

      <!-- Summary -->
      <div style="padding: 20px;">
        <div style="text-align: right; line-height: 1.8;">
          <p>Subtotal: ₹${subtotal}</p>
          <p>Tax: ₹${tax}</p>
          <p>Delivery Fee: ₹${deliveryFee}</p>
          <p>Platform Fee: ₹${platformFee}</p>
          <hr style="border: none; border-top: 1px dashed #ccc; margin: 10px 0;" />
          <h3 style="color: #2E7D32;">Total: ₹${totalAmount}</h3>
        </div>
      </div>

      <!-- Footer -->
      <div style="background-color: #f1f8e9; padding: 15px; text-align: center; font-size: 12px; color: #666;">
        Thank you for your order 💚
      </div>

    </div>
  `;
}

async function sendOrderConfirmationEmail (orderData) {
  const htmlContent = formatOrderDataHTML(orderData);
  const mailOptions = {
    from: { name: "The Pizza store", address: process.env.GMAIL_USER },
    to: orderData.customerEmail,
    subject: `The Pizza store - Order Confirmation - ${orderData.orderId}`,
    html: htmlContent,
  };
  if (orderData?.customerEmail) {
    await emailService.sendEmail(mailOptions);
  }
};



module.exports = {
  createOrderFromCart,
  completeOrder,
  failOrder,
  getOrderStatus,
  getUserOrders,
  // Keep legacy functions for backward compatibility
  fetchOrderStatus: getOrderStatus,
};