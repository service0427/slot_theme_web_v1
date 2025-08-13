import React from 'react';

export function LoadingScreen() {
  return (
    <div className="fixed inset-0 bg-gradient-to-br from-violet-100 to-indigo-200 flex items-center justify-center z-50">
      <div className="text-center">
        {/* 로딩 스피너 */}
        <div className="relative w-20 h-20 mx-auto mb-4">
          <div className="absolute inset-0 border-4 border-white/30 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
        </div>
        
        {/* 로딩 텍스트 */}
        <div className="text-white font-medium text-lg">
          로딩 중...
        </div>
      </div>
    </div>
  );
}

// 테마별 로딩 스크린
export function ThemedLoadingScreen({ theme }: { theme?: string }) {
  const getThemeColors = () => {
    switch (theme) {
      case 'luxury':
        return 'from-slate-800 to-blue-900';
      case 'modern':
        return 'from-violet-100 to-indigo-200';
      case 'simple':
      default:
        return 'from-gray-50 to-gray-100';
    }
  };

  return (
    <div className={`fixed inset-0 bg-gradient-to-br ${getThemeColors()} flex items-center justify-center z-50 transition-opacity duration-300`}>
      <div className="text-center">
        {/* 로딩 스피너 */}
        <div className="relative w-16 h-16 mx-auto">
          <div className="absolute inset-0 border-4 border-white/20 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-white/60 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    </div>
  );
}