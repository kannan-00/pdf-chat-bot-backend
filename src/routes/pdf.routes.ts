import express from "express"
import { upload } from "../middleware/upload.middleware"
import { protect } from "../middleware/auth.middleware"
import { uploadPdf, getPdfs, queryPdf, getMessages, deletePdf } from "../controllers/pdf.controller"

const router = express.Router()

router.post(
    "/upload",
    protect,
    upload.single("pdf"),
    uploadPdf
)

router.get("/", protect, getPdfs)
router.post("/query", protect, queryPdf)
router.get("/:pdfId/messages", protect, getMessages)
router.delete("/:pdfId", protect, deletePdf)

export default router