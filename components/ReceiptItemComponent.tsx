// src/components/ReceiptItemComponent.tsx

import React from "react";
import { ReceiptItem } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

interface Props {
  item: ReceiptItem;
  onRemove: (id: string) => void;
}

const ReceiptItemComponent: React.FC<Props> = React.memo(
  ({ item, onRemove }) => {
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

export default ReceiptItemComponent;
