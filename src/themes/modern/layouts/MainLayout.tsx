import { ReactNode } from 'react';
import { BaseMainLayout } from '@/components/base/BaseMainLayout';
import { modernLayoutStyles } from '../styles/layoutStyles';
import { simpleLayoutStyles as simpleStyles } from '@/themes/simple/styles/layoutStyles';
import { modernLayoutStyles as modernStyles } from '@/themes/modern/styles/layoutStyles';
import { luxuryLayoutStyles as luxuryStyles } from '@/themes/luxury/styles/layoutStyles';
import { Sidebar } from './Sidebar';
import { TopNavigation } from './TopNavigation';
import { FloatingMenu } from './FloatingMenu';
import { NotificationCenter } from '../components/NotificationCenter';
import { AnnouncementBar } from '../components/AnnouncementBar';
import { useSystemSettings } from '@/contexts/SystemSettingsContext';

interface MainLayoutProps {
  children?: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const { getLayoutConfig, currentTheme, currentLayout } = useSystemSettings();
  const config = getLayoutConfig();
  
  
  // 현재 테마에 맞는 스타일 선택
  const layoutStyles = currentTheme === 'modern' ? modernStyles 
    : currentTheme === 'luxury' ? luxuryStyles 
    : simpleStyles;
  
  // 레이아웃에 따라 다른 컴포넌트 사용
  // top 포지션일 때는 사이드바 컴포넌트를 null로 설정
  const navigationComponent = config.sidebar.position === 'top' 
    ? null  // top일 때는 사이드바 자리에 아무것도 렌더링하지 않음
    : config.sidebar.position === 'hidden'
    ? null  // BaseMainLayout이 null을 받으면 사이드바를 렌더링하지 않음
    : <Sidebar />;
  
  // top 포지션일 때 상단에 표시할 네비게이션
  const topNavigationComponent = config.sidebar.position === 'top' 
    ? <TopNavigation />
    : null;
  
  return (
    <>
      <BaseMainLayout
        config={config}
        styles={layoutStyles}
        sidebarComponent={navigationComponent}
        headerComponent={topNavigationComponent}
      >
        {/* 공지사항 바를 children으로 전달 */}
        <AnnouncementBar />
        {children}
      </BaseMainLayout>
      {/* 미니멀 레이아웃일 때 플로팅 메뉴 표시 */}
      {config.sidebar.position === 'hidden' && <FloatingMenu />}
      {/* Modern 테마 전용 알림 센터 */}
      <NotificationCenter />
    </>
  );
}