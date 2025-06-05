import fs from 'fs/promises';
import { OpenAI } from 'openai';
import { put } from '@vercel/blob';
import 'dotenv/config';

const token = process.env.GITHUB_TOKEN;
const endpoint = 'https://models.github.ai/inference';
const model = 'openai/gpt-4o';

const bytes = await fs.readFile(new URL('../public/LargeReceipt.jpg', import.meta.url));

const client = new OpenAI({ baseURL: endpoint, apiKey: token });

// Upload the image to Vercel Blob and use the URL with the OpenAI API
const blob = await put('tests/LargeReceipt.jpg', bytes, { access: 'public', allowOverwrite: true });

// const imageUrl = new ChatCompletionContentPartImage();
// imageUrl.image_url = blob.url;
const res = await client.chat.completions.create({
  messages: [
    {
      role: 'system',
      content: [
        { type: 'text', text: ' You are a multilingual receipt scanning AI. Convert the provided receipt image into a structured JSON format. Ensure the output includes all relevant fields such as date, total amount, currency, items, and any applicable taxes. Extract text accurately and preserve any available formatting details.' },
      ],
    },
    {
      role: 'user',
      content: [
        { type: 'text', text: 'Please analyze the receipt and provide a structured JSON output with all relevant details. If the product name seems not complete, please fill up the possible product name based on the price' },
        { type: 'image_url', image_url: { url: blob.url } }]
    }
  ]
  ,
  response_format: {
    type: 'json_schema',
    json_schema: {
      "name": "MultilingualReceipt",
      "description": "A schema for extracting structured, multilingual receipt data from OCR.",
      "schema": {
        "type": "object",
        "properties": {
          "merchant": {
            "type": "object",
            "properties": {
              "name": { "type": "string", "description": "Merchant's name as printed on the receipt" },
              "address": { "type": "string", "description": "Merchant's address" },
              "phone": { "type": "string", "description": "Merchant's contact number" },
              "tax_id": { "type": "string", "description": "Merchant's tax identification number" }
            },
            "required": ["name"]
          },
          "receipt": {
            "type": "object",
            "properties": {
              "number": { "type": "string", "description": "Receipt number or identifier" },
              "date": { "type": "string", "format": "date", "description": "Date of the transaction" },
              "time": { "type": "string", "description": "Time of the transaction" },
              "currency": { "type": "string", "description": "Currency code (e.g., USD, EUR, TWD)" },
              "language": { "type": "string", "description": "Language code of the receipt (e.g., en, zh, ja)" }
            },
            "required": ["date", "currency"]
          },
          "items": {
            "type": "array",
            "description": "List of items purchased",
            "items": {
              "type": "object",
              "properties": {
                "description": { "type": "string", "description": "Item description" },
                "quantity": { "type": "number", "description": "Quantity purchased" },
                "unit_price": { "type": "number", "description": "Price per unit" },
                "total_price": { "type": "number", "description": "Total price for the item" }
              },
              "required": ["description", "total_price"]
            }
          },
          "totals": {
            "type": "object",
            "properties": {
              "subtotal": { "type": "number", "description": "Subtotal before taxes and discounts" },
              "tax": { "type": "number", "description": "Total tax amount" },
              "discount": { "type": "number", "description": "Total discount amount" },
              "total": { "type": "number", "description": "Final total amount to be paid" }
            },
            "required": ["total"]
          },
          "payment": {
            "type": "object",
            "properties": {
              "method": { "type": "string", "description": "Payment method used (e.g., cash, credit card)" },
              "card_last4": { "type": "string", "description": "Last four digits of the card used, if applicable" }
            },
            "required": ["method"]
          }
        },
        "required": ["merchant", "receipt", "items", "totals", "payment"]
      }
    }
  },
  temperature: 0,
  model: model
});

console.log(res.choices[0].message.content);
