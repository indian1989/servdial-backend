import mongoose from "mongoose";

const citySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true },
  state: { type: String, required: true, trim: true },
});

export default mongoose.model("City", citySchema);