// src/components/DragSplitTab.tsx

"use client";

import React from "react";
import { ReceiptItem, Person } from "../types";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import CompactPagination from "./CompactPagination";

interface Props {
  people: Person[];
  totals: { [personId: string]: number };
  unsplitItems: ReceiptItem[];
  splitItemsByPerson: { [personId: string]: ReceiptItem[] };
  paginatedUnsplitItems: ReceiptItem[];
  unsplitItemsPage: number;
  totalUnsplitPages: number;
  setUnsplitItemsPage: React.Dispatch<React.SetStateAction<number>>;
  draggedItem: ReceiptItem | null;
  handleDragStart: (item: ReceiptItem) => void;
  handleDragOver: (e: React.DragEvent) => void;
  handleDropOnPerson: (personId: string) => void;
  handleDropOnSplitArea: (splitType: "equal" | "unequal") => void;
  unsplitItemsCount: number;
  resetItemToUnsplit: (itemId: string) => void;
}

const DragSplitTab: React.FC<Props> = ({
  people,
  totals,
  unsplitItems,
  splitItemsByPerson,
  paginatedUnsplitItems,
  unsplitItemsPage,
  totalUnsplitPages,
  setUnsplitItemsPage,
  draggedItem,
  handleDragStart,
  handleDragOver,
  handleDropOnPerson,
  handleDropOnSplitArea,
  unsplitItemsCount,
  resetItemToUnsplit,
}) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Unsplit Items - 左側 3 欄 */}
      <div className="lg:col-span-3">
        <div className="sticky top-4">
          <h3 className="font-semibold mb-4 text-center">Unsplit Items</h3>
          <div className="border-2 border-dashed border-gray-300 rounded-lg">
            <div className="min-h-[200px] max-h-[calc(100vh-240px)] overflow-y-auto p-4">
              {paginatedUnsplitItems.map((item) => (
                <div
                  key={item.id}
                  draggable
                  onDragStart={() => handleDragStart(item)}
                  className="p-3 mb-2 dark:bg-red-950/30 bg-red-50 dark:border-red-900 border-red-200 border rounded-lg cursor-move hover:bg-red-100 dark:hover:bg-red-950/50 transition-colors"
                >
                  <div className="font-medium text-sm">{item.name}</div>
                  <div className="text-xs text-muted-foreground">
                    ${item.price.toFixed(2)}
                  </div>
                </div>
              ))}
              {unsplitItems.length === 0 && (
                <div className="text-center text-muted-foreground py-8">
                  <p>All items have been split!</p>
                </div>
              )}
            </div>
            {unsplitItemsCount > 0 && (
              <CompactPagination
                currentPage={unsplitItemsPage}
                setCurrentPage={setUnsplitItemsPage}
                totalPages={totalUnsplitPages}
                totalItems={unsplitItemsCount}
              />
            )}
          </div>
        </div>
      </div>

      {/* People Columns - 中間 6 欄 */}
      <div className="lg:col-span-6">
        <h3 className="font-semibold mb-4 text-center">People</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[calc(100vh-180px)] overflow-y-auto pr-2">
          {people.map((person) => (
            <div key={person.id} className="space-y-2">
              <h4 className="font-medium text-center sticky top-0 bg-background py-2 z-10">
                {person.name}
                <div className="text-sm font-normal text-muted-foreground">
                  Total: ${totals[person.id]?.toFixed(2) || "0.00"}
                </div>
              </h4>
              <div
                onDragOver={handleDragOver}
                onDrop={() => handleDropOnPerson(person.id)}
                className="min-h-[150px] p-3 border-2 border-dashed border-blue-300 rounded-lg hover:border-blue-400 transition-colors"
              >
                <div className="text-xs text-center text-muted-foreground mb-2">
                  Drop items here for individual assignment
                </div>
                <div className="space-y-1">
                  {splitItemsByPerson[person.id]?.map((item) => (
                    <div
                      key={`${item.id}-${person.id}`}
                      className="p-2 dark:bg-blue-950/30 bg-blue-50 dark:border-blue-900 border-blue-200 border rounded text-xs flex items-center justify-between"
                    >
                      <div className="flex-1">
                        <div className="font-medium">{item.name}</div>
                        <div className="text-muted-foreground">
                          {item.splitType === "individual" &&
                            `$${item.price.toFixed(2)}`}
                          {item.splitType === "equal" &&
                            `$${(
                              item.price / (item.equalSplitPeople?.length || 1)
                            ).toFixed(2)} (split)`}
                          {item.splitType === "unequal" &&
                            `$${(
                              item.unequalSplit?.find(
                                (s) => s.personId === person.id
                              )?.amount || 0
                            ).toFixed(2)} (custom)`}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0 ml-2 flex items-center justify-center"
                        onClick={() => resetItemToUnsplit(item.id)}
                        // 實際上改為 resetItemToUnsplit
                      >
                        <ArrowLeft className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Split Options - 右側 3 欄 */}
      <div className="lg:col-span-3">
        <div className="sticky top-4">
          <h3 className="font-semibold mb-4 text-center">Split Options</h3>
          <div className="space-y-4">
            <div
              onDragOver={handleDragOver}
              onDrop={() => handleDropOnSplitArea("equal")}
              className="p-4 border-2 border-dashed border-green-300 rounded-lg text-center hover:border-green-400 transition-colors min-h-[100px] flex flex-col justify-center"
            >
              <div className="font-medium text-green-700">Equal Split</div>
              <div className="text-sm text-muted-foreground">
                Split equally among selected people
              </div>
            </div>
            <div
              onDragOver={handleDragOver}
              onDrop={() => handleDropOnSplitArea("unequal")}
              className="p-4 border-2 border-dashed border-orange-300 rounded-lg text-center hover:border-orange-400 transition-colors min-h-[100px] flex flex-col justify-center"
            >
              <div className="font-medium text-orange-700">Custom Split</div>
              <div className="text-sm text-muted-foreground">
                Set custom amounts for each person
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DragSplitTab;
