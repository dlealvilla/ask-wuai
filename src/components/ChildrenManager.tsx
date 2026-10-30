import React, { useState } from "react";
import { Plus, Trash2, Check, User } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSettings, AgeRange } from "@/contexts/SettingsContext";

interface ChildrenManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const AGE_RANGES: AgeRange[] = ["3-4", "5-6", "7-8", "9-10", "11-12"];

export const ChildrenManager: React.FC<ChildrenManagerProps> = ({
  open,
  onOpenChange,
}) => {
  const { children, activeChild, addChild, removeChild, setActiveChild, loadingChildren } = useSettings();
  const [newName, setNewName] = useState("");
  const [newAge, setNewAge] = useState<AgeRange>("5-6");
  const [isAdding, setIsAdding] = useState(false);

  const handleAddChild = async () => {
    if (!newName.trim()) return;
    setIsAdding(true);
    await addChild(newName.trim(), newAge);
    setNewName("");
    setNewAge("5-6");
    setIsAdding(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Manage Children</SheetTitle>
        </SheetHeader>
        
        <div className="mt-6 space-y-6">
          {/* Add new child - only show if under limit */}
          {children.length < 5 ? (
            <div className="p-4 bg-secondary/50 rounded-xl space-y-3">
              <h3 className="text-sm font-medium">Add a Child</h3>
              <div className="flex gap-2">
                <Input
                  placeholder="Child's name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="flex-1"
                />
                <Select value={newAge} onValueChange={(v) => setNewAge(v as AgeRange)}>
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {AGE_RANGES.map((age) => (
                      <SelectItem key={age} value={age}>
                        {age} yrs
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={handleAddChild}
                disabled={!newName.trim() || isAdding}
                size="sm"
                className="w-full"
              >
                <Plus className="w-4 h-4 mr-1" />
                {isAdding ? "Adding..." : "Add Child"}
              </Button>
            </div>
          ) : (
            <div className="p-4 bg-muted/50 rounded-xl text-center">
              <p className="text-sm text-muted-foreground">
                Maximum of 5 children reached
              </p>
            </div>
          )}

          {/* Children list */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground">
              Your Children
            </h3>
            
            {loadingChildren ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Loading...
              </p>
            ) : children.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No children added yet
              </p>
            ) : (
              <div className="space-y-2">
                {children.map((child) => (
                  <div
                    key={child.id}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-colors ${
                      activeChild?.id === child.id
                        ? "bg-primary/10 border-primary/30"
                        : "bg-card border-border hover:bg-secondary/50"
                    }`}
                  >
                    <button
                      onClick={() => setActiveChild(child)}
                      className="flex items-center gap-3 flex-1 text-left"
                    >
                      <div className="w-8 h-8 rounded-full bg-earth-sage flex items-center justify-center">
                        <User className="w-4 h-4 text-foreground" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{child.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {child.age_range} years old
                        </p>
                      </div>
                    </button>
                    <div className="flex items-center gap-2">
                      {activeChild?.id === child.id && (
                        <Check className="w-4 h-4 text-primary" />
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => removeChild(child.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {activeChild && (
            <p className="text-xs text-muted-foreground text-center">
              Questions will be saved for <strong>{activeChild.name}</strong>
            </p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
