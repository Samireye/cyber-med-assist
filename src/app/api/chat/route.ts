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
    const body = await req.json();
    console.log('Request body:', body);

    const { messages } = body;
    console.log('Messages:', messages);

    if (!Array.isArray(messages)) {
      console.error('Messages is not an array:', messages);
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
          } else if (message.role === "assistant") {
            return `Assistant: ${message.content}`;
          }
          return '';
        })
        .filter(Boolean)
        .join("\n\n")}\n\nAssistant:`,
      max_tokens: 512,
      temperature: 0.7,
      top_p: 0.9,
      stop_sequences: ["\n\nHuman:"],
    };

    console.log('Sending request to Bedrock with prompt:', JSON.stringify(prompt, null, 2));

    const command = new InvokeModelCommand({
      modelId: "anthropic.claude-v2",
      contentType: "application/json",
      accept: "application/json",
      body: JSON.stringify(prompt),
    });

    try {
      console.log('Sending request to Bedrock...');
      const response = await client.send(command);
      console.log('Received response from Bedrock');

      const decoder = new TextDecoder();
      const responseText = decoder.decode(response.body);
      console.log('Raw response text:', responseText);

      let responseData;
      try {
        responseData = JSON.parse(responseText);
        console.log('Parsed response data:', responseData);
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
      if (error instanceof Error) {
        console.error('Error details:', error.message);
        console.error('Error stack:', error.stack);
      }
      return NextResponse.json(
        { error: "Failed to get response from AI model" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in API route:');
    if (error instanceof Error) {
      console.error('Error details:', error.message);
      console.error('Error stack:', error.stack);
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
