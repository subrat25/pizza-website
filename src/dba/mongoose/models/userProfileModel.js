const mongoose = require("mongoose");

const addressSchema = new mongoose.Schema(
  {
    line1: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    pin: { type: String, required: true },
  },
  { _id: false }
);

const userProfileSchema = new mongoose.Schema(
  {
    userName: { type: String, required: true },
    userEmail: { type: String, required: true, unique: true },
    password: { type: String, required: true }, // encrypted password
    address: { type: [addressSchema], default: [] },
  },
  { timestamps: true }
);

module.exports = mongoose.models.user_profile||mongoose.model("user_profile", userProfileSchema);