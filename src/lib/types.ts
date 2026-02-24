export interface SpendingLimits {
  perAction: number;
  daily: number;
  warnAbove: number;
}

export interface ContactRules {
  mode: 'blocklist' | 'allowlist';
  allowed: string[];
  blocked: string[];
}

export interface DomainRules {
  mode: 'blocklist' | 'allowlist';
  allowed: string[];
  blocked: string[];
}

export interface CustomRuleCondition {
  field: 'action_type' | 'target' | 'amount' | 'description';
  operator: 'equals' | 'contains' | 'greater_than' | 'less_than';
  value: string | number;
}

export interface CustomRule {
  if: CustomRuleCondition;
  then: 'block' | 'warn';
  reason: string;
}

export interface SecurityConfig {
  keyRotationMinutes: number;
  spendingLimits: SpendingLimits;
  contacts: ContactRules;
  domains: DomainRules;
  blockedActions: string[];
  customRules: CustomRule[];
}

export interface Priority {
  rank: number;
  text: string;
}

export interface AnchorConfig {
  refreshIntervalMinutes: number;
  goals: string[];
  priorities: Priority[];
  constraints: string[];
  context: string;
  goalCategories: string[];
}

export interface MonitoringConfig {
  logRetentionDays: number;
  alertOnUnverifiedTier1: boolean;
  maxActionsBeforeAnchor: number;
}

export interface CarapaceConfig {
  security: SecurityConfig;
  anchor: AnchorConfig;
  monitoring: MonitoringConfig;
}

export interface ActionLog {
  id: number;
  timestamp: string;
  session_id: string;
  action_type: string;
  target: string;
  amount: number;
  description: string;
  verdict: 'pass' | 'block' | 'warn';
  reason: string;
  key_was_valid: boolean;
  tier: number;
  created_at: string;
}

export interface LogStats {
  totalActions: number;
  sessionActions: number;
  verifiedCount: number;
  unverifiedCount: number;
  blockedCount: number;
  unverifiedTier1Count: number;
  tierBreakdown: { t1: number; t2: number; t3: number };
  dailySpend: number;
}

export type HealthStatus = 'HEALTHY' | 'WARNING' | 'ALERT';
export type DriftLevel = 'None' | 'Low' | 'Medium' | 'High';

export const ACTION_TYPES = [
  'send_message',
  'send_email',
  'make_purchase',
  'delete_file',
  'api_write',
  'install_package',
  'browse_new_domain',
  'account_change',
  'shell_command',
  'file_write',
  'calendar_modify',
] as const;

export const GOAL_CATEGORIES = [
  'email',
  'calendar',
  'productivity',
  'coding',
  'research',
  'finance',
  'communication',
  'files',
  'shopping',
  'browsing',
] as const;

export const ACTION_TYPE_LABELS: Record<string, string> = {
  send_message: 'Send Messages',
  send_email: 'Send Emails',
  make_purchase: 'Make Purchases',
  delete_file: 'Delete Files',
  api_write: 'API Writes',
  install_package: 'Install Packages',
  browse_new_domain: 'Browse New Domains',
  account_change: 'Account Changes',
  shell_command: 'Shell Commands',
  file_write: 'File Writes',
  calendar_modify: 'Calendar Modifications',
};
