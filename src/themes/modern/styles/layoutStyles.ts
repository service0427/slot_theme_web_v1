import { LayoutStyles, LayoutConfig } from '@/components/base/BaseMainLayout';

// Modern 테마의 레이아웃 스타일 설정
export const modernLayoutStyles: LayoutStyles = {
  container: "flex flex-col h-screen bg-gradient-to-br from-slate-100 via-white to-violet-50",
  sidebar: "flex-shrink-0 bg-white/90 backdrop-blur-sm shadow-lg border-r border-white/20",
  header: "bg-white/80 backdrop-blur-md shadow-sm border-b border-white/20 px-6 py-4",
  content: "flex-1 overflow-auto relative",
  footer: "bg-white/80 backdrop-blur-md border-t border-white/20 px-6 py-4",
  
  // 사이드바 위치별 스타일
  sidebarPositions: {
    left: "",
    right: "",
    top: "w-full border-b border-white/20",
    hidden: "hidden"
  },
  
  // 사이드바 너비 설정
  sidebarWidths: {
    narrow: "w-16",
    normal: "w-64", 
    wide: "w-80"
  },
  
  // 콘텐츠 너비 설정
  contentWidths: {
    full: "w-full",
    container: "max-w-7xl mx-auto",
    narrow: "max-w-4xl mx-auto"
  },
  
  // 콘텐츠 여백 설정
  contentPaddings: {
    none: "",
    normal: "p-6",
    large: "p-8"
  }
};

// Modern 테마의 기본 레이아웃 설정들 (프리셋)
export const modernLayoutPresets = {
  classic: {
    sidebar: {
      position: 'left' as const,
      width: 'normal' as const,
      collapsible: true
    },
    header: {
      type: 'static' as const,
      showBreadcrumb: false
    },
    content: {
      maxWidth: 'full' as const,
      padding: 'large' as const, // Modern은 기본적으로 더 많은 여백
      background: 'default' as const
    },
    footer: {
      show: false,
      position: 'static' as const
    }
  },
  
  modern: {
    sidebar: {
      position: 'top' as const,
      width: 'normal' as const,
      collapsible: false
    },
    header: {
      type: 'fixed' as const,
      showBreadcrumb: true
    },
    content: {
      maxWidth: 'full' as const,
      padding: 'large' as const,
      background: 'card' as const
    },
    footer: {
      show: true,
      position: 'static' as const
    }
  },
  
  minimal: {
    sidebar: {
      position: 'hidden' as const,
      width: 'normal' as const,
      collapsible: false
    },
    header: {
      type: 'hidden' as const,
      showBreadcrumb: false
    },
    content: {
      maxWidth: 'full' as const,
      padding: 'normal' as const,
      background: 'gradient' as const
    },
    footer: {
      show: false,
      position: 'static' as const
    }
  },
  
  dashboard: {
    sidebar: {
      position: 'right' as const,
      width: 'wide' as const,
      collapsible: true
    },
    header: {
      type: 'static' as const,
      showBreadcrumb: true
    },
    content: {
      maxWidth: 'full' as const,
      padding: 'normal' as const,
      background: 'default' as const
    },
    footer: {
      show: false,
      position: 'static' as const
    }
  }
} satisfies Record<string, LayoutConfig>;

// 기본 레이아웃 설정 (클래식)
export const modernDefaultLayout = modernLayoutPresets.classic;