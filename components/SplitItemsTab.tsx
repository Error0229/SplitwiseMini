// src/components/SplitItemsTab.tsx

"use client";

import React from "react";
import { ReceiptItem, Person } from "../types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import PaginationControls from "./PaginationControls";

interface Props {
  receiptItems: ReceiptItem[];
  people: Person[];
  splitItemsPage: number;
  splitItemsPageSize: number;
  totalSplitPages: number;
  paginatedSplitItems: ReceiptItem[];
  setSplitItemsPage: React.Dispatch<React.SetStateAction<number>>;
  setSplitItemsPageSize: React.Dispatch<React.SetStateAction<number>>;
  updateItemSplitType: (
    itemId: string,
    splitType: "individual" | "equal" | "unequal" | "unsplit"
  ) => void;
  updateIndividualAssignment: (itemId: string, personId: string) => void;
  updateEqualSplitPeople: (
    itemId: string,
    personId: string,
    checked: boolean
  ) => void;
  selectAllForEqualSplit: (itemId: string, selectAll: boolean) => void;
  updateUnequalSplit: (
    itemId: string,
    personId: string,
    amount: number
  ) => void;
}

const SplitItemsTab: React.FC<Props> = ({
  receiptItems,
  people,
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
}) => {
  return (
    <div className="space-y-4">
      {paginatedSplitItems.length > 0 ? (
        paginatedSplitItems.map((item) => (
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
        ))
      ) : (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground">
              No receipt items to split. Add items in the Receipt tab first.
            </p>
          </CardContent>
        </Card>
      )}

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
    </div>
  );
};

export default SplitItemsTab;
