import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

export const splitText = async (text: string) => {
    const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1000,
        chunkOverlap: 200
    })
    const docs = await splitter.createDocuments([text])
    return docs.map((doc: any) => doc.pageContent)
}

