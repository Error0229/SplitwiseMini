"use client";

import React from "react";
import { useState, useRef, useMemo, useCallback } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import debounce from "lodash/debounce";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Trash2,
  Plus,
  Receipt,
  Users,
  Calculator,
  Edit2,
  Save,
  X,
  Download,
  Eye,
  Grip,
  ArrowLeft,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { processReceiptOCR } from "./actions/ocr";
import { UploadIcon, Camera, Loader2, Globe } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import Image from "next/image";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { publishReceipt, SharedReceipt } from "./actions/share";

// Move interfaces to a separate types file
import type { Person, ReceiptItem, EditableItem } from "./types";
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

// Memoized Item Components
const ReceiptItemComponent = React.memo(
  ({
    item,
    onRemove,
  }: {
    item: ReceiptItem;
    onRemove: (id: string) => void;
  }) => {
    return (
      <div className="flex items-center justify-between p-3 border rounded-lg">
        <div className="flex items-center gap-2">
          <span className="font-medium">{item.name}</span>
          <span className="text-muted-foreground">
            ${item.price.toFixed(2)}
          </span>
          <Badge
            variant={item.splitType === "unsplit" ? "destructive" : "default"}
          >
            {item.splitType === "unsplit" ? "Not Split" : item.splitType}
          </Badge>
        </div>
        <Button variant="outline" size="sm" onClick={() => onRemove(item.id)}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    );
  }
);

export default function MoneySplitApp() {
  const [people, setPeople] = useState<Person[]>([]);
  const [newPersonName, setNewPersonName] = useState("");
  const [receiptItems, setReceiptItems] = useState<ReceiptItem[]>([]);
  const [newItemName, setNewItemName] = useState("");
  const [newItemPrice, setNewItemPrice] = useState("");
  const [activeTab, setActiveTab] = useState("people");
  const [isProcessingOCR, setIsProcessingOCR] = useState(false);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [ocrSuccess, setOcrSuccess] = useState<string | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState("auto");
  const [editableItems, setEditableItems] = useState<EditableItem[]>([]);
  const [showPersonItems, setShowPersonItems] = useState<string | null>(null);
  const [draggedItem, setDraggedItem] = useState<ReceiptItem | null>(null);
  const [showSplitDialog, setShowSplitDialog] = useState(false);
  const [splitDialogType, setSplitDialogType] = useState<"equal" | "unequal">(
    "equal"
  );
  const [tempEqualSplitPeople, setTempEqualSplitPeople] = useState<string[]>(
    []
  );
  const [tempUnequalSplit, setTempUnequalSplit] = useState<
    { personId: string; amount: number }[]
  >([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [splitItemsPage, setSplitItemsPage] = useState(1);
  const [splitItemsPageSize, setSplitItemsPageSize] = useState(5);
  const [unsplitItemsPage, setUnsplitItemsPage] = useState(1);
  const [unsplitItemsPageSize, setUnsplitItemsPageSize] = useState(5);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishedUrl, setPublishedUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Add person
  const addPerson = () => {
    if (newPersonName.trim()) {
      const newPerson: Person = {
        id: Date.now().toString(),
        name: newPersonName.trim(),
      };
      setPeople([...people, newPerson]);
      setNewPersonName("");
    }
  };

  // Remove person
  const removePerson = (id: string) => {
    setPeople(people.filter((p) => p.id !== id));
    // Also remove from any receipt items
    setReceiptItems((items) =>
      items.map((item) => ({
        ...item,
        assignedTo: item.assignedTo === id ? undefined : item.assignedTo,
        equalSplitPeople: item.equalSplitPeople?.filter((pid) => pid !== id),
        unequalSplit: item.unequalSplit?.filter(
          (split) => split.personId !== id
        ),
        splitType: item.assignedTo === id ? "unsplit" : item.splitType,
      }))
    );
  };

  // Add receipt item
  const addReceiptItem = useCallback(() => {
    if (newItemName.trim() && newItemPrice.trim()) {
      setReceiptItems((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          name: newItemName.trim(),
          price: Number.parseFloat(newItemPrice),
          splitType: "unsplit",
        },
      ]);
      setNewItemName("");
      setNewItemPrice("");
    }
  }, [newItemName, newItemPrice]);

  // Remove receipt item
  const removeReceiptItem = (id: string) => {
    setReceiptItems(receiptItems.filter((item) => item.id !== id));
  };

  // Update item split type
  const updateItemSplitType = (
    itemId: string,
    splitType: "individual" | "equal" | "unequal" | "unsplit"
  ) => {
    setReceiptItems((items) =>
      items.map((item) =>
        item.id === itemId
          ? {
              ...item,
              splitType,
              assignedTo: undefined,
              equalSplitPeople: [],
              unequalSplit: [],
            }
          : item
      )
    );
  };

  // Update individual assignment
  const updateIndividualAssignment = (itemId: string, personId: string) => {
    setReceiptItems((items) =>
      items.map((item) =>
        item.id === itemId
          ? { ...item, assignedTo: personId, splitType: "individual" }
          : item
      )
    );
  };

  // Update equal split people
  const updateEqualSplitPeople = (
    itemId: string,
    personId: string,
    checked: boolean
  ) => {
    setReceiptItems((items) =>
      items.map((item) => {
        if (item.id === itemId) {
          const currentPeople = item.equalSplitPeople || [];
          const updatedPeople = checked
            ? [...currentPeople, personId]
            : currentPeople.filter((id) => id !== personId);
          return { ...item, equalSplitPeople: updatedPeople };
        }
        return item;
      })
    );
  };

  // Select all for equal split
  const selectAllForEqualSplit = (itemId: string, selectAll: boolean) => {
    setReceiptItems((items) =>
      items.map((item) => {
        if (item.id === itemId) {
          return {
            ...item,
            equalSplitPeople: selectAll ? people.map((p) => p.id) : [],
          };
        }
        return item;
      })
    );
  };

  // Update unequal split
  const updateUnequalSplit = (
    itemId: string,
    personId: string,
    amount: number
  ) => {
    setReceiptItems((items) =>
      items.map((item) => {
        if (item.id === itemId) {
          const currentSplit = item.unequalSplit || [];
          const existingIndex = currentSplit.findIndex(
            (split) => split.personId === personId
          );

          let updatedSplit;
          if (existingIndex >= 0) {
            if (amount === 0) {
              updatedSplit = currentSplit.filter(
                (split) => split.personId !== personId
              );
            } else {
              updatedSplit = currentSplit.map((split) =>
                split.personId === personId ? { ...split, amount } : split
              );
            }
          } else if (amount > 0) {
            updatedSplit = [...currentSplit, { personId, amount }];
          } else {
            updatedSplit = currentSplit;
          }

          return { ...item, unequalSplit: updatedSplit };
        }
        return item;
      })
    );
  };

  // Reset item to unsplit
  const resetItemToUnsplit = (itemId: string) => {
    setReceiptItems((items) =>
      items.map((item) =>
        item.id === itemId
          ? {
              ...item,
              splitType: "unsplit",
              assignedTo: undefined,
              equalSplitPeople: [],
              unequalSplit: [],
            }
          : item
      )
    );
  };

  // Calculate totals for each person
  const calculateTotals = () => {
    const totals: { [personId: string]: number } = {};
    people.forEach((person) => {
      totals[person.id] = 0;
    });

    receiptItems.forEach((item) => {
      if (item.splitType === "individual" && item.assignedTo) {
        totals[item.assignedTo] = (totals[item.assignedTo] || 0) + item.price;
      } else if (
        item.splitType === "equal" &&
        item.equalSplitPeople &&
        item.equalSplitPeople.length > 0
      ) {
        const splitAmount = item.price / item.equalSplitPeople.length;
        item.equalSplitPeople.forEach((personId) => {
          totals[personId] = (totals[personId] || 0) + splitAmount;
        });
      } else if (item.splitType === "unequal" && item.unequalSplit) {
        item.unequalSplit.forEach((split) => {
          totals[split.personId] = (totals[split.personId] || 0) + split.amount;
        });
      }
    });

    return totals;
  };

  // Get items for a specific person
  const getPersonItems = (personId: string) => {
    const items: Array<{ item: ReceiptItem; amount: number; type: string }> =
      [];

    receiptItems.forEach((item) => {
      if (item.splitType === "individual" && item.assignedTo === personId) {
        items.push({ item, amount: item.price, type: "Individual" });
      } else if (
        item.splitType === "equal" &&
        item.equalSplitPeople?.includes(personId)
      ) {
        const splitAmount = item.price / (item.equalSplitPeople?.length || 1);
        items.push({ item, amount: splitAmount, type: "Equal Split" });
      } else if (item.splitType === "unequal" && item.unequalSplit) {
        const split = item.unequalSplit.find((s) => s.personId === personId);
        if (split) {
          items.push({ item, amount: split.amount, type: "Custom Split" });
        }
      }
    });

    return items;
  };

  // Get unsplit items
  const getUnsplitItems = () => {
    return receiptItems.filter((item) => item.splitType === "unsplit");
  };

  // Get split items by person
  const getSplitItemsByPerson = () => {
    const splitItems: { [personId: string]: ReceiptItem[] } = {};
    people.forEach((person) => {
      splitItems[person.id] = [];
    });

    receiptItems.forEach((item) => {
      if (item.splitType === "individual" && item.assignedTo) {
        splitItems[item.assignedTo].push(item);
      } else if (item.splitType === "equal" && item.equalSplitPeople) {
        item.equalSplitPeople.forEach((personId) => {
          splitItems[personId].push(item);
        });
      } else if (item.splitType === "unequal" && item.unequalSplit) {
        item.unequalSplit.forEach((split) => {
          splitItems[split.personId].push(item);
        });
      }
    });

    return splitItems;
  };

  // Handle OCR file upload
  const handleReceiptUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessingOCR(true);
    setOcrError(null);
    setOcrSuccess(null);

    try {
      const formData = new FormData();
      formData.append("receipt", file);
      formData.append("language", selectedLanguage);

      const result = await processReceiptOCR(formData);

      if (result.success && result.items && result.items.length > 0) {
        // Convert to editable items first
        const newEditableItems: EditableItem[] = result.items.map(
          (item, index) => ({
            id: (Date.now() + index).toString(),
            name: item.name,
            price: item.price.toString(),
            isEditing: false,
          })
        );

        setEditableItems(newEditableItems);
        setActiveTab("receipt");
        setOcrSuccess(
          `Successfully extracted ${result.items.length} items from your receipt!`
        );
        setOcrError(null);
      } else if (result.success && result.items && result.items.length === 0) {
        setOcrError(
          "No items with prices were found in the receipt. You can add items manually below."
        );
      } else {
        setOcrError(result.error || "Failed to process receipt");
      }
    } catch (error) {
      setOcrError("Error processing receipt. Please try again.");
    } finally {
      setIsProcessingOCR(false);
      event.target.value = "";
    }
  };

  // Edit editable item
  const startEditingItem = (id: string) => {
    setEditableItems((items) =>
      items.map((item) =>
        item.id === id ? { ...item, isEditing: true } : item
      )
    );
  };

  const saveEditableItem = (id: string) => {
    setEditableItems((items) =>
      items.map((item) =>
        item.id === id ? { ...item, isEditing: false } : item
      )
    );
  };

  const updateEditableItem = (
    id: string,
    field: "name" | "price",
    value: string
  ) => {
    setEditableItems((items) =>
      items.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const removeEditableItem = (id: string) => {
    setEditableItems((items) => items.filter((item) => item.id !== id));
  };

  // Add editable items to receipt
  const addEditableItemsToReceipt = () => {
    const newItems: ReceiptItem[] = editableItems.map((item) => ({
      id: item.id,
      name: item.name,
      price: Number.parseFloat(item.price) || 0,
      splitType: "unsplit",
    }));

    setReceiptItems((prev) => [...prev, ...newItems]);
    setEditableItems([]);
  };

  // Export data
  const exportData = () => {
    const data = {
      people,
      receiptItems,
      exportDate: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `money-split-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Import data
  const importData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        if (data.people && data.receiptItems) {
          setPeople(data.people);
          setReceiptItems(data.receiptItems);
          setOcrSuccess("Data imported successfully!");
        } else {
          setOcrError("Invalid file format");
        }
      } catch (error) {
        setOcrError("Error reading file");
      }
    };
    reader.readAsText(file);
    event.target.value = "";
  };

  // Drag and drop handlers
  const handleDragStart = (item: ReceiptItem) => {
    setDraggedItem(item);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDropOnPerson = (personId: string) => {
    if (draggedItem) {
      updateIndividualAssignment(draggedItem.id, personId);
      setDraggedItem(null);
    }
  };

  const handleDropOnSplitArea = (splitType: "equal" | "unequal") => {
    if (draggedItem) {
      setSplitDialogType(splitType);
      if (splitType === "equal") {
        setTempEqualSplitPeople(people.map((p) => p.id)); // Default to all people
      } else {
        setTempUnequalSplit(people.map((p) => ({ personId: p.id, amount: 0 })));
      }
      setShowSplitDialog(true);
    }
  };

  const confirmSplit = () => {
    if (!draggedItem) return;

    if (splitDialogType === "equal") {
      setReceiptItems((items) =>
        items.map((item) =>
          item.id === draggedItem.id
            ? {
                ...item,
                splitType: "equal",
                equalSplitPeople: tempEqualSplitPeople,
              }
            : item
        )
      );
    } else {
      setReceiptItems((items) =>
        items.map((item) =>
          item.id === draggedItem.id
            ? { ...item, splitType: "unequal", unequalSplit: tempUnequalSplit }
            : item
        )
      );
    }

    setShowSplitDialog(false);
    setDraggedItem(null);
    setTempEqualSplitPeople([]);
    setTempUnequalSplit([]);
    setOcrError(null);
  };

  const cancelSplit = () => {
    setShowSplitDialog(false);
    setDraggedItem(null);
    setTempEqualSplitPeople([]);
    setTempUnequalSplit([]);
  };

  // Pagination calculation
  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return receiptItems.slice(startIndex, endIndex);
  }, [receiptItems, currentPage, pageSize]);

  const totalPages = Math.ceil(receiptItems.length / pageSize);

  // Add pagination calculations for split items
  const paginatedSplitItems = useMemo(() => {
    const startIndex = (splitItemsPage - 1) * splitItemsPageSize;
    const endIndex = startIndex + splitItemsPageSize;
    return receiptItems.slice(startIndex, endIndex);
  }, [receiptItems, splitItemsPage, splitItemsPageSize]);

  const totalSplitPages = Math.ceil(receiptItems.length / splitItemsPageSize);

  // Memoized calculations
  const totals = useMemo(() => calculateTotals(), [receiptItems, people]);
  const unsplitItems = useMemo(() => getUnsplitItems(), [receiptItems]);
  const splitItemsByPerson = useMemo(
    () => getSplitItemsByPerson(),
    [receiptItems, people]
  );

  // Add pagination calculations for unsplit items
  const paginatedUnsplitItems = useMemo(() => {
    const filteredUnsplit = getUnsplitItems();
    const startIndex = (unsplitItemsPage - 1) * unsplitItemsPageSize;
    const endIndex = startIndex + unsplitItemsPageSize;

    // Reset to first page if current page would be empty
    if (startIndex >= filteredUnsplit.length && unsplitItemsPage > 1) {
      setUnsplitItemsPage(1);
      return filteredUnsplit.slice(0, unsplitItemsPageSize);
    }

    return filteredUnsplit.slice(startIndex, endIndex);
  }, [unsplitItemsPage, unsplitItemsPageSize, unsplitItems]);

  const totalUnsplitPages = Math.ceil(
    unsplitItems.length / unsplitItemsPageSize
  );
  const grandTotal = useMemo(
    () => receiptItems.reduce((sum, item) => sum + item.price, 0),
    [receiptItems]
  );

  // Debounced handlers
  const debouncedUpdateEditableItem = useCallback(
    debounce((id: string, field: "name" | "price", value: string) => {
      updateEditableItem(id, field, value);
    }, 150),
    []
  );

  // Virtual list setup for receipt items
  const parentRef = useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: receiptItems.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 70, // Approximate height of each item
    overscan: 5,
  });

  // Optimized receipt items render
  const renderReceiptItems = () => (
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
          setPageSize={setPageSize}
          totalPages={totalPages}
          totalItems={receiptItems.length}
          label="Items"
        />
      )}
      {/* {receiptItems.length === 0 && (
        <p className="text-muted-foreground text-center py-4">
          No items added yet
        </p>
      )} */}
    </div>
  );

  // Generic pagination controls component
  const PaginationControls = ({
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    totalPages,
    totalItems,
    label,
  }: {
    currentPage: number;
    setCurrentPage: (page: number) => void;
    pageSize: number;
    setPageSize: (size: number) => void;
    totalPages: number;
    totalItems: number;
    label: string;
  }) => (
    <div className="flex items-center justify-between mt-4 border-t pt-4">
      <div className="flex items-center gap-2">
        <Label>Items per page:</Label>
        <Select
          value={pageSize.toString()}
          onValueChange={(value) => {
            setPageSize(Number(value));
            setCurrentPage(1);
          }}
        >
          <SelectTrigger className="w-20">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[5, 10, 20].map((size) => (
              <SelectItem key={size} value={size.toString()}>
                {size}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
        >
          Previous
        </Button>
        <span className="text-sm">
          Page {currentPage} of {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
        >
          Next
        </Button>
      </div>

      <div className="text-sm text-muted-foreground">
        {label}: {(currentPage - 1) * pageSize + 1} to{" "}
        {Math.min(currentPage * pageSize, totalItems)} of {totalItems}
      </div>
    </div>
  );

  // Add new compact pagination component
  const CompactPagination = ({
    currentPage,
    setCurrentPage,
    totalPages,
    totalItems,
  }: {
    currentPage: number;
    setCurrentPage: (page: number) => void;
    totalPages: number;
    totalItems: number;
  }) => (
    <div className="flex items-center justify-between px-2 py-1 text-sm border-t">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
        disabled={currentPage === 1}
        className="h-8 px-2"
      >
        ←
      </Button>
      <span className="text-xs text-muted-foreground">
        {currentPage} / {totalPages} ({totalItems} items)
      </span>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage === totalPages}
        className="h-8 px-2"
      >
        →
      </Button>
    </div>
  );

  // Update the split items tab content
  const renderSplitItems = () => (
    <div className="space-y-2">
      {paginatedSplitItems.map((item) => (
        <Card key={item.id}>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-lg">{item.name}</CardTitle>
                <CardDescription>${item.price.toFixed(2)}</CardDescription>
              </div>
              <Badge variant="outline">{item.splitType}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Split Type</Label>
              <Select
                value={item.splitType}
                onValueChange={(
                  value: "individual" | "equal" | "unequal" | "unsplit"
                ) => updateItemSplitType(item.id, value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unsplit">Not Split</SelectItem>
                  <SelectItem value="individual">
                    Individual (belongs to one person)
                  </SelectItem>
                  <SelectItem value="equal">Equal Split</SelectItem>
                  <SelectItem value="unequal">Unequal Split</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {item.splitType === "individual" && (
              <div>
                <Label>Assign to</Label>
                <Select
                  value={item.assignedTo || ""}
                  onValueChange={(value) =>
                    updateIndividualAssignment(item.id, value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select person" />
                  </SelectTrigger>
                  <SelectContent>
                    {people.map((person) => (
                      <SelectItem key={person.id} value={person.id}>
                        {person.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {item.splitType === "equal" && (
              <div>
                <div className="flex justify-between items-center mb-2">
                  <Label>Split equally among</Label>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => selectAllForEqualSplit(item.id, true)}
                    >
                      Select All
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => selectAllForEqualSplit(item.id, false)}
                    >
                      Clear All
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  {people.map((person) => (
                    <div
                      key={person.id}
                      className="flex items-center space-x-2"
                    >
                      <Checkbox
                        id={`equal-${item.id}-${person.id}`}
                        checked={
                          item.equalSplitPeople?.includes(person.id) || false
                        }
                        onCheckedChange={(checked) =>
                          updateEqualSplitPeople(
                            item.id,
                            person.id,
                            checked as boolean
                          )
                        }
                      />
                      <Label htmlFor={`equal-${item.id}-${person.id}`}>
                        {person.name}
                        {item.equalSplitPeople?.includes(person.id) &&
                          item.equalSplitPeople.length > 0 && (
                            <span className="ml-2 text-sm text-muted-foreground">
                              ($
                              {(
                                item.price / item.equalSplitPeople.length
                              ).toFixed(2)}
                              )
                            </span>
                          )}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {item.splitType === "unequal" && (
              <div>
                <Label>Custom amounts</Label>
                <div className="space-y-2 mt-2">
                  {people.map((person) => {
                    const currentAmount =
                      item.unequalSplit?.find(
                        (split) => split.personId === person.id
                      )?.amount || 0;
                    return (
                      <div
                        key={person.id}
                        className="flex items-center space-x-2"
                      >
                        <Label className="w-24">{person.name}</Label>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={currentAmount || ""}
                          onChange={(e) =>
                            updateUnequalSplit(
                              item.id,
                              person.id,
                              Number.parseFloat(e.target.value) || 0
                            )
                          }
                          className="w-24"
                        />
                      </div>
                    );
                  })}
                  <div className="text-sm text-muted-foreground">
                    Remaining: $
                    {(
                      item.price -
                      (item.unequalSplit?.reduce(
                        (sum, split) => sum + split.amount,
                        0
                      ) || 0)
                    ).toFixed(2)}{" "}
                    / ${item.price.toFixed(2)}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
      {receiptItems.length > 0 && (
        <PaginationControls
          currentPage={splitItemsPage}
          setCurrentPage={setSplitItemsPage}
          pageSize={splitItemsPageSize}
          setPageSize={setSplitItemsPageSize}
          totalPages={totalSplitPages}
          totalItems={receiptItems.length}
          label="Items"
        />
      )}
      {receiptItems.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground">
              No receipt items to split. Add items in the Receipt tab first.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );

  // Update the drag-split tab content
  const renderDragSplit = () => (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Unsplit Items - Take 3 columns */}
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
            {unsplitItems.length > 0 && (
              <CompactPagination
                currentPage={unsplitItemsPage}
                setCurrentPage={setUnsplitItemsPage}
                totalPages={totalUnsplitPages}
                totalItems={unsplitItems.length}
              />
            )}
          </div>
        </div>
      </div>

      {/* People Columns - Take 6 columns */}
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

      {/* Split Areas - Take 3 columns */}
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

  const validateEqualSplit = () => {
    return tempEqualSplitPeople.length > 0;
  };

  const validateUnequalSplit = () => {
    if (!draggedItem) return false;
    const totalSplit = tempUnequalSplit.reduce(
      (sum, split) => sum + split.amount,
      0
    );
    const itemTotal = Number(draggedItem.price.toFixed(2));
    return Math.abs(totalSplit - itemTotal) < 0.01;
  };

  const getSplitValidationMessage = () => {
    if (!draggedItem) return "";

    if (splitDialogType === "equal") {
      if (tempEqualSplitPeople.length === 0) {
        return "Please select at least one person";
      }
    } else {
      const totalSplit = tempUnequalSplit.reduce(
        (sum, split) => sum + split.amount,
        0
      );
      const itemTotal = Number(draggedItem.price.toFixed(2));
      if (Math.abs(totalSplit - itemTotal) >= 0.01) {
        return `Split total ($${totalSplit.toFixed(
          2
        )}) must equal item price ($${itemTotal.toFixed(2)})`;
      }
    }
    return "";
  };

  // Publish receipt
  const handlePublishReceipt = async () => {
    setIsPublishing(true);
    try {
      const id = crypto.randomUUID();
      const receiptData: SharedReceipt = {
        id,
        people,
        items: receiptItems,
        totals: calculateTotals(),
        grandTotal: receiptItems.reduce((sum, item) => sum + item.price, 0),
        createdAt: new Date().toISOString(),
      };

      const url = await publishReceipt(receiptData);
      setPublishedUrl(id);
    } catch (error) {
      console.error("Error publishing receipt:", error);
      setOcrError("Failed to publish receipt");
    } finally {
      setIsPublishing(false);
    }
  };

  // Render
  return (
    <div className="container mx-auto p-4 max-w-6xl">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Image
            src="/logo.png"
            alt="Logo"
            width={40}
            height={40}
            className="w-10 h-10 dark:invert"
          />
          <div>
            <h1 className="text-3xl font-medium tracking-tight">
              Splitwise Mini
            </h1>
          </div>
        </div>
        <ThemeToggle />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="people" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            People
          </TabsTrigger>
          <TabsTrigger value="receipt" className="flex items-center gap-2">
            <Receipt className="h-4 w-4" />
            Receipt
          </TabsTrigger>
          <TabsTrigger value="split" className="flex items-center gap-2">
            <Calculator className="h-4 w-4" />
            Split Items
          </TabsTrigger>
          <TabsTrigger value="drag-split" className="flex items-center gap-2">
            <Grip className="h-4 w-4" />
            Visual Split
          </TabsTrigger>
          <TabsTrigger value="summary" className="flex items-center gap-2">
            <Calculator className="h-4 w-4" />
            Summary
          </TabsTrigger>
        </TabsList>

        <TabsContent value="people" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Manage People</CardTitle>
              <CardDescription>
                Add people who will be splitting the bill
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Enter person's name"
                  value={newPersonName}
                  onChange={(e) => setNewPersonName(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && addPerson()}
                />
                <Button onClick={addPerson}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-2">
                {people.map((person) => (
                  <div
                    key={person.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <span className="font-medium">{person.name}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removePerson(person.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                {people.length === 0 && (
                  <p className="text-muted-foreground text-center py-4">
                    No people added yet
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="receipt" className="space-y-4">
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
                      <Label
                        htmlFor="receipt-upload"
                        className="cursor-pointer"
                      >
                        <div className="text-lg font-medium">Scan Receipt</div>
                        <div className="text-sm text-muted-foreground">
                          Upload a photo of your receipt for automatic item
                          extraction
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

              {/* OCR Error Display */}
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
                                updateEditableItem(
                                  item.id,
                                  "name",
                                  e.target.value
                                )
                              }
                              className="flex-1"
                            />
                            <Input
                              value={item.price}
                              onChange={(e) =>
                                updateEditableItem(
                                  item.id,
                                  "price",
                                  e.target.value
                                )
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
                    <Button
                      onClick={addEditableItemsToReceipt}
                      className="w-full"
                    >
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
                {/* Replace the receipt items mapping with virtualized list */}
                {renderReceiptItems()}
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
        </TabsContent>

        <TabsContent value="split" className="space-y-4">
          {renderSplitItems()}
        </TabsContent>

        <TabsContent value="drag-split" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Visual Split Interface</CardTitle>
              <CardDescription>
                Drag items from the unsplit area to people or split zones
              </CardDescription>
            </CardHeader>
            <CardContent>{renderDragSplit()}</CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="summary" className="space-y-4">
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
                          <div
                            key={index}
                            className="flex justify-between text-sm"
                          >
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
            </CardContent>
          </Card>

          {/* Publish Receipt Button - New Section */}
          <div className="flex justify-end mt-4 gap-2">
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
        </TabsContent>
      </Tabs>

      {/* Split Dialog */}
      <Dialog open={showSplitDialog} onOpenChange={setShowSplitDialog}>
        <DialogContent className="max-w-md">
          <TooltipProvider>
            <DialogHeader>
              <DialogTitle>
                {splitDialogType === "equal" ? "Equal Split" : "Custom Split"} -{" "}
                {draggedItem?.name}
              </DialogTitle>
              <DialogDescription>
                Item price: ${draggedItem?.price.toFixed(2)}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {splitDialogType === "equal" ? (
                <div>
                  <Label>Select people to split equally among:</Label>
                  <div className="space-y-2 mt-2">
                    {people.map((person) => (
                      <div
                        key={person.id}
                        className="flex items-center space-x-2"
                      >
                        <Checkbox
                          id={`temp-equal-${person.id}`}
                          checked={tempEqualSplitPeople.includes(person.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setTempEqualSplitPeople([
                                ...tempEqualSplitPeople,
                                person.id,
                              ]);
                            } else {
                              setTempEqualSplitPeople(
                                tempEqualSplitPeople.filter(
                                  (id) => id !== person.id
                                )
                              );
                            }
                          }}
                        />
                        <Label htmlFor={`temp-equal-${person.id}`}>
                          {person.name}
                          {tempEqualSplitPeople.includes(person.id) &&
                            tempEqualSplitPeople.length > 0 && (
                              <span className="ml-2 text-sm text-muted-foreground">
                                ($
                                {(
                                  (draggedItem?.price || 0) /
                                  tempEqualSplitPeople.length
                                ).toFixed(2)}
                                )
                              </span>
                            )}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div>
                  <Label>Set custom amounts for each person:</Label>
                  <div className="space-y-2 mt-2">
                    {people.map((person) => {
                      const currentAmount =
                        tempUnequalSplit.find((s) => s.personId === person.id)
                          ?.amount || 0;
                      return (
                        <div
                          key={person.id}
                          className="flex items-center space-x-2"
                        >
                          <Label className="w-20">{person.name}</Label>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            value={currentAmount || ""}
                            onChange={(e) => {
                              const amount =
                                Number.parseFloat(e.target.value) || 0;
                              setTempUnequalSplit((prev) =>
                                prev.map((split) =>
                                  split.personId === person.id
                                    ? { ...split, amount }
                                    : split
                                )
                              );
                            }}
                            className="w-24"
                          />
                        </div>
                      );
                    })}
                    <div className="text-sm text-muted-foreground">
                      Remaining: $
                      {(
                        (draggedItem?.price || 0) -
                        tempUnequalSplit.reduce(
                          (sum, split) => sum + split.amount,
                          0
                        )
                      ).toFixed(2)}{" "}
                      / ${draggedItem?.price.toFixed(2)}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={cancelSplit}>
                Cancel
              </Button>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Button
                      onClick={confirmSplit}
                      disabled={
                        splitDialogType === "equal"
                          ? !validateEqualSplit()
                          : !validateUnequalSplit()
                      }
                    >
                      Confirm Split
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{getSplitValidationMessage() || "Valid split"}</p>
                </TooltipContent>
              </Tooltip>
            </DialogFooter>
          </TooltipProvider>
        </DialogContent>
      </Dialog>
    </div>
  );
}
