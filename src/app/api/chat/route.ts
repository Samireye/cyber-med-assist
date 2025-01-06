import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();
    console.log('Received messages:', messages);

    // Create the client inside the function to ensure fresh credentials
    const client = new BedrockRuntimeClient({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
      },
    });

    // Simple test prompt
    const prompt = {
      prompt: "\n\nHuman: Say hello\n\nAssistant:",
      max_tokens: 50,
      temperature: 0.7,
      top_p: 0.9,
      stop_sequences: ["\n\nHuman:"],
    };

    console.log('AWS Region:', process.env.AWS_REGION);
    console.log('Access Key ID length:', process.env.AWS_ACCESS_KEY_ID?.length);
    console.log('Secret Key length:', process.env.AWS_SECRET_ACCESS_KEY?.length);
    console.log('Sending test prompt to Bedrock');

    const command = new InvokeModelCommand({
      modelId: "anthropic.claude-v2",
      contentType: "application/json",
      accept: "application/json",
      body: JSON.stringify(prompt),
    });

    try {
      const response = await client.send(command);
      console.log('Got response from Bedrock');
      
      const responseText = new TextDecoder().decode(response.body);
      console.log('Response text:', responseText);

      const responseData = JSON.parse(responseText);
      console.log('Parsed response:', responseData);

      if (!responseData.completion) {
        throw new Error('No completion in response');
      }

      return NextResponse.json({ content: responseData.completion.trim() });
    } catch (bedrock_error) {
      console.error('Bedrock error:', bedrock_error);
      if (bedrock_error instanceof Error) {
        console.error('Bedrock error details:', {
          message: bedrock_error.message,
          name: bedrock_error.name,
          stack: bedrock_error.stack
        });
      }
      throw bedrock_error;
    }
  } catch (error) {
    console.error('API error:', error);
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        name: error.name,
        stack: error.stack
      });
    }
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}
