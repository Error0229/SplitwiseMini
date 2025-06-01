// src/components/SummaryTab.tsx

"use client";

import React from "react";
import { Person, ReceiptItem } from "../types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";

interface PersonItem {
  item: ReceiptItem;
  amount: number;
  type: string;
}

interface Props {
  people: Person[];
  totals: { [personId: string]: number };
  grandTotal: number;
  getPersonItems: (personId: string) => PersonItem[];
  unsplitItems: ReceiptItem[];
  receiptTitle: string;
  isPublishing: boolean;
  setReceiptTitle: React.Dispatch<React.SetStateAction<string>>;
  handlePublishReceipt: () => Promise<void>;
  publishedUrl: string | null;
}

const SummaryTab: React.FC<Props> = ({
  people,
  totals,
  grandTotal,
  getPersonItems,
  unsplitItems,
  receiptTitle,
  isPublishing,
  setReceiptTitle,
  handlePublishReceipt,
  publishedUrl,
}) => {
  const [showPersonItems, setShowPersonItems] = React.useState<string | null>(
    null
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Split Summary</CardTitle>
        <CardDescription>
          How much each person owes (click on names to see details)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {people.map((person) => (
            <div key={person.id} className="space-y-2">
              <div className="flex justify-between items-center p-3 border rounded-lg">
                <Button
                  variant="ghost"
                  className="font-medium text-left p-0 h-auto"
                  onClick={() =>
                    setShowPersonItems(
                      showPersonItems === person.id ? null : person.id
                    )
                  }
                >
                  <div className="flex items-center gap-2">
                    {person.name}
                    <Eye className="h-4 w-4" />
                  </div>
                </Button>
                <span className="font-semibold text-lg">
                  ${totals[person.id]?.toFixed(2) || "0.00"}
                </span>
              </div>

              {showPersonItems === person.id && (
                <div className="ml-4 space-y-1 dark:bg-gray-900 bg-gray-50 p-3 rounded border dark:border-gray-800">
                  {getPersonItems(person.id).map((personItem, index) => (
                    <div key={index} className="flex justify-between text-sm">
                      <span>
                        {personItem.item.name} ({personItem.type})
                      </span>
                      <span>${personItem.amount.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          {people.length === 0 && (
            <p className="text-muted-foreground text-center py-4">
              No people added yet
            </p>
          )}

          <Separator />

          <div className="flex justify-between items-center text-lg font-semibold">
            <span>Total Receipt Amount:</span>
            <span>${grandTotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center text-lg font-semibold">
            <span>Total Assigned:</span>
            <span>
              $
              {Object.values(totals)
                .reduce((sum, amount) => sum + amount, 0)
                .toFixed(2)}
            </span>
          </div>
          {unsplitItems.length > 0 && (
            <div className="flex justify-between items-center text-lg font-semibold text-red-600">
              <span>Unsplit Amount:</span>
              <span>
                $
                {unsplitItems
                  .reduce((sum, item) => sum + item.price, 0)
                  .toFixed(2)}
              </span>
            </div>
          )}
        </div>

        {/* Publish Receipt Button */}
        <div className="flex justify-end mt-4 gap-2">
          <Input
            placeholder="Enter receipt title"
            value={receiptTitle}
            onChange={(e) => setReceiptTitle(e.target.value)}
            className="max-w-xs"
          />
          <Button
            variant="outline"
            onClick={handlePublishReceipt}
            disabled={isPublishing || people.length === 0}
          >
            {isPublishing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Publishing...
              </>
            ) : (
              <>
                <Eye className="h-4 w-4 mr-2" />
                Publish Receipt
              </>
            )}
          </Button>
        </div>

        {publishedUrl && (
          <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-900 rounded-lg">
            <p className="text-green-700 dark:text-green-300">
              Receipt published! Share this link:
            </p>
            <a
              href={new URL(publishedUrl, window.location.origin).toString()}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 break-all"
            >
              {new URL(publishedUrl, window.location.origin).toString()}
            </a>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SummaryTab;
