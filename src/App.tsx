import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useMemo, Suspense, useEffect } from 'react';
import { CoreApp } from '@/core';
import { CoreProvider, useAuthContext } from '@/adapters/react';
import { MockCashService } from '@/services/mock';
import { ApiAuthService } from '@/adapters/services/ApiAuthService';
import { ApiSlotService } from '@/adapters/services/ApiSlotService';
import { ConfigProvider } from './contexts/ConfigContext';
import { EnhancedConfigProvider } from './contexts/EnhancedConfigContext';
import { SystemSettingsProvider, useSystemSettings } from './contexts/SystemSettingsContext';
import { LoginPreviewPage } from './pages/LoginPreviewPage';
import { ThemedLoadingScreen } from './components/LoadingScreen';

function AppContent() {
  const { theme, isLoading: settingsLoading, getSetting } = useSystemSettings();
  const auth = useAuthContext();
  
  // 사이트 제목 동적 설정
  useEffect(() => {
    const siteName = getSetting('siteName', 'business') || 'Simple Slot';
    const siteTitle = getSetting('siteTitle', 'business') || '유연한 디자인 시스템';
    document.title = `${siteName} - ${siteTitle}`;
  }, [getSetting]);
  
  // 설정 로딩 중일 때 로딩 화면 표시
  if (settingsLoading) {
    const savedTheme = localStorage.getItem('globalTheme');
    const themeName = savedTheme ? JSON.parse(savedTheme) : 'simple';
    return <ThemedLoadingScreen theme={themeName} />;
  }


  const {
    LoginPage,
    SlotListPage,
    CashHistoryPage,
    ProfilePage,
    CashChargePage,
    AdminDashboardPage,
    AdminSlotApprovalPage,
    AdminCashApprovalPage,
    AdminUserManagePage,
    MainLayout,
    AuthLayout,
    AnnouncementPage,
    ChatTestPage,
    NotificationTestPage,
    ChatManagePage,
    AdminSystemSettingsPage,
    OperatorNotificationPage,
    NotificationHistoryPage,
    AnnouncementManagePage
  } = theme.components;

  return (
    <Routes>
      <Route
        path="/login"
        element={
          auth.isAuthenticated ? (
            <Navigate to={auth.user?.role === 'operator' ? '/admin' : '/slots'} replace />
          ) : (
            <AuthLayout>
              <LoginPage />
            </AuthLayout>
          )
        }
      />
      
      {/* 미리보기 전용 로그인 페이지 - 인증 없이 접근 가능 */}
      <Route path="/login-preview" element={<LoginPreviewPage />} />
      
      {/* 인증이 필요한 라우트들 */}
      <Route
        element={
          auth.isAuthenticated ? (
            <MainLayout>
              <></>
            </MainLayout>
          ) : (
            <Navigate to="/login" replace />
          )
        }
      >
        <Route path="/slots" element={<SlotListPage />} />
        <Route path="/cash-history" element={<CashHistoryPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/announcements" element={<AnnouncementPage />} />
        <Route path="/chat-test" element={<ChatTestPage />} />
        <Route path="/notification-test" element={<NotificationTestPage />} />
        
        {/* 관리자 라우트 */}
        <Route path="/admin" element={<AdminDashboardPage />} />
        <Route path="/admin/slots" element={<AdminSlotApprovalPage />} />
        <Route path="/admin/cash" element={<AdminCashApprovalPage />} />
        <Route path="/admin/users" element={<AdminUserManagePage />} />
        <Route path="/admin/chat" element={<ChatManagePage />} />
        <Route path="/admin/settings" element={<AdminSystemSettingsPage />} />
        <Route path="/admin/notifications" element={<OperatorNotificationPage />} />
        <Route path="/admin/notification-history" element={<NotificationHistoryPage />} />
        <Route path="/admin/announcements" element={<AnnouncementManagePage />} />
        
        <Route path="/cash" element={<CashChargePage />} />
      </Route>
      
      <Route path="/" element={
        auth.isAuthenticated ? 
          <Navigate to={auth.user?.role === 'operator' ? '/admin' : '/slots'} replace /> :
          <Navigate to="/login" replace />
      } />
    </Routes>
  );
}

function App() {
  // Core 인스턴스 생성
  const coreApp = useMemo(() => {
    const cashService = new MockCashService();
    // const useCashSystem = import.meta.env.VITE_USE_CASH_SYSTEM === 'true';
    return new CoreApp({
      authService: new ApiAuthService(), // API 기반 AuthService 사용
      cashService: cashService,
      slotService: new ApiSlotService() // API 기반 SlotService 사용
    });
  }, []);

  return (
    <Router future={{ 
      v7_startTransition: true,
      v7_relativeSplatPath: true 
    }}>
      <ConfigProvider>
        <CoreProvider coreApp={coreApp}>
          <SystemSettingsProvider>
            <EnhancedConfigProvider>
              <AppContent />
            </EnhancedConfigProvider>
          </SystemSettingsProvider>
        </CoreProvider>
      </ConfigProvider>
    </Router>
  );
}

export default App;