import express from "express"

import cors from "cors"
import helmet from "helmet"
import morgan from "morgan"
import compression from "compression"
import { mongoSanitize } from "./middleware/sanitize.middleware"
import hpp from "hpp"
import rateLimit from "express-rate-limit"

import authRoutes from "./routes/auth.routes"
import pdfRoutes from "./routes/pdf.routes"



const app = express()
app.use(helmet())

if (process.env.NODE_ENV === "development") {
    app.use(morgan("dev"))
}


const limiter = rateLimit({
    max: 100,
    windowMs: 60 * 1000,
    message: "Too many requests from this IP, please try again in a minute!"
})
app.use("/api", limiter)
app.use(express.json({ limit: "10kb" }))
app.use(express.urlencoded({ extended: true, limit: "10kb" }))
app.use(mongoSanitize)
app.use(hpp())
app.use(cors())

app.use(compression())
app.use("/uploads", express.static("uploads"))

app.use("/api/auth", authRoutes)
app.use("/api/pdf", pdfRoutes)


app.get("/health", (req, res) => {
    res.status(200).json({ status: "success", message: "Server is healthy" })
})

// Handle undefined routes
app.use((req, res, next) => {
    res.status(404).json({
        status: "fail",
        message: `Can't find ${req.originalUrl} on this server!`
    })
})

export default app