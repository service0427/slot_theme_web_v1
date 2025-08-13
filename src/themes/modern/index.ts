import { Theme } from '../types';
import { MainLayout } from './layouts/MainLayout';
import { AuthLayout } from './layouts/AuthLayout';
import { LoginPage } from './pages/LoginPage';
import { CashChargePage } from './pages/CashChargePage';
import { SlotListPage } from './pages/SlotListPage';
import { CashHistoryPage } from './pages/CashHistoryPage';
import { ProfilePage } from './pages/ProfilePage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { AdminSlotApprovalPage } from './pages/AdminSlotApprovalPage';
import { AdminCashApprovalPage } from './pages/AdminCashApprovalPage';
import { AdminUserManagePage } from './pages/AdminUserManagePage';
import { ChatTestPage } from './pages/ChatTestPage';
import { ChatManagePage } from './pages/ChatManagePage';
import { AdminSystemSettingsPage } from './pages/AdminSystemSettingsPage';
import { NotificationTestPage } from './pages/NotificationTestPage';
import { OperatorNotificationPage } from './pages/OperatorNotificationPage';
import { NotificationHistoryPage } from './pages/NotificationHistoryPage';
import { AnnouncementPage } from './pages/AnnouncementPage';
import { AnnouncementManagePage } from './pages/AnnouncementManagePage';
import { CashChargeForm } from './components/CashChargeForm';
import { CashChargeModal } from './components/CashChargeModal';
import { AdSlotCard } from './components/AdSlotCard';
import { UserBalance } from './components/UserBalance';
import { SimpleSpreadsheetGrid } from './components/SpreadsheetGrid';

export const modernTheme: Theme = {
  config: {
    name: 'Modern Theme',
    version: '1.0.0',
    description: '현대적이고 트렌디한 중간 단계 테마'
  },
  components: {
    // Layouts
    MainLayout,
    AuthLayout,
    
    // Pages
    LoginPage,
    CashChargePage,
    SlotListPage,
    CashHistoryPage,
    ProfilePage,
    AdminDashboardPage,
    AdminSlotApprovalPage,
    AdminCashApprovalPage,
    AdminUserManagePage,
    ChatTestPage,
    ChatManagePage,
    AdminSystemSettingsPage,
    NotificationTestPage,
    OperatorNotificationPage,
    NotificationHistoryPage,
    AnnouncementPage,
    AnnouncementManagePage,
    
    // Components
    CashChargeForm,
    CashChargeModal,
    SlotCard: AdSlotCard,
    UserBalance,
    SpreadsheetGrid: SimpleSpreadsheetGrid
  }
};