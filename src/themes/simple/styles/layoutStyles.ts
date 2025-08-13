import { LayoutStyles, LayoutConfig } from '@/components/base/BaseMainLayout';

// Simple 테마의 레이아웃 스타일 설정
export const simpleLayoutStyles: LayoutStyles = {
  container: "flex flex-col h-screen bg-gray-50",
  sidebar: "flex-shrink-0 bg-white shadow-sm border-r border-gray-200",
  header: "bg-white shadow-sm border-b border-gray-200 px-6 py-4",
  content: "flex-1 overflow-auto bg-gray-50",
  footer: "bg-white border-t border-gray-200 px-6 py-4",
  
  // 사이드바 위치별 스타일
  sidebarPositions: {
    left: "",
    right: "",
    top: "w-full border-b border-gray-200",
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

// Simple 테마의 기본 레이아웃 설정들 (프리셋)
export const simpleLayoutPresets = {
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
      padding: 'none' as const,
      background: 'default' as const
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
export const simpleDefaultLayout = simpleLayoutPresets.classic;