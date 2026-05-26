import { Response } from "express";
import fs from "fs";
import mongoose from "mongoose";
import Pdf from "../models/Pdf";
import pdfChunk from "../models/pdfChunk";
import Message from "../models/Message";
import { AuthRequest } from "../middleware/auth.middleware";
import { extractPdfText } from "../services/pdf.service";
import { splitText } from "../utils/chunk";
import { generateEmbedding } from "../services/embedding.service";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { SYSTEM_RULES } from "../config/rules";

export const uploadPdf = async (
    req: AuthRequest,
    res: Response
) => {
    try {
        const file = req.file

        if (!file) {
            return res.status(400).json({
                message: "No file Uploaded"
            })
        }

        const pdf = await Pdf.create({
            userId: req.user.id,
            fileName: file.originalname,
            filePath: file.path
        })

        const text = await extractPdfText(file.path)

        if (!text || text.trim().length === 0) {
            await Pdf.deleteOne({ _id: pdf.id })
            try {
                if (fs.existsSync(file.path)) {
                    fs.unlinkSync(file.path)
                }
            } catch (unlinkErr) {
                console.warn("Could not delete physical file:", unlinkErr)
            }
            return res.status(400).json({
                message: "No readable text content found in this PDF. It might be scanned or image-only."
            })
        }

        const chunks = await splitText(text)

        for (const chunk of chunks) {
            const embedding = await generateEmbedding(chunk)

            await pdfChunk.create({
                pdfId: pdf.id,
                userId: req.user.id,
                text: chunk,
                embedding
            })
        }

        res.json({
            message: "PDF uploaded successfully",
            pdfId: pdf.id
        })
    } catch (error) {
        console.log(error)

        res.status(500).json({
            message: "Upload failed"
        })
    }
}

export const getPdfs = async (req: AuthRequest, res: Response) => {
    try {
        const pdfs = await Pdf.find({ userId: req.user.id })
        res.json(pdfs)
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch PDFs" })
    }
}

export const queryPdf = async (req: AuthRequest, res: Response) => {
    try {
        const { pdfId, question } = req.body
        if (!pdfId || !question) {
            return res.status(400).json({ message: "PDF ID and question are required" })
        }

        const questionEmbedding = await generateEmbedding(question)
        const chunks = await pdfChunk.find({ pdfId: new mongoose.Types.ObjectId(pdfId) })

        if (chunks.length === 0) {
            return res.status(404).json({ message: "No content found for this PDF" })
        }

        const scoredChunks = chunks.map(chunk => {
            let similarity = 0
            if (chunk.embedding && chunk.embedding.length === questionEmbedding.length) {
                for (let i = 0; i < chunk.embedding.length; i++) {
                    similarity += chunk.embedding[i] * questionEmbedding[i]
                }
            }
            return { text: chunk.text, similarity }
        })

        scoredChunks.sort((a, b) => b.similarity - a.similarity)
        const context = scoredChunks.slice(0, 6).map(c => c.text).join("\n\n")

        // Retrieve last 10 messages for conversation memory (ChatGPT conversational style)
        const previousMessages = await Message.find({
            pdfId: new mongoose.Types.ObjectId(pdfId),
            userId: req.user.id
        }).sort({ createdAt: -1 }).limit(10)

        // Reverse to maintain chronological order for Gemini history
        previousMessages.reverse()

        // Format history according to Gemini Content interface specifications
        const history = previousMessages.map(msg => ({
            role: msg.sender === "user" ? ("user" as const) : ("model" as const),
            parts: [{ text: msg.text }]
        }))

        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash", systemInstruction: SYSTEM_RULES })
        
        // Start conversation session with history
        const chat = model.startChat({ history })
        
        const prompt = `DOCUMENT CONTEXT:\n${context}\n\nUSER QUESTION:\n${question}`
        const response = await chat.sendMessage(prompt)
        const answerText = response.response.text()

        await Message.create({
            pdfId: new mongoose.Types.ObjectId(pdfId),
            userId: req.user.id,
            sender: "user",
            text: question
        })

        await Message.create({
            pdfId: new mongoose.Types.ObjectId(pdfId),
            userId: req.user.id,
            sender: "bot",
            text: answerText
        })

        res.json({
            answer: answerText
        })
    } catch (error) {
        console.log(error)
        res.status(500).json({ message: "Query failed" })
    }
}

export const getMessages = async (req: AuthRequest, res: Response) => {
    try {
        const { pdfId } = req.params
        const messages = await Message.find({
            pdfId: new mongoose.Types.ObjectId(pdfId as string),
            userId: req.user.id
        }).sort({ createdAt: 1 })
        res.json(messages)
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch chat logs" })
    }
}

export const deletePdf = async (req: AuthRequest, res: Response) => {
    try {
        const { pdfId } = req.params
        const pdf = await Pdf.findOne({ _id: new mongoose.Types.ObjectId(pdfId as string), userId: req.user.id })
        if (!pdf) {
            return res.status(404).json({ message: "PDF not found" })
        }
        if (pdf.filePath) {
            try {
                if (fs.existsSync(pdf.filePath)) {
                    fs.unlinkSync(pdf.filePath)
                }
            } catch (unlinkErr) {
                console.warn("Could not delete physical file:", unlinkErr)
            }
        }
        await pdfChunk.deleteMany({ pdfId: pdf._id })
        await Message.deleteMany({ pdfId: pdf._id })
        await Pdf.deleteOne({ _id: pdf._id })
        res.json({ message: "PDF deleted successfully" })
    } catch (error) {
        console.log(error)
        res.status(500).json({ message: "Failed to delete PDF" })
    }
}