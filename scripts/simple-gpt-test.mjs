import fs from 'fs/promises';
import OpenAI from 'openai';
import { put } from '@vercel/blob';

const token = process.env.GITHUB_TOKEN;
const endpoint = 'https://models.github.ai/inference';
const model = 'openai/gpt-4.1';

const bytes = await fs.readFile(new URL('../public/LargeReceipt.jpg', import.meta.url));

const client = new OpenAI({ baseURL: endpoint, apiKey: token });

// Upload the image to Vercel Blob and use the URL with the OpenAI API
const blob = await put('tests/LargeReceipt.jpg', bytes, { access: 'public' });

const res = await client.responses.create({
  model,
  input: [
    {
      role: 'user',
      content: [
        { type: 'input_text', text: 'Extract items' },
        { type: 'input_image', image_url: blob.url }
      ]
    }
  ],
  response_format: { type: 'json_object' },
  temperature: 0
});

console.log(res.output_text);
