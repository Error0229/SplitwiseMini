// src/components/PeopleTab.tsx

"use client";

import React from "react";
import { Person } from "../types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Trash2, Plus } from "lucide-react";
import { Label } from "@/components/ui/label";

interface Props {
  people: Person[];
  newPersonName: string;
  setNewPersonName: React.Dispatch<React.SetStateAction<string>>;
  addPerson: () => void;
  removePerson: (id: string) => void;
}

const PeopleTab: React.FC<Props> = ({
  people,
  newPersonName,
  setNewPersonName,
  addPerson,
  removePerson,
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Manage People</CardTitle>
        <CardDescription>
          Add people who will be splitting the bill
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="Enter person's name"
            value={newPersonName}
            onChange={(e) => setNewPersonName(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && addPerson()}
          />
          <Button onClick={addPerson}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-2">
          {people.map((person) => (
            <div
              key={person.id}
              className="flex items-center justify-between p-3 border rounded-lg"
            >
              <span className="font-medium">{person.name}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => removePerson(person.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          {people.length === 0 && (
            <p className="text-muted-foreground text-center py-4">
              No people added yet
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default PeopleTab;
