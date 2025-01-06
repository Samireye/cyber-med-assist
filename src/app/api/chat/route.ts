import { NextResponse } from "next/server";
import crypto from 'crypto';

// AWS Signature V4 signing
function getSignatureKey(key: string, dateStamp: string, regionName: string, serviceName: string) {
  const kDate = crypto.createHmac('sha256', 'AWS4' + key).update(dateStamp).digest();
  const kRegion = crypto.createHmac('sha256', kDate).update(regionName).digest();
  const kService = crypto.createHmac('sha256', kRegion).update(serviceName).digest();
  const kSigning = crypto.createHmac('sha256', kService).update('aws4_request').digest();
  return kSigning;
}

export async function POST(req: Request) {
  try {
    console.log('API route called');
    const { messages } = await req.json();
    console.log('Received messages:', messages);

    // AWS request details
    const region = process.env.AWS_REGION || 'us-east-1';
    const accessKey = process.env.AWS_ACCESS_KEY_ID || '';
    const secretKey = process.env.AWS_SECRET_ACCESS_KEY || '';
    
    if (!accessKey || !secretKey) {
      throw new Error('AWS credentials not found');
    }

    const service = 'bedrock';  
    const host = `bedrock-runtime.${region}.amazonaws.com`;
    const endpoint = `https://${host}/model/anthropic.claude-v2/invoke`;
    
    // Request parameters
    const method = 'POST';
    const algorithm = 'AWS4-HMAC-SHA256';
    const currentDate = new Date();
    const amzdate = currentDate.toISOString().replace(/[:-]|\.\d{3}/g, '');
    const dateStamp = amzdate.slice(0, 8);

    // Simple test prompt
    const requestBody = JSON.stringify({
      prompt: "\n\nHuman: Say hello\n\nAssistant:",
      max_tokens: 50,
      temperature: 0.7,
      top_p: 0.9,
      stop_sequences: ["\n\nHuman:"],
    });

    // Create canonical request
    const contentHash = crypto.createHash('sha256').update(requestBody).digest('hex');
    
    const canonicalHeaders = [
      `host:${host}`,
      `x-amz-content-sha256:${contentHash}`,
      `x-amz-date:${amzdate}`,
    ].join('\n') + '\n';

    const signedHeaders = 'host;x-amz-content-sha256;x-amz-date';

    const canonicalRequest = [
      method,
      '/model/anthropic.claude-v2/invoke',
      '',
      canonicalHeaders,
      signedHeaders,
      contentHash,
    ].join('\n');

    // Create string to sign
    const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
    const stringToSign = [
      algorithm,
      amzdate,
      credentialScope,
      crypto.createHash('sha256').update(canonicalRequest).digest('hex'),
    ].join('\n');

    // Calculate signature
    const signingKey = getSignatureKey(secretKey, dateStamp, region, service);
    const signature = crypto
      .createHmac('sha256', signingKey)
      .update(stringToSign)
      .digest('hex');

    // Create authorization header
    const authorizationHeader = [
      `${algorithm} Credential=${accessKey}/${credentialScope}`,
      `SignedHeaders=${signedHeaders}`,
      `Signature=${signature}`,
    ].join(', ');

    console.log('Making request to Bedrock');
    const response = await fetch(endpoint, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-Amz-Date': amzdate,
        'X-Amz-Content-Sha256': contentHash,
        'Authorization': authorizationHeader,
      },
      body: requestBody,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Bedrock error response:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText
      });
      throw new Error(`Bedrock API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const responseData = await response.json();
    console.log('Response data:', responseData);

    if (!responseData.completion) {
      console.error('Invalid response format:', responseData);
      throw new Error('Invalid response format from Bedrock');
    }

    return NextResponse.json({ content: responseData.completion.trim() });
  } catch (error) {
    console.error('Error in chat API:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
