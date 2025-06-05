"use server"

import OpenAI from "openai"

interface OCRResponse {
  success: boolean
  items?: Array<{
    name: string
    price: number
  }>
  error?: string
  rawText?: string
}

export async function processReceiptOCR(formData: FormData): Promise<OCRResponse> {
  try {
    const file = formData.get("receipt") as File
    const language = (formData.get("language") as string) || "eng"

    if (!file) {
      return { success: false, error: "No file provided" }
    }

    // Convert file to base64 for OCR.space API
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const base64Image = buffer.toString("base64")
    const dataUrl = `data:${file.type};base64,${base64Image}`

    // Prepare form data for OCR.space API
    const ocrFormData = new FormData()
    ocrFormData.append("base64Image", dataUrl)
    ocrFormData.append("language", language)
    ocrFormData.append("OCREngine", "2") // Use Engine 2 as requested
    ocrFormData.append("isTable", "true") // Better for receipt parsing
    ocrFormData.append("scale", "true") // Improve low-resolution scans
    ocrFormData.append("isOverlayRequired", "false") // We don't need coordinates

    // Call OCR.space API
    const response = await fetch("https://api.ocr.space/parse/image", {
      method: "POST",
      headers: {
        apikey: process.env.OCR_SPACE_API_KEY!, // Using the same env var for now
      },
      body: ocrFormData,
    })

    if (!response.ok) {
      throw new Error(`OCR API error: ${response.status}`)
    }

    const data = await response.json()

    // Check for API errors
    if (data.IsErroredOnProcessing || data.OCRExitCode === "4") {
      return {
        success: false,
        error: data.ErrorMessage || "OCR processing failed",
      }
    }

    // Extract text from parsed results
    let fullText = ""
    if (data.ParsedResults && data.ParsedResults.length > 0) {
      for (const result of data.ParsedResults) {
        if (result.FileParseExitCode === 1 && result.ParsedText) {
          fullText += result.ParsedText + "\n"
        }
      }
    }

    if (!fullText.trim()) {
      return { success: false, error: "No text found in the image" }
    }

    // Parse the OCR text to extract items and prices
    const items = parseReceiptText(fullText)

    return {
      success: true,
      items,
      rawText: fullText,
    }
  } catch (error) {
    console.error("OCR processing error:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    }
  }
}

function parseReceiptText(text: string): Array<{ name: string; price: number }> {
  const items: Array<{ name: string; price: number }> = []

  try {
    // Split text into lines and process each line
    const lines = text
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0)

    // Chinese receipt specific patterns
    const chineseReceiptPattern = /^(.+?)\s+\$?(\d+)TX$/

    // General price patterns
    const pricePatterns = [
      // Chinese receipt pattern - item name followed by price and TX
      /^(.+?)\s+\$?(\d+)TX$/,

      // Chinese receipt pattern - item name followed by price with asterisk
      /^(.+?)\s+\$(\d+)\s*\*.*$/,

      // Chinese receipt pattern - price followed by TX
      /^(.+?)\s+(\d+)TX$/,

      // Pattern: "Item Name $12.34" or "Item Name 12.34"
      /^(.+?)\s+\$?(\d+\.\d{2})$/,

      // Pattern: "$12.34 Item Name" or "12.34 Item Name"
      /^\$?(\d+\.\d{2})\s+(.+)$/,

      // Pattern: "Item Name ... $12.34" (with dots or spaces)
      /^(.+?)\s*[.\s]+\s*\$?(\d+\.\d{2})$/,

      // Pattern: "Item Name    12.34" (multiple spaces)
      /^(.+?)\s{2,}\$?(\d+\.\d{2})$/,

      // Pattern: "Item Name: $12.34"
      /^(.+?):\s*\$?(\d+\.\d{2})$/,

      // Pattern: "Item Name - $12.34"
      /^(.+?)\s*-\s*\$?(\d+\.\d{2})$/,

      // Pattern: Just a price with $ sign
      /^\$(\d+).*$/,

      // Pattern: Price with asterisk
      /^.*\$(\d+)\s*\*.*$/,
    ]

    for (const line of lines) {
      // Skip lines that are likely headers or footers
      if (isHeaderOrFooter(line)) continue

      let matched = false

      // First try the Chinese receipt specific pattern
      const chineseMatch = line.match(chineseReceiptPattern)
      if (chineseMatch) {
        const itemName = chineseMatch[1].trim()
        const price = Number.parseInt(chineseMatch[2])

        if (isValidItem(itemName, price)) {
          items.push({
            name: cleanItemName(itemName),
            price: price,
          })
          matched = true
          continue
        }
      }

      // Try other patterns if Chinese pattern didn't match
      for (const pattern of pricePatterns) {
        const match = line.match(pattern)
        if (match) {
          let itemName: string
          let priceStr: string

          if (pattern.source.startsWith("^(.+?)")) {
            // Item name comes first
            itemName = match[1].trim()
            priceStr = match[2]
          } else if (pattern.source.startsWith("^\\$")) {
            // Just a price with $ sign
            continue // Skip lines with just prices
          } else {
            // Price comes first
            priceStr = match[1]
            itemName = match[2]?.trim() || ""
          }

          // Convert price string to number
          const price = Number.parseFloat(priceStr)

          // Validate the extracted data
          if (isValidItem(itemName, price)) {
            items.push({
              name: cleanItemName(itemName),
              price: price,
            })
            matched = true
            break // Found a match for this line, move to next line
          }
        }
      }

      // Special case for lines with item name and price separated by tab or multiple spaces
      if (!matched) {
        // Try to find a price in the line
        const priceMatch = line.match(/\$?(\d+)(?:\.\d{2})?\s*\*?/)
        const nameMatch = line.match(/^(?:1\s+特價\s+)?(.+?)(?=\$|\d+TX|\s{2,}|$)/)

        if (priceMatch && nameMatch) {
          const itemName = nameMatch[1].trim()
          const price = Number.parseFloat(priceMatch[1])

          if (isValidItem(itemName, price)) {
            items.push({
              name: cleanItemName(itemName),
              price: price,
            })
          }
        }
      }
    }
  } catch (error) {
    console.error("Error parsing receipt text:", error)
  }

  return items
}

function isHeaderOrFooter(line: string): boolean {
  const headerFooterKeywords = [
    "交易日期",
    "店名",
    "電話",
    "地址",
    "機台",
    "序號",
    "合計",
    "發票號碼",
    "隨機碼",
    "LinePay",
    "代收",
  ]

  return headerFooterKeywords.some((keyword) => line.includes(keyword))
}

function isValidItem(name: string, price: number): boolean {
  return (
    !!name &&
    name.length > 1 &&
    name.length < 100 &&
    price > 0 &&
    price < 10000 && // Reasonable price limit
    !isCommonReceiptKeyword(name)
  )
}

function isCommonReceiptKeyword(text: string): boolean {
  const keywords = [
    "total",
    "subtotal",
    "tax",
    "tip",
    "change",
    "cash",
    "credit",
    "debit",
    "visa",
    "mastercard",
    "amex",
    "discover",
    "receipt",
    "thank you",
    "date",
    "time",
    "store",
    "location",
    "phone",
    "address",
    "qty",
    "quantity",
    "balance",
    "payment",
    "tender",
  ]

  return keywords.some((keyword) => text.toLowerCase().includes(keyword.toLowerCase()))
}

function cleanItemName(name: string): string {
  // Remove common prefixes/suffixes and clean up the item name
  return name
    .replace(/^\d+\s*x?\s*/i, "") // Remove quantity prefixes like "2x" or "2 "
    .replace(/\s*@\s*\$?\d+\.\d{2}.*$/i, "") // Remove unit price suffixes
    .replace(/\s*each\s*$/i, "") // Remove "each" suffix
    .replace(/\s*ea\s*$/i, "") // Remove "ea" suffix
    .replace(/\s+/g, " ") // Normalize whitespace
    .replace(/[:-]+$/, "") // Remove trailing colons or dashes
    .trim()
}

// ─── GPT-4.1 Based OCR ---------------------------------------------------

export async function processReceiptWithGPT(
  formData: FormData,
): Promise<OCRResponse> {
  try {
    const file = formData.get("receipt") as File
    if (!file) {
      return { success: false, error: "No file provided" }
    }

    const client = new OpenAI({
      baseURL: "https://models.github.ai/inference",
      apiKey: process.env.GITHUB_TOKEN,
    })

    // Upload the image to OpenAI's files API for vision use
    const openAiFile = await client.files.create({
      file: await OpenAI.toFile(await file.arrayBuffer(), file.name, {
        type: file.type,
      }),
      purpose: "vision",
    })

    const response = await client.responses.create({
      model: "openai/gpt-4.1",
      input: [
        {
          role: "user",
          content: [
            { type: "input_text", text: "Scan this receipt and output items as JSON." },
            { type: "input_image", file_id: openAiFile.id },
          ],
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
      top_p: 1,
    })

    const text = response.output_text || "{}"
    const parsed = JSON.parse(text)
    const rawItems = parsed.items || []
    const items = rawItems
      .map((i: any) => ({
        name: String(i.description || i.name || "").trim(),
        price: Number.parseFloat(i.total_price ?? i.price ?? 0),
      }))
      .filter((i: any) => i.name && !Number.isNaN(i.price))

    if (items.length === 0) {
      return { success: false, error: "No items parsed" }
    }

    return { success: true, items, rawText: text }
  } catch (error) {
    console.error("GPT OCR error:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    }
  }
}
