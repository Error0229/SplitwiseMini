"use server"

import { put } from '@vercel/blob';
import { SharedReceipt } from '../../types';



export async function publishReceipt(data: SharedReceipt): Promise<string> {
    try {
        const blob = await put(`receipts/${data.id}.json`, JSON.stringify(data), {
            access: 'public',
            addRandomSuffix: false,
        });

        return blob.url;
    } catch (error) {
        console.error('Error publishing receipt:', error);
        throw new Error('Failed to publish receipt');
    }
}
