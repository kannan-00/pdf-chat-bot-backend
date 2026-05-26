import mongoose from "mongoose"
const ObjectType = mongoose.Schema.Types.ObjectId
const pdfChunkSchema = new mongoose.Schema({
    pdfId: {
        type: ObjectType,
        ref: "Pdf"
    },
    userId: {
        type: ObjectType,
        ref: "User"
    },
    text: String,
    embedding: [Number],
}, {
    timestamps: true
})

export default mongoose.model("PdfChunk", pdfChunkSchema)