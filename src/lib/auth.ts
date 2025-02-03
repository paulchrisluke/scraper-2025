import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { apiKeySchema, cronSecretSchema } from './schemas';

export async function validateApiKey(requiredKey: 'RSS_API_KEY' | 'GENERATE_API_KEY') {
  const headersList = headers();
  const apiKey = headersList.get('x-api-key');

  if (!apiKey) {
    return new NextResponse('API key is required', { status: 401 });
  }

  try {
    const { key } = apiKeySchema.parse({ key: apiKey });
    
    if (key !== process.env[requiredKey]) {
      return new NextResponse('Invalid API key', { status: 401 });
    }
    
    return null; // Authentication successful
  } catch (error) {
    return new NextResponse('Invalid API key format', { status: 401 });
  }
}

export async function validateCronSecret() {
  const headersList = headers();
  const cronSecret = headersList.get('x-cron-secret');

  if (!cronSecret) {
    return new NextResponse('Cron secret is required', { status: 401 });
  }

  try {
    const { secret } = cronSecretSchema.parse({ secret: cronSecret });
    
    if (secret !== process.env.CRON_SECRET) {
      return new NextResponse('Invalid cron secret', { status: 401 });
    }
    
    return null; // Authentication successful
  } catch (error) {
    return new NextResponse('Invalid cron secret format', { status: 401 });
  }
} 