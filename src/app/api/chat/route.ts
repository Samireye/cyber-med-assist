import { NextResponse } from "next/server";
import Anthropic from '@anthropic-ai/sdk';

if (!process.env.ANTHROPIC_API_KEY) {
  throw new Error('ANTHROPIC_API_KEY is not set in environment variables');
}

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const systemPrompt = `You are an AI assistant specializing in medical billing and coding. You have expertise in 
insurance policies, patient procedures, and practice management. You help medical office staff with their questions and 
provide accurate, up-to-date information. Always be professional, clear, and precise in your responses.`;

// Function to get the most relevant messages for context
function getRelevantMessages(messages: Array<{ role: string; content: string }>) {
  // Always include system message and last 4 messages for context
  const MAX_MESSAGES = 4;
  const relevantMessages = [];

  // Add the most recent messages
  const recentMessages = messages.slice(-MAX_MESSAGES);
  relevantMessages.push(...recentMessages);

  return relevantMessages;
}

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

    // Get relevant messages for context
    const relevantMessages = getRelevantMessages(messages);
    console.log('Using messages for context:', relevantMessages);

    // Convert messages to Anthropic format with proper type casting
    const messageList = relevantMessages.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.content
    })) as { role: 'user' | 'assistant'; content: string }[];

    try {
      const response = await anthropic.messages.create({
        model: 'claude-3-sonnet-20240229',
        max_tokens: 1024,
        temperature: 0.7,
        system: systemPrompt,
        messages: messageList,
      });

      console.log('Received response from Anthropic:', {
        id: response.id,
        model: response.model,
        role: response.role,
      });

      // Get the response content, handling different content block types
      let content = '';
      if (response.content[0].type === 'text') {
        content = response.content[0].text;
      } else {
        console.warn('Unexpected content type:', response.content[0].type);
        content = 'I apologize, but I received an unexpected response format. Please try again.';
      }

      return NextResponse.json({ content });
    } catch (error: unknown) {
      console.error('Anthropic API error:', {
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
