export interface Person {
    id: string;
    name: string;
}

export interface ReceiptItem {
    id: string;
    name: string;
    price: number;
    splitType: "individual" | "equal" | "unequal" | "unsplit";
    assignedTo?: string;
    equalSplitPeople?: string[];
    unequalSplit?: { personId: string; amount: number }[];
}

export interface EditableItem {
    id: string;
    name: string;
    price: string;
    isEditing: boolean;
}
