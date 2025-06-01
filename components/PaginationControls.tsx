// src/components/PaginationControls.tsx

import React from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Props {
  currentPage: number;
  setCurrentPage: (page: number) => void;
  pageSize: number;
  setPageSize: (size: number) => void;
  totalPages: number;
  totalItems: number;
  label: string;
}

const PaginationControls: React.FC<Props> = ({
  currentPage,
  setCurrentPage,
  pageSize,
  setPageSize,
  totalPages,
  totalItems,
  label,
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

export default PaginationControls;
