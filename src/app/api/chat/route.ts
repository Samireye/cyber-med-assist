import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import { NextResponse } from "next/server";

const client = new BedrockRuntimeClient({
  region: process.env.AWS_REGION || 'us-east-1',
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

    // Ensure AWS credentials are set
    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
      console.error('AWS credentials not configured');
      return NextResponse.json(
        { error: "AWS credentials not configured" },
        { status: 500 }
      );
    }

    const prompt = {
      anthropic_version: "bedrock-2023-05-31",
      max_tokens: 512,
      messages: messages.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content
      })),
      system: systemPrompt,
      temperature: 0.7,
      top_p: 0.9
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

      if (!response.body) {
        throw new Error('Empty response from Bedrock');
      }

      const decoder = new TextDecoder();
      const responseText = decoder.decode(response.body);

      console.log('Response text:', responseText);

      let responseData;
      try {
        responseData = JSON.parse(responseText);
        console.log('Parsed response data:', responseData);
      } catch (error) {
        console.error('Failed to parse response:', responseText);
        throw new Error('Failed to parse Bedrock response');
      }

      // Handle different response formats
      const content = responseData.completion || responseData.content || responseData.message?.content;
      
      if (!content) {
        console.error('Invalid response format:', responseData);
        throw new Error('Invalid response format from Bedrock');
      }

      return NextResponse.json({ content });
    } catch (error) {
      console.error('Error calling Bedrock:', error);
      return NextResponse.json(
        { error: "Failed to get response from AI model" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in API route:', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
