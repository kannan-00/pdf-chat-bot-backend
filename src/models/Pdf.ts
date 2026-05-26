import mongoose from "mongoose"

const pdfSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        required: true,
    },
    fileName: String,
    filePath: String,
}, {
    timestamps: true
})

export default mongoose.model("pdf", pdfSchema)