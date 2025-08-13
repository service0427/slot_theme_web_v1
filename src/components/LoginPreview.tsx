interface LoginPreviewProps {
  previewTheme?: 'simple' | 'modern' | 'luxury';
  onClose: () => void;
}

export function LoginPreview({ previewTheme, onClose }: LoginPreviewProps) {
  const themeToPreview = previewTheme || 'simple';
  
  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-75 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-7xl h-[90vh] flex flex-col">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">로그인 페이지 미리보기</h2>
            <p className="text-sm text-gray-600 mt-1">{themeToPreview.toUpperCase()} 테마</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* 미리보기 영역 */}
        <div className="flex-1 overflow-hidden relative">
          <iframe
            src={`/login-preview?theme=${themeToPreview}`}
            className="w-full h-full border-0"
            title={`${themeToPreview} 테마 로그인 미리보기`}
            sandbox="allow-scripts allow-same-origin"
          />
        </div>
      </div>
    </div>
  );
}