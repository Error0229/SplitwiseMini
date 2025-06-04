"use client";

import React, { useState, useRef, useMemo, useCallback } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";

import { Person, ReceiptItem, EditableItem, SharedReceipt } from "@/types";
import { processReceiptOCR } from "@/app/actions/ocr";
import { publishReceipt } from "@/app/actions/share";
import { get } from "lodash";

export function useMoneySplit() {
  // ─── state definitions ─────────────────────────────────────────────────
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
  const [receiptTitle, setReceiptTitle] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(
    null
  ) as React.RefObject<HTMLInputElement>;

  // ─── “People” Tab 相關函式 ────────────────────────────────────────────────
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

  const removePerson = (id: string) => {
    setPeople(people.filter((p) => p.id !== id));
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

  // ─── “Receipt” Tab 相關函式 ───────────────────────────────────────────────
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

  const removeReceiptItem = (id: string) => {
    setReceiptItems(receiptItems.filter((item) => item.id !== id));
  };

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

  const updateEditableItem = (
    id: string,
    field: "name" | "price",
    value: string
  ) => {
    setEditableItems((items) =>
      items.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

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

  const removeEditableItem = (id: string) => {
    setEditableItems((items) => items.filter((item) => item.id !== id));
  };

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

  // ─── “Split Items” Tab 相關函式 ───────────────────────────────────────────
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

  const updateIndividualAssignment = (itemId: string, personId: string) => {
    setReceiptItems((items) =>
      items.map((item) =>
        item.id === itemId
          ? { ...item, assignedTo: personId, splitType: "individual" }
          : item
      )
    );
  };

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

  // ─── “Visual Split” Tab 相關函式 ───────────────────────────────────────────
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
        setTempEqualSplitPeople(people.map((p) => p.id));
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

  // ─── “Summary” Tab 所需函式 ──────────────────────────────────────────────
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

  // ─── 分頁 & 計算函式 ─────────────────────────────────────────────────────
  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return receiptItems.slice(startIndex, endIndex);
  }, [receiptItems, currentPage, pageSize]);

  const totalPages = Math.ceil(receiptItems.length / pageSize);

  const paginatedSplitItems = useMemo(() => {
    const startIndex = (splitItemsPage - 1) * splitItemsPageSize;
    const endIndex = startIndex + splitItemsPageSize;
    return receiptItems.slice(startIndex, endIndex);
  }, [receiptItems, splitItemsPage, splitItemsPageSize]);

  const totalSplitPages = Math.ceil(receiptItems.length / splitItemsPageSize);

  const unsplitItems = useMemo(() => {
    return receiptItems.filter((item) => item.splitType === "unsplit");
  }, [receiptItems]);

  const splitItemsByPerson = useMemo(() => {
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
  }, [receiptItems, people]);

  const totalUnsplitPages = Math.ceil(
    unsplitItems.length / unsplitItemsPageSize
  );

  const paginatedUnsplitItems = useMemo(() => {
    const filteredUnsplit = unsplitItems;
    const startIndex = (unsplitItemsPage - 1) * unsplitItemsPageSize;
    const endIndex = startIndex + unsplitItemsPageSize;

    if (startIndex >= filteredUnsplit.length && unsplitItemsPage > 1) {
      setUnsplitItemsPage(1);
      return filteredUnsplit.slice(0, unsplitItemsPageSize);
    }

    return filteredUnsplit.slice(startIndex, endIndex);
  }, [unsplitItemsPage, unsplitItemsPageSize, unsplitItems]);

  const grandTotal = useMemo(
    () => receiptItems.reduce((sum, item) => sum + item.price, 0),
    [receiptItems]
  );

  const parentRef = useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: receiptItems.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 70,
    overscan: 5,
  });

  // ─── Publish Receipt ─────────────────────────────────────────────────────
  const handlePublishReceipt = async () => {
    setIsPublishing(true);
    try {
      const id = crypto.randomUUID();
      const receiptData: SharedReceipt = {
        id,
        title: receiptTitle || "Unnamed Receipt",
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

  return {
    people,
    newPersonName,
    setNewPersonName,
    addPerson,
    removePerson,
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
    splitItemsPage,
    splitItemsPageSize,
    totalSplitPages,
    paginatedSplitItems,
    setSplitItemsPage,
    setSplitItemsPageSize,
    updateItemSplitType,
    updateIndividualAssignment,
    updateEqualSplitPeople,
    selectAllForEqualSplit,
    updateUnequalSplit,
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
    resetItemToUnsplit,
    isPublishing,
    setReceiptTitle,
    handlePublishReceipt,
    publishedUrl,
    showSplitDialog,
    cancelSplit,
    splitDialogType,
    tempEqualSplitPeople,
    setTempEqualSplitPeople,
    tempUnequalSplit,
    setTempUnequalSplit,
    validateEqualSplit,
    validateUnequalSplit,
    getSplitValidationMessage,
    confirmSplit,
    activeTab,
    setActiveTab,
    calculateTotals,
    getPersonItems,
  };
}
