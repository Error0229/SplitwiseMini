// src/components/SplitDialog.tsx

"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { Person, ReceiptItem } from "../types";

interface Props {
  open: boolean;
  onClose: () => void;
  splitDialogType: "equal" | "unequal";
  draggedItem: ReceiptItem | null;
  people: Person[];
  tempEqualSplitPeople: string[];
  setTempEqualSplitPeople: React.Dispatch<React.SetStateAction<string[]>>;
  tempUnequalSplit: { personId: string; amount: number }[];
  setTempUnequalSplit: React.Dispatch<
    React.SetStateAction<{ personId: string; amount: number }[]>
  >;
  validateEqualSplit: () => boolean;
  validateUnequalSplit: () => boolean;
  getSplitValidationMessage: () => string;
  confirmSplit: () => void;
}

const SplitDialog: React.FC<Props> = ({
  open,
  onClose,
  splitDialogType,
  draggedItem,
  people,
  tempEqualSplitPeople,
  setTempEqualSplitPeople,
  tempUnequalSplit,
  setTempUnequalSplit,
  validateEqualSplit,
  validateUnequalSplit,
  getSplitValidationMessage,
  confirmSplit,
}) => {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <TooltipProvider>
          <Tooltip>
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
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
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
            </DialogFooter>
          </Tooltip>
        </TooltipProvider>
      </DialogContent>
    </Dialog>
  );
};

export default SplitDialog;
