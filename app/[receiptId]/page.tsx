import { notFound } from "next/navigation";
import Image from "next/image";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calculator, Receipt, Users } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { SharedReceipt } from "@/types";
import crypto from "crypto";

export const dynamic = "force-dynamic";

async function getReceipt(id: string): Promise<SharedReceipt | null> {
  try {
    const response = await fetch(
      `${process.env.BLOB_STORE_URL}/receipts/${id}.json`
    );
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

interface SharedReceiptPageProps {
  params: Promise<{ receiptId: string }>;
}

export default async function SharedReceiptPage({
  params,
}: SharedReceiptPageProps) {
  const { receiptId } = await params;
  const receipt = await getReceipt(receiptId);

  if (!receipt) {
    notFound();
  }

  const formattedDate = new Date(receipt.createdAt).toLocaleDateString();

  // Helper function to get split details for an item
  const getItemSplitDetails = (item: any) => {
    if (item.splitType === "individual") {
      const person = receipt.people.find((p) => p.id === item.assignedTo);
      return {
        type: "Individual",
        details: person ? `Assigned to ${person.name}` : "Unassigned",
        amount: item.price,
        tooltip: person ? `Full amount paid by ${person.name}` : "Unassigned",
      };
    } else if (item.splitType === "equal" && item.equalSplitPeople?.length) {
      const people = item.equalSplitPeople
        .map((id: string) => receipt.people.find((p) => p.id === id)?.name)
        .filter(Boolean);
      const splitAmount = item.price / people.length;
      return {
        type: "Equal Split",
        details: `Split equally between ${people.join(", ")}`,
        amount: splitAmount,
        people: people,
        tooltip: `Split equally between ${people.join(
          ", "
        )}\nEach pays: $${splitAmount.toFixed(2)}`,
      };
    } else if (item.splitType === "unequal" && item.unequalSplit?.length) {
      const splits = item.unequalSplit.map(
        (split: { personId: string; amount: number }) => {
          const person = receipt.people.find((p) => p.id === split.personId);
          return `${person?.name}: $${split.amount.toFixed(2)}`;
        }
      );
      return {
        type: "Custom Split",
        details: splits.join(", "),
        splits: item.unequalSplit,
        tooltip: `Custom split:\n${splits.join("\n")}`,
      };
    }
    return {
      type: "Unsplit",
      details: "Not split yet",
      amount: item.price,
      tooltip: "Item has not been split",
    };
  };

  // Add this helper function near the top of the file
  const getSplitTypeLabel = (type: string) => {
    switch (type) {
      case "individual":
        return "Paying Full Amount";
      case "equal":
        return "Equal Splits";
      case "unequal":
        return "Custom Splits";
      default:
        return "Other Items";
    }
  };

  // Add this helper function near the top of the file
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // Add these helper functions after the existing ones
  const getGravatarUrl = (name: string, size: number = 40) => {
    const hash = crypto
      .createHash("md5")
      .update(name.toLowerCase().trim())
      .digest("hex");
    return `https://www.gravatar.com/avatar/${hash}?s=${size}&d=identicon&r=PG`;
  };

  const countPersonItems = (person: any, items: any[]) => {
    return items.reduce((count, item) => {
      if (
        (item.splitType === "individual" && item.assignedTo === person.id) ||
        (item.splitType === "equal" &&
          item.equalSplitPeople?.includes(person.id)) ||
        (item.splitType === "unequal" &&
          item.unequalSplit?.some((s: any) => s.personId === person.id))
      ) {
        return count + 1;
      }
      return count;
    }, 0);
  };

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
              {receipt.title}
            </h1>
            <p className="text-sm text-muted-foreground">
              Created on {formattedDate}
            </p>
          </div>
        </div>
        <ThemeToggle />
      </div>

      <Tabs defaultValue="summary" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="summary" className="flex items-center gap-2">
            <Calculator className="h-4 w-4" />
            Summary
          </TabsTrigger>
          <TabsTrigger value="items" className="flex items-center gap-2">
            <Receipt className="h-4 w-4" />
            Items Detail
          </TabsTrigger>
          <TabsTrigger value="people" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            People Detail
          </TabsTrigger>
        </TabsList>

        <TabsContent value="summary">
          <Card>
            <CardHeader>
              <CardTitle>Quick Summary</CardTitle>
              <CardDescription>Overview of the split</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <h3 className="font-medium">Total Amount</h3>
                    <p className="text-2xl font-bold">
                      ${receipt.grandTotal.toFixed(2)}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-medium">Number of Items</h3>
                    <p className="text-2xl font-bold">{receipt.items.length}</p>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <h3 className="font-medium mb-2">People's Share</h3>
                  {receipt.people.map((person) => (
                    <div
                      key={person.id}
                      className="flex justify-between items-center py-2 border-b last:border-0"
                    >
                      <span>{person.name}</span>
                      <span className="font-medium">
                        ${receipt.totals[person.id]?.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="items">
          <Card>
            <CardHeader>
              <CardTitle>Items Breakdown</CardTitle>
              <CardDescription>
                Detailed view of how each item is split
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {receipt.items.map((item) => {
                  const splitDetails = getItemSplitDetails(item);
                  return (
                    <div key={item.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-medium">{item.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            Total: ${item.price.toFixed(2)}
                          </p>
                        </div>
                        <TooltipProvider delayDuration={150}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge>{splitDetails.type}</Badge>
                            </TooltipTrigger>
                            <TooltipContent side="right">
                              <p className="whitespace-pre-line">
                                {splitDetails.tooltip}
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <div className="text-sm space-y-1">
                        {splitDetails.type === "Equal Split" && (
                          <div className="space-y-1">
                            <p>{splitDetails.details}</p>
                            <p className="text-muted-foreground">
                              Each pays: ${splitDetails.amount?.toFixed(2)}
                            </p>
                          </div>
                        )}
                        {splitDetails.type === "Custom Split" && (
                          <div className="space-y-1">
                            {splitDetails.splits.map((split: any) => {
                              const person = receipt.people.find(
                                (p) => p.id === split.personId
                              );
                              return (
                                <p key={split.personId}>
                                  {person?.name}: ${split.amount.toFixed(2)}
                                </p>
                              );
                            })}
                          </div>
                        )}
                        {(splitDetails.type === "Individual" ||
                          splitDetails.type === "Unsplit") && (
                          <p>{splitDetails.details}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="people">
          <Card>
            <CardHeader>
              <CardTitle>People's Items</CardTitle>
              <CardDescription>What each person is paying for</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-8">
                {receipt.people.map((person) => {
                  const personItems = receipt.items.reduce((acc: any, item) => {
                    let personAmount = 0;
                    let splitType = item.splitType;

                    if (
                      item.splitType === "individual" &&
                      item.assignedTo === person.id
                    ) {
                      personAmount = item.price;
                    } else if (
                      item.splitType === "equal" &&
                      item.equalSplitPeople?.includes(person.id)
                    ) {
                      personAmount = item.price / item.equalSplitPeople.length;
                    } else if (item.splitType === "unequal") {
                      const split = item.unequalSplit?.find(
                        (s: any) => s.personId === person.id
                      );
                      if (split) personAmount = split.amount;
                    }

                    if (personAmount > 0) {
                      if (!acc[splitType]) acc[splitType] = [];
                      acc[splitType].push({ item, amount: personAmount });
                    }
                    return acc;
                  }, {});

                  const splitTypes = Object.keys(personItems);

                  return (
                    <div key={person.id} className="rounded-lg border p-6">
                      <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-3">
                          <Image
                            src={getGravatarUrl(person.name)}
                            alt={person.name}
                            width={40}
                            height={40}
                            className="rounded-full"
                          />
                          <div>
                            <h3 className="text-xl font-semibold">
                              {person.name}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              {countPersonItems(person, receipt.items)} items
                            </p>
                          </div>
                        </div>
                        <div className="text-xl font-bold">
                          ${receipt.totals[person.id]?.toFixed(2)}
                        </div>
                      </div>

                      {splitTypes.length > 0 ? (
                        <div className="space-y-6">
                          {splitTypes.map((type) => (
                            <div key={type} className="space-y-2">
                              <h4 className="font-medium text-sm text-muted-foreground mb-3">
                                {getSplitTypeLabel(type)}
                              </h4>
                              <div className="grid gap-2">
                                {personItems[type].map(
                                  ({ item, amount }: any) => (
                                    <div
                                      key={item.id}
                                      className="flex items-center justify-between py-2 px-3 bg-muted/40 rounded-md"
                                    >
                                      <div className="flex items-center gap-2">
                                        <span className="font-medium">
                                          {item.name}
                                        </span>
                                        <TooltipProvider delayDuration={150}>
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <Badge
                                                variant="outline"
                                                className="ml-2"
                                              >
                                                {type === "equal"
                                                  ? `${item.equalSplitPeople?.length} way split`
                                                  : type}
                                              </Badge>
                                            </TooltipTrigger>
                                            <TooltipContent side="right">
                                              <p className="whitespace-pre-line">
                                                {type === "equal"
                                                  ? `Total: $${item.price.toFixed(
                                                      2
                                                    )}\nPer person: $${(
                                                      item.price /
                                                      item.equalSplitPeople
                                                        ?.length
                                                    ).toFixed(
                                                      2
                                                    )}\nSplit between: ${item.equalSplitPeople
                                                      .map(
                                                        (id: string) =>
                                                          `${
                                                            receipt.people.find(
                                                              (p) => p.id === id
                                                            )?.name
                                                          }`
                                                      )
                                                      .join(", ")}`
                                                  : type === "individual"
                                                  ? `Paying full amount\nTotal: $${item.price.toFixed(
                                                      2
                                                    )}`
                                                  : `Custom split\nTotal: $${item.price.toFixed(
                                                      2
                                                    )}\nBreakdown:\n${item.unequalSplit
                                                      .map(
                                                        (split: any) =>
                                                          `• ${
                                                            receipt.people.find(
                                                              (p) =>
                                                                p.id ===
                                                                split.personId
                                                            )?.name
                                                          }: $${split.amount.toFixed(
                                                            2
                                                          )}`
                                                      )
                                                      .join("\n")}`}
                                              </p>
                                            </TooltipContent>
                                          </Tooltip>
                                        </TooltipProvider>
                                      </div>
                                      <span className="font-semibold">
                                        ${amount.toFixed(2)}
                                      </span>
                                    </div>
                                  )
                                )}
                                <div className="flex justify-between text-sm text-muted-foreground px-3">
                                  <span>
                                    Subtotal for{" "}
                                    {getSplitTypeLabel(type).toLowerCase()}
                                  </span>
                                  <span>
                                    $
                                    {personItems[type]
                                      .reduce(
                                        (sum: number, { amount }: any) =>
                                          sum + amount,
                                        0
                                      )
                                      .toFixed(2)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center text-muted-foreground py-4">
                          No items assigned
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
