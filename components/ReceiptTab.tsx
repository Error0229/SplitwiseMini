// src/components/ReceiptTab.tsx

"use client";

import React, { useRef } from "react";
import { Person, ReceiptItem, EditableItem } from "../types";
import ReceiptItemComponent from "./ReceiptItemComponent";
import PaginationControls from "./PaginationControls";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Download,
  UploadIcon,
  Camera,
  Loader2,
  Globe,
  Edit2,
  Plus,
  X,
  Save,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ReceiptItem as ReceiptItemType } from "../types";

interface Props {
  people: Person[];
  receiptItems: ReceiptItem[];
  editableItems: EditableItem[];
  newItemName: string;
  newItemPrice: string;
  selectedLanguage: string;
  isProcessingOCR: boolean;
  ocrError: string | null;
  ocrSuccess: string | null;
  receiptTitle: string;
  grandTotal: number;
  currentPage: number;
  pageSize: number;
  totalPages: number;
  paginatedItems: ReceiptItem[];
  fileInputRef: React.RefObject<HTMLInputElement>;
  setSelectedLanguage: React.Dispatch<React.SetStateAction<string>>;
  handleReceiptUpload: (
    event: React.ChangeEvent<HTMLInputElement>
  ) => Promise<void>;
  exportData: () => void;
  importData: (event: React.ChangeEvent<HTMLInputElement>) => void;
  updateEditableItem: (
    id: string,
    field: "name" | "price",
    value: string
  ) => void;
  startEditingItem: (id: string) => void;
  saveEditableItem: (id: string) => void;
  removeEditableItem: (id: string) => void;
  addEditableItemsToReceipt: () => void;
  addReceiptItem: () => void;
  removeReceiptItem: (id: string) => void;
  setNewItemName: React.Dispatch<React.SetStateAction<string>>;
  setNewItemPrice: React.Dispatch<React.SetStateAction<string>>;
  setCurrentPage: React.Dispatch<React.SetStateAction<number>>;
}

const LANGUAGE_OPTIONS = [
  { code: "eng", name: "English" },
  { code: "spa", name: "Spanish" },
  { code: "fre", name: "French" },
  { code: "ger", name: "German" },
  { code: "ita", name: "Italian" },
  { code: "por", name: "Portuguese" },
  { code: "rus", name: "Russian" },
  { code: "jpn", name: "Japanese" },
  { code: "kor", name: "Korean" },
  { code: "chs", name: "Chinese (Simplified)" },
  { code: "cht", name: "Chinese (Traditional)" },
  { code: "ara", name: "Arabic" },
  { code: "dut", name: "Dutch" },
  { code: "pol", name: "Polish" },
  { code: "tha", name: "Thai" },
  { code: "tur", name: "Turkish" },
  { code: "vnm", name: "Vietnamese" },
];

const ReceiptTab: React.FC<Props> = ({
  people,
  receiptItems,
  editableItems,
  newItemName,
  newItemPrice,
  selectedLanguage,
  isProcessingOCR,
  ocrError,
  ocrSuccess,
  receiptTitle,
  grandTotal,
  currentPage,
  pageSize,
  totalPages,
  paginatedItems,
  fileInputRef,
  setSelectedLanguage,
  handleReceiptUpload,
  exportData,
  importData,
  updateEditableItem,
  startEditingItem,
  saveEditableItem,
  removeEditableItem,
  addEditableItemsToReceipt,
  addReceiptItem,
  removeReceiptItem,
  setNewItemName,
  setNewItemPrice,
  setCurrentPage,
}) => {
  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Receipt Items</CardTitle>
            <CardDescription>Add items from your receipt</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportData}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
            >
              <UploadIcon className="h-4 w-4 mr-2" />
              Import
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={importData}
              className="hidden"
            />
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* OCR Upload Section */}
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
          <div className="text-center">
            <Camera className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <div className="space-y-4">
              <div>
                <Label htmlFor="receipt-upload" className="cursor-pointer">
                  <div className="text-lg font-medium">Scan Receipt</div>
                  <div className="text-sm text-muted-foreground">
                    Upload a photo of your receipt for automatic item extraction
                  </div>
                </Label>
              </div>

              {/* Language Selection */}
              <div className="flex items-center justify-center gap-2">
                <Globe className="h-4 w-4 text-gray-500" />
                <Label htmlFor="language-select" className="text-sm">
                  Language:
                </Label>
                <Select
                  value={selectedLanguage}
                  onValueChange={setSelectedLanguage}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGE_OPTIONS.map((lang) => (
                      <SelectItem key={lang.code} value={lang.code}>
                        {lang.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Input
                  id="receipt-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleReceiptUpload}
                  disabled={isProcessingOCR}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  onClick={() =>
                    document.getElementById("receipt-upload")?.click()
                  }
                  disabled={isProcessingOCR}
                  className="mt-2"
                >
                  {isProcessingOCR ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <UploadIcon className="h-4 w-4 mr-2" />
                      Upload Receipt
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* OCR Error / Success Display */}
        {ocrError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-red-700 text-sm">{ocrError}</p>
          </div>
        )}
        {ocrSuccess && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <p className="text-green-700 text-sm">{ocrSuccess}</p>
          </div>
        )}

        {/* Editable OCR Results */}
        {editableItems.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>OCR Results (Editable)</CardTitle>
              <CardDescription>
                Review and edit the extracted items before adding them
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {editableItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-2 p-2 border rounded"
                >
                  {item.isEditing ? (
                    <>
                      <Input
                        value={item.name}
                        onChange={(e) =>
                          updateEditableItem(item.id, "name", e.target.value)
                        }
                        className="flex-1"
                      />
                      <Input
                        value={item.price}
                        onChange={(e) =>
                          updateEditableItem(item.id, "price", e.target.value)
                        }
                        type="number"
                        step="0.01"
                        className="w-24"
                      />
                      <Button
                        size="sm"
                        onClick={() => saveEditableItem(item.id)}
                      >
                        <Save className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <span className="flex-1">{item.name}</span>
                      <span className="w-24">
                        ${Number.parseFloat(item.price).toFixed(2)}
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => startEditingItem(item.id)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => removeEditableItem(item.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button onClick={addEditableItemsToReceipt} className="w-full">
                Add All Items to Receipt
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Manual Entry Section */}
        <div className="space-y-2">
          <Label>Or add items manually:</Label>
          <div className="grid grid-cols-3 gap-2">
            <Input
              placeholder="Item name"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
            />
            <Input
              placeholder="Price"
              type="number"
              step="0.01"
              value={newItemPrice}
              onChange={(e) => setNewItemPrice(e.target.value)}
            />
            <Button onClick={addReceiptItem}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Items List */}
        <div className="space-y-2">
          {paginatedItems.map((item) => (
            <ReceiptItemComponent
              key={item.id}
              item={item}
              onRemove={removeReceiptItem}
            />
          ))}
          {receiptItems.length > 0 && (
            <PaginationControls
              currentPage={currentPage}
              setCurrentPage={setCurrentPage}
              pageSize={pageSize}
              setPageSize={(size) => {
                setCurrentPage(1);
                // setPageSize 需由父元件傳入，這裡省略
              }}
              totalPages={totalPages}
              totalItems={receiptItems.length}
              label="Items"
            />
          )}
          {receiptItems.length === 0 && (
            <p className="text-muted-foreground text-center py-4">
              No items added yet
            </p>
          )}
        </div>

        {receiptItems.length > 0 && (
          <div className="pt-4 border-t">
            <div className="flex justify-between items-center">
              <span className="font-semibold">Total:</span>
              <span className="font-semibold text-lg">
                ${grandTotal.toFixed(2)}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ReceiptTab;
