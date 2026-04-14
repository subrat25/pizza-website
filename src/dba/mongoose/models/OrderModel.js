const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    qty: { type: Number, required: true },
    tags: { type: [String], default: [] },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderId: { type: String, required: true, unique: true },
    userId: { type: String, required: true },
    items: { type: [orderItemSchema], required: true },
    subtotal: { type: Number, required: true },
    tax: { type: Number, required: true },
    platformFee: { type: Number, required: true },
    deliveryFee: { type: Number, required: true },
    totalAmount: { type: Number, required: true },
    status: { type: String, enum: ["pending", "completed", "failed"], default: "pending" },
    paymentIntent: { type: String },
    customerEmail: { type: String },
    customerName: { type: String },
    shippingAddress: { type: Object },
  },
  { timestamps: true }
);

module.exports = mongoose.models.order||mongoose.model("order", orderSchema);