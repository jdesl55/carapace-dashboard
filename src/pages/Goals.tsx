import { useState, useEffect, useCallback } from 'react';
import { X, Plus, GripVertical, Ban } from 'lucide-react';
import Card from '../components/ui/Card';
import FormLabel from '../components/ui/FormLabel';
import Toast from '../components/ui/Toast';
import { useConfig } from '../hooks/useConfig';
import type { CarapaceConfig, Priority } from '../lib/types';
import { GOAL_CATEGORIES } from '../lib/types';

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

function DraggableList({
  items,
  onReorder,
  onUpdate,
  onRemove,
  renderPrefix,
  placeholder,
}: {
  items: string[];
  onReorder: (from: number, to: number) => void;
  onUpdate: (index: number, value: string) => void;
  onRemove: (index: number) => void;
  renderPrefix?: (index: number) => React.ReactNode;
  placeholder?: string;
}) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  const handleDragStart = (i: number) => {
    setDragIndex(i);
  };

  const handleDragOver = (e: React.DragEvent, i: number) => {
    e.preventDefault();
    setOverIndex(i);
  };

  const handleDrop = (i: number) => {
    if (dragIndex !== null && dragIndex !== i) {
      onReorder(dragIndex, i);
    }
    setDragIndex(null);
    setOverIndex(null);
  };

  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div
          key={i}
          draggable
          onDragStart={() => handleDragStart(i)}
          onDragOver={(e) => handleDragOver(e, i)}
          onDrop={() => handleDrop(i)}
          onDragEnd={() => {
            setDragIndex(null);
            setOverIndex(null);
          }}
          className={`flex items-center gap-2 group transition-all duration-200 ${
            overIndex === i && dragIndex !== i
              ? 'border-t-2 border-t-carapace-red'
              : ''
          } ${dragIndex === i ? 'opacity-50' : ''}`}
        >
          <div className="cursor-grab text-carapace-text-dim hover:text-carapace-text-secondary transition-colors">
            <GripVertical className="w-4 h-4" />
          </div>
          {renderPrefix && renderPrefix(i)}
          <input
            value={item}
            onChange={(e) => onUpdate(i, e.target.value)}
            placeholder={placeholder}
            className="flex-1 bg-carapace-bg-input border border-carapace-border rounded-lg px-3 py-2.5 text-sm text-carapace-text-primary placeholder:text-carapace-text-dim input-focus-glow"
          />
          <button
            onClick={() => onRemove(i)}
            className="text-carapace-text-dim hover:text-carapace-red transition-colors opacity-0 group-hover:opacity-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}

export default function Goals() {
  const { config, loading, save } = useConfig();
  const [draft, setDraft] = useState<CarapaceConfig | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    if (config) setDraft(deepClone(config));
  }, [config]);

  const update = useCallback(
    (fn: (d: CarapaceConfig) => void) => {
      if (!draft) return;
      const next = deepClone(draft);
      fn(next);
      setDraft(next);
      setHasChanges(true);
    },
    [draft]
  );

  const handleSave = async () => {
    if (!draft) return;
    const final = deepClone(draft);
    final.anchor.priorities = final.anchor.priorities.map(
      (p: Priority, i: number) => ({
        ...p,
        rank: i + 1,
      })
    );
    await save(final);
    setHasChanges(false);
    setShowToast(true);
  };

  const reorder = (arr: unknown[], from: number, to: number) => {
    const item = arr.splice(from, 1)[0];
    arr.splice(to, 0, item);
  };

  if (loading || !draft) {
    return (
      <div className="space-y-6">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-40 bg-carapace-bg-surface rounded-xl animate-pulse-slow"
          />
        ))}
      </div>
    );
  }

  const anchor = draft.anchor;

  return (
    <div className="space-y-8 pb-24">
      <h1>Goals & Anchoring</h1>

      <Card>
        <h3 className="mb-2">Your Goals</h3>
        <p className="text-xs text-carapace-text-dim mb-4">
          What do you want your agent focused on? These are re-read to your
          agent every refresh interval.
        </p>
        <DraggableList
          items={anchor.goals}
          onReorder={(from, to) =>
            update((d) => reorder(d.anchor.goals, from, to))
          }
          onUpdate={(i, val) => update((d) => (d.anchor.goals[i] = val))}
          onRemove={(i) => update((d) => d.anchor.goals.splice(i, 1))}
          placeholder="Describe a goal..."
        />
        <button
          onClick={() => update((d) => d.anchor.goals.push(''))}
          className="flex items-center gap-1.5 mt-3 px-4 py-2 text-sm border border-carapace-border rounded-lg text-carapace-text-secondary hover:text-carapace-text-primary hover:bg-carapace-bg-raised transition-all duration-200"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Goal
        </button>
      </Card>

      <Card>
        <h3 className="mb-2">Priorities</h3>
        <p className="text-xs text-carapace-text-dim mb-4">
          Ranked from most important to least. Your agent sees these in order.
        </p>
        <DraggableList
          items={anchor.priorities.map((p) => p.text)}
          onReorder={(from, to) =>
            update((d) => reorder(d.anchor.priorities, from, to))
          }
          onUpdate={(i, val) =>
            update((d) => (d.anchor.priorities[i].text = val))
          }
          onRemove={(i) => update((d) => d.anchor.priorities.splice(i, 1))}
          renderPrefix={(i) => (
            <div className="w-7 h-7 rounded-full bg-carapace-bg-deep border border-carapace-border flex items-center justify-center flex-shrink-0">
              <span className="font-mono text-xs text-carapace-text-secondary">
                {i + 1}
              </span>
            </div>
          )}
          placeholder="Describe a priority..."
        />
        <button
          onClick={() =>
            update((d) =>
              d.anchor.priorities.push({
                rank: d.anchor.priorities.length + 1,
                text: '',
              })
            )
          }
          className="flex items-center gap-1.5 mt-3 px-4 py-2 text-sm border border-carapace-border rounded-lg text-carapace-text-secondary hover:text-carapace-text-primary hover:bg-carapace-bg-raised transition-all duration-200"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Priority
        </button>
      </Card>

      <Card redBorder>
        <h3 className="mb-2">Hard Constraints</h3>
        <p className="text-xs text-carapace-text-dim mb-4">
          Absolute rules your agent must never break, regardless of the task.
        </p>
        <DraggableList
          items={anchor.constraints}
          onReorder={(from, to) =>
            update((d) => reorder(d.anchor.constraints, from, to))
          }
          onUpdate={(i, val) =>
            update((d) => (d.anchor.constraints[i] = val))
          }
          onRemove={(i) => update((d) => d.anchor.constraints.splice(i, 1))}
          renderPrefix={() => (
            <Ban className="w-4 h-4 text-carapace-red flex-shrink-0" />
          )}
          placeholder="Define a hard constraint..."
        />
        <button
          onClick={() => update((d) => d.anchor.constraints.push(''))}
          className="flex items-center gap-1.5 mt-3 px-4 py-2 text-sm border border-carapace-border rounded-lg text-carapace-text-secondary hover:text-carapace-text-primary hover:bg-carapace-bg-raised transition-all duration-200"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Constraint
        </button>
      </Card>

      <Card>
        <h3 className="mb-2">Operating Context</h3>
        <FormLabel>
          Current context — temporary notes about what you're working on right
          now
        </FormLabel>
        <textarea
          value={anchor.context}
          onChange={(e) => update((d) => (d.anchor.context = e.target.value))}
          rows={6}
          placeholder="Optional: Describe your current situation or focus. Example: 'Preparing for Thursday board meeting. Focus on Q4 data and scheduling prep time.'"
          className="w-full bg-carapace-bg-input border border-carapace-border rounded-lg px-4 py-3 text-sm text-carapace-text-primary placeholder:text-carapace-text-dim input-focus-glow resize-none leading-relaxed"
        />
      </Card>

      <Card>
        <h3 className="mb-2">Drift Detection Categories</h3>
        <p className="text-xs text-carapace-text-dim mb-4">
          Which categories match your goals? The drift detector flags activity
          that falls outside these categories.
        </p>
        <div className="flex flex-wrap gap-2">
          {GOAL_CATEGORIES.map((cat) => {
            const active = anchor.goalCategories.includes(cat);
            return (
              <button
                key={cat}
                onClick={() =>
                  update((d) => {
                    if (active) {
                      d.anchor.goalCategories =
                        d.anchor.goalCategories.filter((c) => c !== cat);
                    } else {
                      d.anchor.goalCategories.push(cat);
                    }
                  })
                }
                className={`px-3 py-1.5 rounded-lg text-sm font-mono transition-all duration-200 ${
                  active
                    ? 'bg-[rgba(220,38,38,0.1)] border border-carapace-red text-carapace-red-hover'
                    : 'bg-carapace-bg-input border border-dashed border-carapace-border text-carapace-text-dim hover:border-carapace-border-light hover:text-carapace-text-secondary'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </Card>

      <Card>
        <h3 className="mb-2">Refresh Interval</h3>
        <FormLabel>
          How often the anchor is re-read to your agent. Lower = tighter goal
          alignment but more overhead.
        </FormLabel>
        <div className="relative max-w-xs">
          <input
            type="number"
            value={anchor.refreshIntervalMinutes}
            onChange={(e) =>
              update(
                (d) =>
                  (d.anchor.refreshIntervalMinutes = Number(e.target.value))
              )
            }
            className="w-full bg-carapace-bg-input border border-carapace-border rounded-lg px-3 py-2.5 pr-20 text-sm font-mono text-carapace-text-primary input-focus-glow"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-carapace-text-dim text-sm">
            minutes
          </span>
        </div>
      </Card>

      {hasChanges && (
        <div className="fixed bottom-0 left-60 right-0 p-4 bg-carapace-bg-deep/90 backdrop-blur border-t border-carapace-border z-40 animate-fade-in">
          <div className="max-w-[1200px] mx-auto flex justify-end">
            <button
              onClick={handleSave}
              className="px-6 py-2.5 bg-carapace-red text-white text-sm font-medium rounded-lg hover:bg-carapace-red-hover hover:shadow-red-glow transition-all duration-300"
            >
              Save Changes
            </button>
          </div>
        </div>
      )}

      <Toast
        message="Configuration saved"
        visible={showToast}
        onClose={() => setShowToast(false)}
      />
    </div>
  );
}
