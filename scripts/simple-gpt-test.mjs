import fs from 'fs/promises';
import OpenAI from 'openai';

const token = process.env.GITHUB_TOKEN;
const endpoint = 'https://models.github.ai/inference';
const model = 'openai/gpt-4.1';

const bytes = await fs.readFile(new URL('../public/LargeReceipt.jpg', import.meta.url));
const imageUrl = `data:image/jpeg;base64,${bytes.toString('base64')}`;

const client = new OpenAI({ baseURL: endpoint, apiKey: token });
const messages = [
  { role: 'system', content: 'You are a helpful assistant that extracts items from receipts as JSON.' },
  { role: 'user', content: [ { type: 'text', text: 'Extract items' }, { type: 'image_url', image_url: imageUrl } ] }
];

const res = await client.chat.completions.create({ model, messages, response_format: { type: 'json_object' }, temperature: 0 });
console.log(res.choices[0].message.content);
