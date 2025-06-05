// src/page.tsx

"use client";

import debounce from "lodash/debounce";
import PeopleTab from "@/components/PeopleTab";
import ReceiptTab from "@/components/ReceiptTab";
import SplitItemsTab from "@/components/SplitItemsTab";
import DragSplitTab from "@/components/DragSplitTab";
import SummaryTab from "@/components/SummaryTab";
import SplitDialog from "@/components/SplitDialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Grip, Users, Receipt, Calculator } from "lucide-react";

import { useMoneySplit } from "@/hooks/use-money-split";

export default function MoneySplitApp() {
  const ms = useMoneySplit();

  return (
    <div className="container mx-auto p-4 max-w-6xl">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="Logo" className="w-10 h-10 dark:invert" />
          <div>
            <h1 className="text-3xl font-medium tracking-tight">
              Splitwise Mini
            </h1>
          </div>
        </div>
        <ThemeToggle />
      </div>

      <Tabs
        value={ms.activeTab}
        onValueChange={ms.setActiveTab}
        className="w-full"
      >
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

        {/* People Tab */}
        <TabsContent value="people" className="space-y-4">
          <PeopleTab
            people={ms.people}
            newPersonName={ms.newPersonName}
            setNewPersonName={ms.setNewPersonName}
            addPerson={ms.addPerson}
            removePerson={ms.removePerson}
          />
        </TabsContent>

        {/* Receipt Tab */}
        <TabsContent value="receipt" className="space-y-4">
          <ReceiptTab
            people={ms.people}
            receiptItems={ms.receiptItems}
            editableItems={ms.editableItems}
            newItemName={ms.newItemName}
            newItemPrice={ms.newItemPrice}
            selectedLanguage={ms.selectedLanguage}
            isProcessingOCR={ms.isProcessingOCR}
            ocrError={ms.ocrError}
            ocrSuccess={ms.ocrSuccess}
            receiptTitle={ms.receiptTitle}
            grandTotal={ms.grandTotal}
            currentPage={ms.currentPage}
            pageSize={ms.pageSize}
            totalPages={ms.totalPages}
            paginatedItems={ms.paginatedItems}
            fileInputRef={ms.fileInputRef}
            setSelectedLanguage={ms.setSelectedLanguage}
            // handleReceiptUpload={ms.handleReceiptUpload}
            handleReceiptUpload={ms.handleReceiptUploadWithGPT}
            exportData={ms.exportData}
            importData={ms.importData}
            updateEditableItem={debounce(ms.updateEditableItem, 150)}
            startEditingItem={ms.startEditingItem}
            saveEditableItem={ms.saveEditableItem}
            removeEditableItem={ms.removeEditableItem}
            addEditableItemsToReceipt={ms.addEditableItemsToReceipt}
            addReceiptItem={ms.addReceiptItem}
            removeReceiptItem={ms.removeReceiptItem}
            setNewItemName={ms.setNewItemName}
            setNewItemPrice={ms.setNewItemPrice}
            setCurrentPage={ms.setCurrentPage}
          />
        </TabsContent>

        {/* Split Items Tab */}
        <TabsContent value="split" className="space-y-4">
          <SplitItemsTab
            receiptItems={ms.receiptItems}
            people={ms.people}
            splitItemsPage={ms.splitItemsPage}
            splitItemsPageSize={ms.splitItemsPageSize}
            totalSplitPages={ms.totalSplitPages}
            paginatedSplitItems={ms.paginatedSplitItems}
            setSplitItemsPage={ms.setSplitItemsPage}
            setSplitItemsPageSize={ms.setSplitItemsPageSize}
            updateItemSplitType={ms.updateItemSplitType}
            updateIndividualAssignment={ms.updateIndividualAssignment}
            updateEqualSplitPeople={ms.updateEqualSplitPeople}
            selectAllForEqualSplit={ms.selectAllForEqualSplit}
            updateUnequalSplit={ms.updateUnequalSplit}
          />
        </TabsContent>

        {/* Drag-Split Tab */}
        <TabsContent value="drag-split" className="space-y-4">
          <DragSplitTab
            people={ms.people}
            totals={ms.calculateTotals()}
            unsplitItems={ms.unsplitItems}
            splitItemsByPerson={ms.splitItemsByPerson}
            paginatedUnsplitItems={ms.paginatedUnsplitItems}
            unsplitItemsPage={ms.unsplitItemsPage}
            totalUnsplitPages={ms.totalUnsplitPages}
            setUnsplitItemsPage={ms.setUnsplitItemsPage}
            draggedItem={ms.draggedItem}
            handleDragStart={ms.handleDragStart}
            handleDropOnPerson={ms.handleDropOnPerson}
            handleDropOnSplitArea={ms.handleDropOnSplitArea}
            unsplitItemsCount={ms.unsplitItems.length}
            resetItemToUnsplit={ms.resetItemToUnsplit}
          />
        </TabsContent>

        {/* Summary Tab */}
        <TabsContent value="summary" className="space-y-4">
          <SummaryTab
            people={ms.people}
            totals={ms.calculateTotals()}
            grandTotal={ms.grandTotal}
            getPersonItems={ms.getPersonItems}
            unsplitItems={ms.unsplitItems}
            receiptTitle={ms.receiptTitle}
            isPublishing={ms.isPublishing}
            setReceiptTitle={ms.setReceiptTitle}
            handlePublishReceipt={ms.handlePublishReceipt}
            publishedUrl={ms.publishedUrl}
          />
        </TabsContent>
      </Tabs>

      {/* Split Dialog (全域掛載) */}
      <SplitDialog
        open={ms.showSplitDialog}
        onClose={ms.cancelSplit}
        splitDialogType={ms.splitDialogType}
        draggedItem={ms.draggedItem}
        people={ms.people}
        tempEqualSplitPeople={ms.tempEqualSplitPeople}
        setTempEqualSplitPeople={ms.setTempEqualSplitPeople}
        tempUnequalSplit={ms.tempUnequalSplit}
        setTempUnequalSplit={ms.setTempUnequalSplit}
        validateEqualSplit={ms.validateEqualSplit}
        validateUnequalSplit={ms.validateUnequalSplit}
        getSplitValidationMessage={ms.getSplitValidationMessage}
        confirmSplit={ms.confirmSplit}
      />
    </div>
  );
}
