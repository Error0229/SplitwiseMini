// src/components/DragSplitTab.tsx

"use client";

import React from "react";
import { ReceiptItem, Person } from "../types";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import CompactPagination from "./CompactPagination";
import {
  DndContext,
  DragOverlay,
  useSensor,
  useSensors,
  TouchSensor,
  MouseSensor,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  useDraggable,
  useDroppable,
} from "@dnd-kit/core";

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
  handleDropOnPerson: (personId: string) => void;
  handleDropOnSplitArea: (splitType: "equal" | "unequal") => void;
  unsplitItemsCount: number;
  resetItemToUnsplit: (itemId: string) => void;
}

const DraggableItem = ({
  item,
  children,
  isDragging,
}: {
  item: ReceiptItem;
  children?: React.ReactNode;
  isDragging?: boolean;
}) => {
  const { attributes, listeners, setNodeRef } = useDraggable({
    id: item.id,
    data: {
      type: "item",
      originalId: item.id.includes("-") ? item.id.split("-")[0] : item.id,
    },
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`p-2 mb-1 dark:bg-red-950/30 bg-red-50 dark:border-red-900 border-red-200 border rounded-lg cursor-move hover:bg-red-100 dark:hover:bg-red-950/50 transition-colors touch-none ${
        isDragging ? "opacity-30" : ""
      }`}
    >
      {children ? (
        children
      ) : (
        <div className="flex items-center justify-between">
          <div className="min-w-0 flex-1">
            <div className="font-medium text-sm truncate">{item.name}</div>
            <div className="text-xs text-muted-foreground">
              ${item.price.toFixed(2)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const DroppableArea = ({
  id,
  children,
  className,
}: {
  id: string;
  children: React.ReactNode;
  className: string;
}) => {
  const { setNodeRef } = useDroppable({
    id,
  });

  return (
    <div ref={setNodeRef} className={className}>
      {children}
    </div>
  );
};

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
  handleDragStart: onDragStart,
  handleDropOnPerson,
  handleDropOnSplitArea,
  unsplitItemsCount,
  resetItemToUnsplit,
}) => {
  const [activeId, setActiveId] = React.useState<string | null>(null);

  const sensors = useSensors(
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    }),
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 10,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const id = event.active.id as string;
    setActiveId(id);

    const originalId = id.includes("-") ? id.split("-")[0] : id;
    const item =
      paginatedUnsplitItems.find((i) => i.id === originalId) ||
      Object.values(splitItemsByPerson)
        .flat()
        .find((i) => i.id === originalId);

    if (item) onDragStart(item);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const originalId = active.data.current?.originalId || active.id;

    // If dropping in unsplit area
    if (over.id === "unsplit-area") {
      resetItemToUnsplit(originalId);
      setActiveId(null);
      return;
    }

    // Find the item either from paginated or from split items
    const item =
      paginatedUnsplitItems.find((i) => i.id === originalId) ||
      Object.values(splitItemsByPerson)
        .flat()
        .find((i) => i.id === originalId);

    if (!item) return;

    if (over.id.toString().startsWith("person-")) {
      const personId = over.id.toString().replace("person-", "");
      handleDropOnPerson(personId);
    } else if (over.id === "equal-split") {
      handleDropOnSplitArea("equal");
    } else if (over.id === "unequal-split") {
      handleDropOnSplitArea("unequal");
    }

    setActiveId(null);
  };

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Unsplit Items - 左側 3 欄 */}
        <div className="lg:col-span-3">
          <div className="sticky top-4">
            <h3 className="font-semibold mb-4 text-center">Unsplit Items</h3>
            <DroppableArea
              id="unsplit-area"
              className="border-2 border-dashed border-gray-300 rounded-lg"
            >
              <div className="min-h-[200px] max-h-[calc(100vh-240px)] overflow-y-auto p-4">
                {paginatedUnsplitItems.map((item) => (
                  <DraggableItem
                    key={item.id}
                    item={item}
                    isDragging={
                      item.id === activeId ||
                      item.id === activeId?.split("-")[0]
                    }
                  />
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
            </DroppableArea>
          </div>
        </div>

        {/* People Columns - 中間 6 欄 */}
        <div className="lg:col-span-6">
          <h3 className="font-semibold mb-4 text-center">People</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[calc(100vh-180px)] overflow-y-auto pr-2">
            {people.map((person) => (
              <div key={person.id} className="space-y-1">
                <h4 className="font-medium text-center sticky top-0 bg-background py-2 z-10">
                  {person.name}
                  <div className="text-sm font-normal text-muted-foreground">
                    Total: ${totals[person.id]?.toFixed(2) || "0.00"}
                  </div>
                </h4>
                <DroppableArea
                  id={`person-${person.id}`}
                  className="min-h-[150px] p-3 border-2 border-dashed border-blue-300 rounded-lg hover:border-blue-400 transition-colors"
                >
                  <div className="text-xs text-center text-muted-foreground mb-2">
                    Drop items here for individual assignment
                  </div>
                  <div className="space-y-1">
                    {splitItemsByPerson[person.id]?.map((item) => (
                      <DraggableItem
                        key={`${item.id}-${person.id}`}
                        item={{
                          ...item,
                          id: `${item.id}-${person.id}`, // Add person ID to make the drag ID unique
                        }}
                        isDragging={
                          `${item.id}-${person.id}` === activeId ||
                          item.id === activeId?.split("-")[0]
                        }
                      >
                        <div className="flex items-center justify-between min-w-0">
                          <div className="min-w-0 flex-1">
                            <div className="font-medium text-sm truncate">
                              {item.name}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {item.splitType === "individual" &&
                                `$${item.price.toFixed(2)}`}
                              {item.splitType === "equal" &&
                                `$${(
                                  item.price /
                                  (item.equalSplitPeople?.length || 1)
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
                            className="h-6 w-6 p-0 ml-2 shrink-0 flex items-center justify-center"
                            onClick={() => resetItemToUnsplit(item.id)}
                          >
                            <ArrowLeft className="h-3 w-3" />
                          </Button>
                        </div>
                      </DraggableItem>
                    ))}
                  </div>
                </DroppableArea>
              </div>
            ))}
          </div>
        </div>

        {/* Split Options - 右側 3 欄 */}
        <div className="lg:col-span-3">
          <div className="sticky top-4">
            <h3 className="font-semibold mb-4 text-center">Split Options</h3>
            <div className="space-y-4">
              <DroppableArea
                id="equal-split"
                className="p-4 border-2 border-dashed border-green-300 rounded-lg text-center hover:border-green-400 transition-colors min-h-[100px] flex flex-col justify-center"
              >
                <div className="font-medium text-green-700">Equal Split</div>
                <div className="text-sm text-muted-foreground">
                  Split equally among selected people
                </div>
              </DroppableArea>
              <DroppableArea
                id="unequal-split"
                className="p-4 border-2 border-dashed border-orange-300 rounded-lg text-center hover:border-orange-400 transition-colors min-h-[100px] flex flex-col justify-center"
              >
                <div className="font-medium text-orange-700">Custom Split</div>
                <div className="text-sm text-muted-foreground">
                  Set custom amounts for each person
                </div>
              </DroppableArea>
            </div>
          </div>
        </div>
      </div>

      <DragOverlay dropAnimation={null}>
        {activeId && (
          <DraggableItem
            item={
              paginatedUnsplitItems.find(
                (item) =>
                  item.id ===
                  (activeId.includes("-") ? activeId.split("-")[0] : activeId)
              ) ||
              Object.values(splitItemsByPerson)
                .flat()
                .find(
                  (item) =>
                    item.id ===
                    (activeId.includes("-") ? activeId.split("-")[0] : activeId)
                ) || { id: activeId, name: "", price: 0, splitType: "unsplit" }
            }
            isDragging={false}
          />
        )}
      </DragOverlay>
    </DndContext>
  );
};

export default DragSplitTab;
