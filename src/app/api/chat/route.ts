import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import { NextResponse } from "next/server";

const client = new BedrockRuntimeClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

const systemPrompt = `You are an AI assistant specializing in medical billing and coding. You have expertise in 
insurance policies, patient procedures, and practice management. You help medical office staff with their questions and 
provide accurate, up-to-date information. Always be professional, clear, and precise in your responses.`;

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();
    console.log('Received messages:', messages);

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "Invalid messages format" },
        { status: 400 }
      );
    }

    // Format conversation history
    const conversation = messages
      .map(msg => {
        if (msg.role === 'user') return `Human: ${msg.content}`;
        if (msg.role === 'assistant') return `Assistant: ${msg.content}`;
        return '';
      })
      .filter(Boolean)
      .join('\n\n');

    const prompt = {
      prompt: `\n\nHuman: ${systemPrompt}\n\n${conversation}\n\nAssistant:`,
      max_tokens: 512,
      temperature: 0.7,
      top_p: 0.9,
      stop_sequences: ["\n\nHuman:"],
    };

    console.log('Sending prompt to Bedrock:', JSON.stringify(prompt, null, 2));

    const command = new InvokeModelCommand({
      modelId: "anthropic.claude-v2",
      contentType: "application/json",
      accept: "application/json",
      body: JSON.stringify(prompt),
    });

    const response = await client.send(command);
    const responseText = new TextDecoder().decode(response.body);
    console.log('Raw response:', responseText);

    const responseData = JSON.parse(responseText);
    
    if (!responseData.completion) {
      console.error('Invalid response format:', responseData);
      throw new Error('Invalid response format from Bedrock');
    }

    return NextResponse.json({ content: responseData.completion.trim() });
  } catch (error) {
    console.error('Error in chat API:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}
