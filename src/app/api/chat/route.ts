import { BedrockRuntimeClient, InvokeModelCommand, NodeHttpHandler } from "@aws-sdk/client-bedrock-runtime";
import { NextResponse } from "next/server";

// Log AWS configuration (but not credentials)
console.log('AWS Region:', process.env.AWS_REGION || 'us-east-1');
console.log('Has AWS Access Key:', !!process.env.AWS_ACCESS_KEY_ID);
console.log('Has AWS Secret Key:', !!process.env.AWS_SECRET_ACCESS_KEY);

const client = new BedrockRuntimeClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
  requestHandler: new NodeHttpHandler({
    connectionTimeout: 60000, // 1 minute
    socketTimeout: 60000,
  }),
});

const systemPrompt = `You are an AI assistant specializing in medical billing and coding. You have expertise in 
insurance policies, patient procedures, and practice management. You help medical office staff with their questions and 
provide accurate, up-to-date information. Always be professional, clear, and precise in your responses.`;

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();
    console.log('Received messages:', messages);

    if (!Array.isArray(messages)) {
      return NextResponse.json(
        { error: "Messages must be an array" },
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
      anthropic_version: "bedrock-2023-05-31",
      max_tokens_to_sample: 512,
      temperature: 0.7,
      top_p: 0.9,
      stop_sequences: ["\n\nHuman:"],
      prompt: `\n\nHuman: ${systemPrompt}\n\nAssistant: Let me help you with medical billing, coding, and practice management.\n\n${conversation}\n\nAssistant:`
    };

    console.log('Sending request to Bedrock with prompt:', JSON.stringify(prompt, null, 2));

    try {
      const command = new InvokeModelCommand({
        modelId: "anthropic.claude-v2:1",
        contentType: "application/json",
        accept: "application/json",
        body: JSON.stringify(prompt),
      });

      console.log('Sending command to Bedrock:', JSON.stringify({
        modelId: command.input.modelId,
        contentType: command.input.contentType,
        accept: command.input.accept,
      }));

      const response = await client.send(command);
      console.log('Received response from Bedrock:', {
        statusCode: response.$metadata?.httpStatusCode,
        requestId: response.$metadata?.requestId
      });

      const responseText = new TextDecoder().decode(response.body);
      console.log('Response text:', responseText);

      const responseData = JSON.parse(responseText);
      console.log('Parsed response:', responseData);

      if (!responseData.completion) {
        console.error('Invalid response format:', responseData);
        throw new Error('No completion in response');
      }

      return NextResponse.json({ content: responseData.completion.trim() });
    } catch (error: unknown) {
      console.error('Bedrock error details:', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      throw error;
    }
  } catch (error: unknown) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
