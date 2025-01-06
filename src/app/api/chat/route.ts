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
  console.log('API route called');
  try {
    const { messages } = await req.json();

    if (!Array.isArray(messages)) {
      return NextResponse.json(
        { error: "Messages must be an array" },
        { status: 400 }
      );
    }

    const prompt = {
      prompt: `\n\nHuman: ${systemPrompt}\n\n${messages
        .map((message) => {
          if (message.role === "user") {
            return `Human: ${message.content}`;
          } else {
            return `Assistant: ${message.content}`;
          }
        })
        .join("\n\n")}\n\nAssistant:`,
      max_tokens: 512,
      temperature: 0.7,
      top_p: 0.9,
      stop_sequences: ["\n\nHuman:"],
    };

    console.log('Sending request to Bedrock with prompt:', prompt);

    const command = new InvokeModelCommand({
      modelId: "anthropic.claude-v2",
      contentType: "application/json",
      accept: "application/json",
      body: JSON.stringify(prompt),
    });

    try {
      const response = await client.send(command);
      console.log('Received response from Bedrock');

      const decoder = new TextDecoder();
      const responseText = decoder.decode(response.body);

      console.log('Response text:', responseText);

      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch {
        console.error('Failed to parse response:', responseText);
        throw new Error('Failed to parse Bedrock response');
      }

      if (!responseData.completion) {
        console.error('Invalid response format:', responseData);
        throw new Error('Invalid response format from Bedrock');
      }

      return NextResponse.json({ content: responseData.completion });
    } catch (error) {
      console.error('Error calling Bedrock:', error);
      return NextResponse.json(
        { error: "Failed to get response from AI model" },
        { status: 500 }
      );
    }
  } catch {
    console.error('Error in API route:');
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
