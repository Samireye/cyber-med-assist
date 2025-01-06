import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { NextResponse } from 'next/server';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface BedrockError extends Error {
  $metadata?: {
    requestId?: string;
    httpStatusCode?: number;
  };
  Code?: string;
}

// Create the Bedrock client with explicit credentials
const bedrock = new BedrockRuntimeClient({
  region: 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
  }
});

const SYSTEM_PROMPT = `You are CyberMedAssist, an AI assistant specialized in medical billing, coding (ICD-10 and CPT), 
insurance policies, patient procedures, and practice management. You help medical office staff with their questions and 
provide accurate, up-to-date information. Always be professional, clear, and precise in your responses.`;

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();
    
    // Input validation
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: 'Invalid messages format. Expected non-empty array.' },
        { status: 400 }
      );
    }

    // Add system message at the start if it's not already there
    const fullMessages = messages[0]?.role === 'system' 
      ? messages 
      : [
          {
            role: 'user',
            content: `Instructions: ${SYSTEM_PROMPT}\n\nUser question: ${messages[0].content}`
          },
          ...messages.slice(1)
        ];

    const prompt = {
      anthropic_version: "bedrock-2023-05-31",
      max_tokens: 1000,
      temperature: 0.7,
      messages: fullMessages.map((msg: Message) => ({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: [
          {
            type: "text",
            text: msg.content
          }
        ]
      }))
    };

    try {
      const modelId = "anthropic.claude-3-5-sonnet-20240620-v1:0";
      
      const command = new InvokeModelCommand({
        modelId,
        contentType: "application/json",
        accept: "application/json",
        body: JSON.stringify(prompt)
      });

      const response = await bedrock.send(command);

      if (!response.body) {
        throw new Error('Empty response from Bedrock');
      }

      const responseText = new TextDecoder().decode(response.body);
      const responseData = JSON.parse(responseText);

      if (!responseData.content?.[0]?.text) {
        throw new Error('Malformed response structure');
      }

      return NextResponse.json({ response: responseData.content[0].text });
    } catch (bedrockError: unknown) {
      const error = bedrockError as BedrockError;
      console.error('Bedrock API error:', {
        name: error.name,
        message: error.message,
        code: error.Code,
        requestId: error.$metadata?.requestId,
        httpStatusCode: error.$metadata?.httpStatusCode
      });

      // Handle specific error cases
      if (error.$metadata?.httpStatusCode === 429) {
        return NextResponse.json(
          { error: 'Rate limit exceeded. Please try again in a few moments.' },
          { status: 429 }
        );
      }

      if (error.name === 'ValidationException') {
        return NextResponse.json(
          { error: 'Invalid request format. Please check your input.' },
          { status: 400 }
        );
      }

      if (error.message?.includes('token limit')) {
        return NextResponse.json(
          { error: 'Message too long. Please try a shorter message.' },
          { status: 413 }
        );
      }

      return NextResponse.json(
        { error: 'Error communicating with AI service. Please try again.' },
        { status: 500 }
      );
    }
  } catch (error: unknown) {
    const e = error as Error;
    console.error('General error:', e);
    return NextResponse.json(
      { error: 'Failed to process request. Please try again.' },
      { status: 500 }
    );
  }
}
