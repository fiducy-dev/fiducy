import type {
  AppKeyView,
  AppSettings,
  AppView,
  CreatedApp,
  ProviderUsage,
  UsageDay,
  UsageSummary
} from '@/lib/types';
import type { SpendLimits } from '@/lib/types';
import type { ReactElement, ReactNode } from 'react';

export type AuthMode = 'sign-in' | 'sign-up';

export interface AuthFormProps {
  mode: AuthMode;
}

export interface AuthPanelProps {
  mode: AuthMode;
}

export interface AuthFrameProps {
  mode: AuthMode;
  children: ReactNode;
}

export interface Credentials {
  email: string;
  password: string;
  name: string;
}

export interface DashboardShellProps {
  activeAppID?: string;
  children: ReactNode;
}

export interface MobileMenuProps {
  activeAppID?: string;
}

export interface SidebarFooterProps {
  className?: string;
}

export interface AppNavigationProps {
  activeAppID?: string;
}

export interface AppReferenceProps {
  appID: string;
}

export interface AppProps {
  app: AppView;
}

export interface PanelProps {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  collapsible?: boolean;
  defaultOpen?: boolean;
  children: ReactNode;
}

export interface CodeBlockProps {
  code: string;
}

export interface QuietStateProps {
  title: string;
  description: string;
  action?: ReactNode;
}

export interface StatTile {
  label: string;
  value: string;
  detail: string;
  testID?: string;
}

export interface StatRowProps {
  stats: StatTile[];
}

export type UsageMetric = 'requestCount' | 'inputTokens' | 'outputTokens';

export interface UsageMetricOption {
  value: UsageMetric;
  label: string;
}

export interface UsageBarsProps {
  days: UsageDay[];
  metric: UsageMetric;
}

export interface UsageBodyProps extends UsageBarsProps {
  isTable: boolean;
}

export interface UsageTableProps {
  days: UsageDay[];
}

export interface ProviderBreakdownProps {
  providers: ProviderUsage[];
}

export interface KeyLoad {
  keyID: string;
  requestCount: number;
}

export interface KeyLoadListProps {
  usage: UsageSummary;
  monthlyLimit: number;
}

export interface KeyLimitMeterProps {
  requestCount: number;
  monthlyLimit: number;
}

export interface KeysTableProps {
  appID: string;
  keys: AppKeyView[];
  usage?: UsageSummary;
  monthlyLimit: number;
}

export interface RevokeKeyProps {
  appID: string;
  keyID: string;
}

export interface SetupStep {
  label: string;
  detail: string;
  isDone: boolean;
  target?: AppTab;
}

export interface SetupChecklistProps {
  steps: SetupStep[];
  onOpenTab: (tab: AppTab) => void;
}

export type AppTab = 'overview' | 'keys' | 'settings' | 'integration';

export interface AppTabOption {
  value: AppTab;
  label: string;
}

export interface OverviewProps {
  app: AppView;
  onOpenTab: (tab: AppTab) => void;
}

export interface SecurityRow {
  label: string;
  value: string;
  detail: string;
  isMono?: boolean;
}

export interface CopyValueProps {
  value: string;
  label: string;
}

export interface CopyButtonProps extends CopyValueProps {
  className?: string;
}

export interface AppSettingsFieldsProps {
  defaults?: AppSettings;
}

export interface SpendLimitFieldsProps {
  spendLimits?: SpendLimits;
}

export interface CreateAppFormProps {
  isPending: boolean;
  error: Error | null;
  onCreate: (settings: AppSettings) => void;
}

export interface CreatedAppNoticeProps {
  created: CreatedApp;
}

export interface CreateAppDialogProps extends CreateAppFormProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export interface ConfirmActionProps {
  trigger: ReactElement;
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
}

export interface QuickStartProps {
  appID: string;
  gatewayURL: string;
}
