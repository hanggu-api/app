import { classifyText } from "./src/ai/aiConnector";

async function test() {
    console.log("Testing classifyText with 'quero cortar a barba'...");
    const result = await classifyText("quero cortar a barba");
    console.log("Result:", JSON.stringify(result, null, 2));
}

test();
