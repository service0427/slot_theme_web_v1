import { LayoutStyles, LayoutConfig } from '@/components/base/BaseMainLayout';

// Luxury 테마의 레이아웃 스타일 설정
export const luxuryLayoutStyles: LayoutStyles = {
  container: "flex flex-col h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50",
  sidebar: "flex-shrink-0 bg-white/95 backdrop-blur-md shadow-2xl border-r border-amber-200/30",
  header: "bg-white/90 backdrop-blur-lg shadow-xl border-b border-amber-200/40 px-8 py-6",
  content: "flex-1 overflow-auto relative",
  footer: "bg-white/90 backdrop-blur-lg border-t border-amber-200/40 px-8 py-6",
  
  // 사이드바 위치별 스타일
  sidebarPositions: {
    left: "",
    right: "",
    top: "w-full border-b border-amber-200/40",
    hidden: "hidden"
  },
  
  // 사이드바 너비 설정
  sidebarWidths: {
    narrow: "w-20",
    normal: "w-72", // Luxury는 기본적으로 더 넓음
    wide: "w-96"
  },
  
  // 콘텐츠 너비 설정
  contentWidths: {
    full: "w-full",
    container: "max-w-7xl mx-auto",
    narrow: "max-w-5xl mx-auto"
  },
  
  // 콘텐츠 여백 설정
  contentPaddings: {
    none: "",
    normal: "p-8", // Luxury는 기본적으로 더 많은 여백
    large: "p-12"
  }
};

// Luxury 테마의 기본 레이아웃 설정들 (프리셋)
export const luxuryLayoutPresets = {
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
      padding: 'normal' as const,
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
      padding: 'normal' as const,
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
      padding: 'large' as const,
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
      show: true, // Luxury는 기본적으로 푸터 표시
      position: 'static' as const
    }
  }
} satisfies Record<string, LayoutConfig>;

// 기본 레이아웃 설정 (클래식)
export const luxuryDefaultLayout = luxuryLayoutPresets.classic;