const mongoose = require("mongoose");

const cartItemSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    qty: { type: Number, required: true },
    tags: { type: [String], default: [] },
  },
  { _id: false }
);

const cartSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, unique: true },
    items: { type: [cartItemSchema], default: [] },
    totalAmount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

 module.exports =
  mongoose.models.Cart ||
  mongoose.model("Cart", cartSchema);
