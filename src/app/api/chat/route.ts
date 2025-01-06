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
  console.log('API route called');
  try {
    const { messages } = await req.json();
    console.log('Received messages:', JSON.stringify(messages, null, 2));
    
    // Input validation
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      console.log('Invalid messages format');
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

    console.log('Sending prompt to Bedrock:', JSON.stringify(prompt, null, 2));

    try {
      const modelId = "anthropic.claude-3-5-sonnet-20240620-v1:0";
      
      const command = new InvokeModelCommand({
        modelId,
        contentType: "application/json",
        accept: "application/json",
        body: JSON.stringify(prompt)
      });

      console.log('Sending command to Bedrock');
      const response = await bedrock.send(command);
      console.log('Received response from Bedrock');

      if (!response.body) {
        console.log('Empty response body from Bedrock');
        throw new Error('Empty response from Bedrock');
      }

      const responseText = new TextDecoder().decode(response.body);
      console.log('Decoded response:', responseText);

      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch (parseError) {
        console.error('Failed to parse response:', responseText);
        throw new Error('Failed to parse Bedrock response');
      }

      if (!responseData.content?.[0]?.text) {
        console.log('Malformed response structure:', responseData);
        throw new Error('Malformed response structure');
      }

      console.log('Sending successful response');
      return NextResponse.json({ response: responseData.content[0].text });
    } catch (bedrockError: unknown) {
      const error = bedrockError as BedrockError;
      console.error('Bedrock API error:', {
        name: error.name,
        message: error.message,
        code: error.Code,
        requestId: error.$metadata?.requestId,
        httpStatusCode: error.$metadata?.httpStatusCode,
        stack: error.stack
      });

      // Check AWS credentials
      if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
        console.error('AWS credentials missing');
        return NextResponse.json(
          { error: 'AWS credentials not configured' },
          { status: 500 }
        );
      }

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
    console.error('General error:', {
      message: e.message,
      stack: e.stack
    });
    return NextResponse.json(
      { error: 'Failed to process request. Please try again.' },
      { status: 500 }
    );
  }
}
