import { notFound } from "next/navigation";
import { SharedReceipt } from "../actions/share";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Separator } from "@/components/ui/separator";

export const dynamic = "force-dynamic";

async function getReceipt(id: string): Promise<SharedReceipt | null> {
  try {
    const response = await fetch(`receipts/${id}.json`);
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

export default async function SharedReceiptPage({
  params,
}: {
  params: { receiptId: string };
}) {
  const receipt = await getReceipt(params.receiptId);

  if (!receipt) {
    notFound();
  }

  const formattedDate = new Date(receipt.createdAt).toLocaleDateString();

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
              Shared Receipt
            </h1>
            <p className="text-sm text-muted-foreground">
              Created on {formattedDate}
            </p>
          </div>
        </div>
        <ThemeToggle />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Split Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {receipt.people.map((person) => (
              <div key={person.id}>
                <div className="flex justify-between items-center p-3 border rounded-lg">
                  <span className="font-medium">{person.name}</span>
                  <span className="font-semibold text-lg">
                    ${receipt.totals[person.id]?.toFixed(2) || "0.00"}
                  </span>
                </div>
              </div>
            ))}

            <Separator />

            <div className="flex justify-between items-center text-lg font-semibold">
              <span>Total Receipt Amount:</span>
              <span>${receipt.grandTotal.toFixed(2)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Receipt Items</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {receipt.items.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium">{item.name}</span>
                  <span className="text-muted-foreground">
                    ${item.price.toFixed(2)}
                  </span>
                  <Badge
                    variant={
                      item.splitType === "unsplit" ? "destructive" : "default"
                    }
                  >
                    {item.splitType === "unsplit"
                      ? "Not Split"
                      : item.splitType}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
