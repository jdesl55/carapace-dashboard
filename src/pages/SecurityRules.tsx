import { useState, useEffect, useCallback } from 'react';
import { X, Plus, ChevronDown, ChevronRight } from 'lucide-react';
import Card from '../components/ui/Card';
import FormLabel from '../components/ui/FormLabel';
import Toast from '../components/ui/Toast';
import { useConfig } from '../hooks/useConfig';
import type { CarapaceConfig, CustomRule } from '../lib/types';
import { ACTION_TYPES, ACTION_TYPE_LABELS } from '../lib/types';

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

export default function SecurityRules() {
  const { config, loading, save } = useConfig();
  const [draft, setDraft] = useState<CarapaceConfig | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [displayPerAction, setDisplayPerAction] = useState('');
  const [displayDaily, setDisplayDaily] = useState('');
  const [displayWarnAbove, setDisplayWarnAbove] = useState('');
  const [displayKeyRotation, setDisplayKeyRotation] = useState('');

  useEffect(() => {
    if (config) setDraft(deepClone(config));
  }, [config]);

  useEffect(() => {
    if (draft) {
      setDisplayPerAction(String(draft.security.spendingLimits.perAction));
      setDisplayDaily(String(draft.security.spendingLimits.daily));
      setDisplayWarnAbove(String(draft.security.spendingLimits.warnAbove));
      setDisplayKeyRotation(String(draft.security.keyRotationMinutes));
    }
  }, [draft?.security.spendingLimits.perAction, draft?.security.spendingLimits.daily, draft?.security.spendingLimits.warnAbove, draft?.security.keyRotationMinutes]);

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
    await save(draft);
    setHasChanges(false);
    setShowToast(true);
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

  const sec = draft.security;

  return (
    <div className="space-y-8 pb-24">
      <h1>Security Rules</h1>

      <Card>
        <h3 className="mb-4">Spending Limits</h3>
        <div className="grid grid-cols-3 gap-6">
          <div>
            <FormLabel>Maximum amount for a single transaction</FormLabel>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-carapace-text-dim font-mono text-sm">
                $
              </span>
              <input
                type="number"
                min={0}
                value={displayPerAction}
                onChange={(e) => {
                  setDisplayPerAction(e.target.value);
                  setHasChanges(true);
                }}
                onBlur={() => {
                  const val = displayPerAction === '' ? 0 : Number(displayPerAction);
                  if (isNaN(val)) { setDisplayPerAction(String(sec.spendingLimits.perAction)); return; }
                  update((d) => {
                    const limits = d.security.spendingLimits;
                    limits.perAction = Math.min(val, limits.daily);
                    limits.warnAbove = Math.min(limits.warnAbove, limits.perAction);
                  });
                }}
                className="w-full bg-carapace-bg-input border border-carapace-border rounded-lg px-3 py-2.5 pl-7 text-sm font-mono text-carapace-text-primary placeholder:text-carapace-text-dim input-focus-glow"
              />
            </div>
            <p className="text-xs text-carapace-text-dim mt-1">Must be ≤ daily limit</p>
          </div>
          <div>
            <FormLabel>Maximum total spending per day</FormLabel>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-carapace-text-dim font-mono text-sm">
                $
              </span>
              <input
                type="number"
                min={0}
                value={displayDaily}
                onChange={(e) => {
                  setDisplayDaily(e.target.value);
                  setHasChanges(true);
                }}
                onBlur={() => {
                  const val = displayDaily === '' ? 0 : Number(displayDaily);
                  if (isNaN(val)) { setDisplayDaily(String(sec.spendingLimits.daily)); return; }
                  update((d) => {
                    const limits = d.security.spendingLimits;
                    limits.daily = val;
                    limits.perAction = Math.min(limits.perAction, limits.daily);
                    limits.warnAbove = Math.min(limits.warnAbove, limits.perAction);
                  });
                }}
                className="w-full bg-carapace-bg-input border border-carapace-border rounded-lg px-3 py-2.5 pl-7 text-sm font-mono text-carapace-text-primary placeholder:text-carapace-text-dim input-focus-glow"
              />
            </div>
          </div>
          <div>
            <FormLabel>
              Ask for confirmation (but don't block)
            </FormLabel>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-carapace-text-dim font-mono text-sm">
                $
              </span>
              <input
                type="number"
                min={0}
                value={displayWarnAbove}
                onChange={(e) => {
                  setDisplayWarnAbove(e.target.value);
                  setHasChanges(true);
                }}
                onBlur={() => {
                  const val = displayWarnAbove === '' ? 0 : Number(displayWarnAbove);
                  if (isNaN(val)) { setDisplayWarnAbove(String(sec.spendingLimits.warnAbove)); return; }
                  update((d) => {
                    const limits = d.security.spendingLimits;
                    limits.warnAbove = Math.min(val, limits.perAction);
                  });
                }}
                className="w-full bg-carapace-bg-input border border-carapace-border rounded-lg px-3 py-2.5 pl-7 text-sm font-mono text-carapace-text-primary placeholder:text-carapace-text-dim input-focus-glow"
              />
            </div>
            <p className="text-xs text-carapace-text-dim mt-1">Must be ≤ per-action limit</p>
          </div>
        </div>
      </Card>

      <ListRulesCard
        title="Contact Rules"
        mode={sec.contacts.mode}
        items={
          sec.contacts.mode === 'blocklist'
            ? sec.contacts.blocked
            : sec.contacts.allowed
        }
        onModeChange={(mode) =>
          update((d) => (d.security.contacts.mode = mode))
        }
        onItemsChange={(items) =>
          update((d) => {
            if (d.security.contacts.mode === 'blocklist') {
              d.security.contacts.blocked = items;
            } else {
              d.security.contacts.allowed = items;
            }
          })
        }
        emptyBlocklist="No contacts configured. Your agent can message anyone."
        emptyAllowlist="No contacts configured. Your agent cannot message anyone."
        placeholder="email@example.com"
      />

      <ListRulesCard
        title="Domain Rules"
        mode={sec.domains.mode}
        items={
          sec.domains.mode === 'blocklist'
            ? sec.domains.blocked
            : sec.domains.allowed
        }
        onModeChange={(mode) =>
          update((d) => (d.security.domains.mode = mode))
        }
        onItemsChange={(items) =>
          update((d) => {
            if (d.security.domains.mode === 'blocklist') {
              d.security.domains.blocked = items;
            } else {
              d.security.domains.allowed = items;
            }
          })
        }
        emptyBlocklist="No domains configured. Your agent can browse anywhere."
        emptyAllowlist="No domains configured. Your agent cannot browse any domains."
        placeholder="example.com"
      />

      <Card>
        <h3 className="mb-2">Blocked Action Types</h3>
        <p className="text-xs text-carapace-text-dim mb-4">
          Disabled action types — your agent cannot perform these under any
          circumstances
        </p>
        <div className="grid grid-cols-2 gap-3">
          {ACTION_TYPES.map((type) => {
            const blocked = sec.blockedActions.includes(type);
            return (
              <button
                key={type}
                onClick={() =>
                  update((d) => {
                    if (blocked) {
                      d.security.blockedActions =
                        d.security.blockedActions.filter((a) => a !== type);
                    } else {
                      d.security.blockedActions.push(type);
                    }
                  })
                }
                className={`flex items-center justify-between px-4 py-3 rounded-lg border transition-all duration-200 text-sm text-left ${
                  blocked
                    ? 'bg-carapace-red-dim border-carapace-red text-carapace-red-hover'
                    : 'bg-carapace-bg-input border-carapace-border text-carapace-text-secondary hover:border-carapace-border-light'
                }`}
              >
                <span>{ACTION_TYPE_LABELS[type]}</span>
                <div
                  className={`w-10 h-5 rounded-full flex items-center transition-all duration-200 ${
                    blocked ? 'bg-carapace-red justify-end' : 'bg-carapace-bg-deep justify-start'
                  }`}
                >
                  <div className="w-4 h-4 rounded-full bg-carapace-text-primary mx-0.5" />
                </div>
              </button>
            );
          })}
        </div>
      </Card>

      <div>
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-2 text-sm text-carapace-text-secondary hover:text-carapace-text-primary transition-colors duration-200 mb-4"
        >
          {showAdvanced ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
          Show Advanced Rules
        </button>

        {showAdvanced && (
          <Card>
            <h3 className="mb-4">Custom Rules</h3>
            {sec.customRules.length === 0 ? (
              <p className="text-sm text-carapace-text-dim mb-4">
                No custom rules configured.
              </p>
            ) : (
              <div className="space-y-3 mb-4">
                {sec.customRules.map((rule, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between bg-carapace-bg-input border border-carapace-border rounded-lg px-4 py-3"
                  >
                    <span className="text-sm text-carapace-text-secondary">
                      If{' '}
                      <span className="font-mono text-carapace-text-primary">
                        {rule.if.field}
                      </span>{' '}
                      {rule.if.operator.replace('_', ' ')}{' '}
                      <span className="font-mono text-carapace-text-primary">
                        {String(rule.if.value)}
                      </span>{' '}
                      →{' '}
                      <span
                        className={
                          rule.then === 'block'
                            ? 'text-carapace-red'
                            : 'text-carapace-yellow'
                        }
                      >
                        {rule.then}
                      </span>
                      : {rule.reason}
                    </span>
                    <button
                      onClick={() =>
                        update((d) => d.security.customRules.splice(i, 1))
                      }
                      className="ml-3 text-carapace-text-dim hover:text-carapace-red transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <AddCustomRuleForm
              onAdd={(rule) =>
                update((d) => d.security.customRules.push(rule))
              }
            />
          </Card>
        )}
      </div>

      <Card>
        <h3 className="mb-2">Key Rotation Interval</h3>
        <FormLabel>
          How often the security verification key rotates. Lower = more secure
          but more frequent verification.
        </FormLabel>
        <div className="relative max-w-xs">
          <input
            type="number"
            min={0}
            value={displayKeyRotation}
            onChange={(e) => {
              setDisplayKeyRotation(e.target.value);
              setHasChanges(true);
            }}
            onBlur={() => {
              const val = displayKeyRotation === '' ? 30 : Number(displayKeyRotation);
              if (isNaN(val)) { setDisplayKeyRotation(String(sec.keyRotationMinutes)); return; }
              update((d) => { d.security.keyRotationMinutes = val; });
            }}
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

function ListRulesCard({
  title,
  mode,
  items,
  onModeChange,
  onItemsChange,
  emptyBlocklist,
  emptyAllowlist,
  placeholder,
}: {
  title: string;
  mode: 'blocklist' | 'allowlist';
  items: string[];
  onModeChange: (mode: 'blocklist' | 'allowlist') => void;
  onItemsChange: (items: string[]) => void;
  emptyBlocklist: string;
  emptyAllowlist: string;
  placeholder: string;
}) {
  const [newItem, setNewItem] = useState('');

  const addItem = () => {
    if (!newItem.trim()) return;
    onItemsChange([...items, newItem.trim()]);
    setNewItem('');
  };

  return (
    <Card>
      <h3 className="mb-4">{title}</h3>
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => onModeChange('blocklist')}
          className={`px-4 py-2 text-sm rounded-lg border transition-all duration-200 ${
            mode === 'blocklist'
              ? 'bg-carapace-bg-raised border-carapace-border-light text-carapace-text-primary'
              : 'border-carapace-border text-carapace-text-dim hover:text-carapace-text-secondary'
          }`}
        >
          Blocklist Mode
        </button>
        <button
          onClick={() => onModeChange('allowlist')}
          className={`px-4 py-2 text-sm rounded-lg border transition-all duration-200 ${
            mode === 'allowlist'
              ? 'bg-carapace-bg-raised border-carapace-border-light text-carapace-text-primary'
              : 'border-carapace-border text-carapace-text-dim hover:text-carapace-text-secondary'
          }`}
        >
          Allowlist Mode
        </button>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-carapace-text-dim mb-4">
          {mode === 'blocklist' ? emptyBlocklist : emptyAllowlist}
        </p>
      ) : (
        <div className="space-y-2 mb-4">
          {items.map((item, i) => (
            <div
              key={i}
              className="flex items-center gap-2 bg-carapace-bg-input border border-carapace-border rounded-lg px-3 py-2"
            >
              <span className="flex-1 font-mono text-sm text-carapace-text-primary">
                {item}
              </span>
              <button
                onClick={() =>
                  onItemsChange(items.filter((_, idx) => idx !== i))
                }
                className="text-carapace-text-dim hover:text-carapace-red transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <input
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addItem()}
          placeholder={placeholder}
          className="flex-1 bg-carapace-bg-input border border-carapace-border rounded-lg px-3 py-2 text-sm font-mono text-carapace-text-primary placeholder:text-carapace-text-dim input-focus-glow"
        />
        <button
          onClick={addItem}
          className="flex items-center gap-1.5 px-4 py-2 text-sm border border-carapace-border rounded-lg text-carapace-text-primary hover:bg-carapace-bg-raised transition-all duration-200"
        >
          <Plus className="w-3.5 h-3.5" />
          Add
        </button>
      </div>
    </Card>
  );
}

function AddCustomRuleForm({
  onAdd,
}: {
  onAdd: (rule: CustomRule) => void;
}) {
  const [field, setField] = useState<CustomRule['if']['field']>('action_type');
  const [operator, setOperator] =
    useState<CustomRule['if']['operator']>('equals');
  const [value, setValue] = useState('');
  const [then, setThen] = useState<CustomRule['then']>('block');
  const [reason, setReason] = useState('');

  const handleAdd = () => {
    if (!value.trim() || !reason.trim()) return;
    const parsedValue =
      operator === 'greater_than' || operator === 'less_than'
        ? Number(value)
        : value;
    onAdd({
      if: { field, operator, value: parsedValue },
      then,
      reason: reason.trim(),
    });
    setValue('');
    setReason('');
  };

  const selectClass =
    'bg-carapace-bg-input border border-carapace-border rounded-lg px-3 py-2 text-sm text-carapace-text-primary input-focus-glow appearance-none';

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div>
        <FormLabel>Field</FormLabel>
        <select
          value={field}
          onChange={(e) => setField(e.target.value as CustomRule['if']['field'])}
          className={selectClass}
        >
          <option value="action_type">action_type</option>
          <option value="target">target</option>
          <option value="amount">amount</option>
          <option value="description">description</option>
        </select>
      </div>
      <div>
        <FormLabel>Operator</FormLabel>
        <select
          value={operator}
          onChange={(e) =>
            setOperator(e.target.value as CustomRule['if']['operator'])
          }
          className={selectClass}
        >
          <option value="equals">equals</option>
          <option value="contains">contains</option>
          <option value="greater_than">greater_than</option>
          <option value="less_than">less_than</option>
        </select>
      </div>
      <div>
        <FormLabel>Value</FormLabel>
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Value"
          className="bg-carapace-bg-input border border-carapace-border rounded-lg px-3 py-2 text-sm font-mono text-carapace-text-primary placeholder:text-carapace-text-dim input-focus-glow w-32"
        />
      </div>
      <div>
        <FormLabel>Action</FormLabel>
        <select
          value={then}
          onChange={(e) => setThen(e.target.value as CustomRule['then'])}
          className={selectClass}
        >
          <option value="block">Block</option>
          <option value="warn">Warn</option>
        </select>
      </div>
      <div className="flex-1 min-w-[200px]">
        <FormLabel>Reason</FormLabel>
        <input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reason for this rule"
          className="w-full bg-carapace-bg-input border border-carapace-border rounded-lg px-3 py-2 text-sm text-carapace-text-primary placeholder:text-carapace-text-dim input-focus-glow"
        />
      </div>
      <button
        onClick={handleAdd}
        className="flex items-center gap-1.5 px-4 py-2 text-sm border border-carapace-border rounded-lg text-carapace-text-primary hover:bg-carapace-bg-raised transition-all duration-200"
      >
        <Plus className="w-3.5 h-3.5" />
        Add Rule
      </button>
    </div>
  );
}
