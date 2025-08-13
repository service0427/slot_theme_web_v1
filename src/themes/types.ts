import { ReactNode } from 'react';

export interface ThemeConfig {
  name: string;
  version: string;
  description?: string;
}

export interface ThemeComponents {
  // Layouts
  MainLayout: React.ComponentType<{ children: ReactNode }>;
  AuthLayout: React.ComponentType<{ children: ReactNode }>;
  
  // Pages
  LoginPage: React.ComponentType;
  CashChargePage: React.ComponentType;
  SlotListPage: React.ComponentType;
  CashHistoryPage: React.ComponentType;
  ProfilePage: React.ComponentType;
  AdminDashboardPage: React.ComponentType;
  AdminSlotApprovalPage: React.ComponentType;
  AdminCashApprovalPage: React.ComponentType;
  AdminUserManagePage: React.ComponentType;
  AdminSystemSettingsPage: React.ComponentType;
  ChatTestPage: React.ComponentType;
  ChatManagePage: React.ComponentType;
  NotificationTestPage: React.ComponentType;
  OperatorNotificationPage: React.ComponentType;
  NotificationHistoryPage: React.ComponentType;
  AnnouncementPage: React.ComponentType;
  AnnouncementManagePage: React.ComponentType;
  RankingPage: React.ComponentType;
  SlotBulkRegistrationPage: React.ComponentType;
  
  // Components
  CashChargeForm: React.ComponentType<{ onSubmit: (data: any) => void }>;
  CashChargeModal: React.ComponentType<{ isOpen: boolean; onClose: () => void }>;
  SlotCard: React.ComponentType<{ slot: any }>;
  UserBalance: React.ComponentType<{ balance: number }>;
  SpreadsheetGrid: React.ComponentType<any>;
}

export interface Theme {
  config: ThemeConfig;
  components: ThemeComponents;
}