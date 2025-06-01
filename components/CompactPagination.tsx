// src/components/CompactPagination.tsx

import React from "react";
import { Button } from "@/components/ui/button";

interface Props {
  currentPage: number;
  setCurrentPage: (page: number) => void;
  totalPages: number;
  totalItems: number;
}

const CompactPagination: React.FC<Props> = ({
  currentPage,
  setCurrentPage,
  totalPages,
  totalItems,
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

export default CompactPagination;
