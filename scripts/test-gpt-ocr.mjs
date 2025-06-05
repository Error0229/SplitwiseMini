import fs from 'fs/promises';
import { processReceiptWithGPT } from '../app/actions/ocr.js';

const path = new URL('../public/LargeReceipt.jpg', import.meta.url).pathname;
const fileData = await fs.readFile(path);
const file = new File([fileData], 'LargeReceipt.jpg', { type: 'image/jpeg' });
const form = new FormData();
form.append('receipt', file);
const result = await processReceiptWithGPT(form);
console.log(JSON.stringify(result, null, 2));
