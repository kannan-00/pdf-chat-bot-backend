import mongoose from "mongoose"

const ObjectType = mongoose.Schema.Types.ObjectId

const messageSchema = new mongoose.Schema({
  pdfId: {
    type: ObjectType,
    ref: "pdf",
    required: true
  },
  userId: {
    type: ObjectType,
    ref: "User",
    required: true
  },
  sender: {
    type: String,
    enum: ["user", "bot"],
    required: true
  },
  text: {
    type: String,
    required: true
  }
}, {
  timestamps: true
})

export default mongoose.model("Message", messageSchema)
