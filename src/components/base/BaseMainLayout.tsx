import { ReactNode } from 'react';
import { Outlet } from 'react-router-dom';
import { ChatButton } from '@/components/chat/ChatButton';
import { useChatConfig } from '@/hooks/useChatConfig';
import { ToastContainer } from '@/components/toast/ToastContainer';
// import { BaseNotificationCenter } from '@/components/base/BaseNotificationCenter';
import { useNotifications } from '@/hooks/useNotifications';

// 레이아웃 설정 타입들
export interface SidebarConfig {
  position: 'left' | 'right' | 'top' | 'hidden';
  width: 'narrow' | 'normal' | 'wide';
  collapsible: boolean;
}

export interface HeaderConfig {
  type: 'fixed' | 'static' | 'hidden';
  showBreadcrumb: boolean;
}

export interface ContentConfig {
  maxWidth: 'full' | 'container' | 'narrow';
  padding: 'none' | 'normal' | 'large';
  background: 'default' | 'card' | 'gradient';
}

export interface FooterConfig {
  show: boolean;
  position: 'static' | 'fixed';
}

export interface LayoutConfig {
  sidebar: SidebarConfig;
  header: HeaderConfig;
  content: ContentConfig;
  footer: FooterConfig;
}

// 레이아웃 스타일 설정 타입
export interface LayoutStyles {
  container: string;
  sidebar: string;
  header: string;
  content: string;
  footer: string;
  // 동적 스타일 클래스들
  sidebarPositions: {
    left: string;
    right: string;
    top: string;
    hidden: string;
  };
  sidebarWidths: {
    narrow: string;
    normal: string;
    wide: string;
  };
  contentWidths: {
    full: string;
    container: string;
    narrow: string;
  };
  contentPaddings: {
    none: string;
    normal: string;
    large: string;
  };
}

// Props 타입
export interface BaseMainLayoutProps {
  config: LayoutConfig;
  styles: LayoutStyles;
  sidebarComponent?: ReactNode;
  headerComponent?: ReactNode;
  footerComponent?: ReactNode;
  children?: ReactNode;
}

// 공통 로직을 가진 베이스 MainLayout 컴포넌트
export function BaseMainLayout({
  config,
  styles,
  sidebarComponent,
  headerComponent,
  footerComponent,
  children
}: BaseMainLayoutProps) {
  const { isChatEnabled } = useChatConfig();
  const { notifications, dismiss, executeAction } = useNotifications();
  
  // 토스트에 표시할 알림만 필터링 (읽지 않은 알림 + 닫히지 않은 알림)
  const toastNotifications = notifications.filter(n => !n.readAt && !n.dismissedAt);
  // 동적 클래스명 생성
  const sidebarClasses = [
    styles.sidebar,
    styles.sidebarPositions[config.sidebar.position],
    styles.sidebarWidths[config.sidebar.width]
  ].filter(Boolean).join(' ');

  const contentClasses = [
    styles.content,
    styles.contentWidths[config.content.maxWidth],
    styles.contentPaddings[config.content.padding]
  ].filter(Boolean).join(' ');

  // 레이아웃 구조 결정
  const renderSidebar = () => {
    if (config.sidebar.position === 'hidden' || !sidebarComponent) return null;
    
    // top 포지션일 때는 aside 태그로 감싸지 않음 (TopNavigation이 이미 nav 태그를 가지고 있음)
    if (config.sidebar.position === 'top') {
      return sidebarComponent;
    }
    
    return (
      <aside className={sidebarClasses}>
        {sidebarComponent}
      </aside>
    );
  };

  const renderHeader = () => {
    if (config.header.type === 'hidden' || !headerComponent) return null;
    
    return (
      <header className={styles.header}>
        {headerComponent}
      </header>
    );
  };

  const renderFooter = () => {
    if (!config.footer.show || !footerComponent) return null;
    
    return (
      <footer className={styles.footer}>
        {footerComponent}
      </footer>
    );
  };

  const renderContent = () => (
    <main className={contentClasses}>
      {children ? (
        <>
          {children}
          <div className="relative">
            <Outlet />
          </div>
        </>
      ) : (
        <Outlet />
      )}
    </main>
  );

  // 사이드바 위치에 따른 레이아웃 구조
  if (config.sidebar.position === 'top') {
    console.log('[BaseMainLayout] Rendering TOP layout');
    console.log('[BaseMainLayout] sidebarComponent:', sidebarComponent);
    console.log('[BaseMainLayout] headerComponent:', headerComponent);
    return (
      <div className={styles.container}>
        {/* top 레이아웃에서는 headerComponent를 상단에 렌더링 */}
        {headerComponent}
        {renderContent()}
        {renderFooter()}
        {isChatEnabled() && <ChatButton />}
        <ToastContainer
          notifications={toastNotifications}
          onDismiss={dismiss}
          onAction={executeAction}
        />
      </div>
    );
  }

  if (config.sidebar.position === 'right') {
    return (
      <div className={styles.container}>
        {renderHeader()}
        <div className="flex flex-1">
          {renderContent()}
          {renderSidebar()}
        </div>
        {renderFooter()}
        {isChatEnabled() && <ChatButton />}
        <ToastContainer
          notifications={toastNotifications}
          onDismiss={dismiss}
          onAction={executeAction}
        />
      </div>
    );
  }

  // 기본: 왼쪽 사이드바 또는 숨김
  return (
    <div className={styles.container}>
      {renderHeader()}
      <div className="flex flex-1">
        {renderSidebar()}
        {renderContent()}
      </div>
      {renderFooter()}
      {isChatEnabled() && <ChatButton />}
      <ToastContainer
        notifications={notifications}
        onDismiss={dismiss}
        onAction={executeAction}
      />
    </div>
  );
}