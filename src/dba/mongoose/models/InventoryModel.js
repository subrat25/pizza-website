const mongoose = require("mongoose");

const inventorySchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    tags: { type: [String], default: [] },
    availableQty: { type: Number, required: true, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.models.inventory|| mongoose.model("inventory", inventorySchema);