import { useSystemSettings } from '@/contexts/SystemSettingsContext';

export function AdminThemeSelector() {
  const { currentTheme, setGlobalTheme, availableThemes, isAdmin } = useSystemSettings();

  if (!isAdmin) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">
          현재 테마
        </h3>
        
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-3">
              <h4 className="text-sm font-medium text-blue-800">
                {availableThemes.find(t => t.key === currentTheme)?.name}
              </h4>
              <div className="mt-1 text-sm text-blue-700">
                <p>현재 테마는 관리자에 의해 설정되었습니다.</p>
                <p className="mt-1">{availableThemes.find(t => t.key === currentTheme)?.description}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-800">
          전체 사이트 테마 관리
        </h3>
        <div className="px-3 py-1 bg-red-100 text-red-800 text-sm font-medium rounded-full">
          관리자 전용
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {availableThemes.map((themeOption) => (
          <div
            key={themeOption.key}
            className={`relative cursor-pointer rounded-xl border-2 transition-all duration-200 overflow-hidden ${
              currentTheme === themeOption.key
                ? 'border-red-500 shadow-lg shadow-red-500/25 transform scale-[1.02]'
                : 'border-slate-200 hover:border-red-300 hover:shadow-md'
            }`}
            onClick={() => setGlobalTheme(themeOption.key)}
          >
            {/* 테마 미리보기 */}
            <div className={`h-24 ${themeOption.preview} relative overflow-hidden`}>
              {/* 테마별 미리보기 패턴 */}
              {themeOption.key === 'simple' && (
                <div className="absolute inset-0 bg-white/90">
                  <div className="p-3">
                    <div className="bg-blue-500 h-2 w-16 rounded mb-2"></div>
                    <div className="bg-gray-300 h-1 w-24 rounded mb-1"></div>
                    <div className="bg-gray-200 h-1 w-20 rounded"></div>
                  </div>
                </div>
              )}
              
              {themeOption.key === 'modern' && (
                <div className="absolute inset-0 bg-gradient-to-br from-violet-100 to-indigo-100">
                  <div className="p-3">
                    <div className="bg-gradient-to-r from-violet-500 to-indigo-600 h-2 w-16 rounded mb-2"></div>
                    <div className="bg-violet-300 h-1 w-24 rounded mb-1"></div>
                    <div className="bg-indigo-200 h-1 w-20 rounded"></div>
                  </div>
                </div>
              )}
              
              {themeOption.key === 'luxury' && (
                <div className="absolute inset-0 bg-gradient-to-br from-slate-800 to-blue-900">
                  <div className="p-3">
                    <div className="bg-gradient-to-r from-amber-400 to-yellow-500 h-2 w-16 rounded mb-2"></div>
                    <div className="bg-slate-400 h-1 w-24 rounded mb-1"></div>
                    <div className="bg-slate-500 h-1 w-20 rounded"></div>
                  </div>
                </div>
              )}
              
              {/* 선택된 테마 표시 */}
              {currentTheme === themeOption.key && (
                <div className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
            </div>
            
            {/* 테마 정보 */}
            <div className="p-4">
              <h4 className="font-semibold text-slate-800 mb-1">
                {themeOption.name}
              </h4>
              <p className="text-sm text-slate-500">
                {themeOption.description}
              </p>
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-6 p-4 bg-amber-50 rounded-lg border border-amber-200">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.728-.833-2.498 0L3.316 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-amber-800">관리자 권한</h3>
            <div className="mt-2 text-sm text-amber-700">
              <p><strong>전체 사이트 테마를 관리합니다.</strong></p>
              <p>• 모든 일반 사용자에게 선택한 테마가 적용됩니다</p>
              <p>• 변경 즉시 모든 사용자에게 반영됩니다</p>
              <p>• 관리자는 개인적으로 다른 테마를 사용할 수 있습니다</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}