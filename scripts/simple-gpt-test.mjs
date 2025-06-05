import fs from 'fs/promises';
import OpenAI from 'openai';

const token = process.env.GITHUB_TOKEN;
const endpoint = 'https://models.github.ai/inference';
const model = 'openai/gpt-4.1';

const bytes = await fs.readFile(new URL('../public/LargeReceipt.jpg', import.meta.url));

const client = new OpenAI({ baseURL: endpoint, apiKey: token });

// Upload file for vision API
const file = await client.files.create({
  file: await OpenAI.toFile(bytes, 'LargeReceipt.jpg', { type: 'image/jpeg' }),
  purpose: 'vision'
});

const res = await client.responses.create({
  model,
  input: [
    {
      role: 'user',
      content: [
        { type: 'input_text', text: 'Extract items' },
        { type: 'input_image', file_id: file.id }
      ]
    }
  ],
  response_format: { type: 'json_object' },
  temperature: 0
});

console.log(res.output_text);
