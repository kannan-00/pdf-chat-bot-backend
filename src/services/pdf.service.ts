import fs from "fs";
import pdfParse from "pdf-parse";

export const extractPdfText = async (path: string) => {
    const dataBuffer = fs.readFileSync(path);

    const pdfData = await pdfParse(dataBuffer);

    return pdfData.text;
};