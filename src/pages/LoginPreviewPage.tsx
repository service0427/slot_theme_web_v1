import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';

export function LoginPreviewPage() {
  const [searchParams] = useSearchParams();
  const theme = (searchParams.get('theme') || 'simple') as 'simple' | 'modern' | 'luxury';
  const [email, setEmail] = useState('admin@example.com');
  const [password, setPassword] = useState('••••••••');

  // 각 테마별 로그인 페이지 UI 컴포넌트
  const SimpleThemeLogin = () => (
    <div className="min-h-screen flex">
      {/* 좌측 브랜드 영역 - 30% */}
      <div style={{width: '30%'}} className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 flex flex-col justify-center items-center p-8 text-white relative overflow-hidden">
        {/* 배경 장식 */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-white rounded-full blur-3xl"></div>
          <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-blue-300 rounded-full blur-2xl"></div>
        </div>
        
        <div className="relative z-10 text-center max-w-md">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white/20 backdrop-blur-sm rounded-3xl mb-8">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold mb-4">마케팅의정석</h1>
          <p className="text-blue-100 text-lg mb-6">효율적인 광고 슬롯 관리</p>
          <div className="space-y-3 text-blue-200 text-sm">
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              실시간 광고 슬롯 모니터링
            </div>
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              간편한 수익 관리 시스템
            </div>
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              전문적인 분석 도구 제공
            </div>
          </div>
        </div>
      </div>

      {/* 우측 로그인 폼 영역 - 70% */}
      <div style={{width: '70%'}} className="bg-gray-50 flex flex-col justify-center px-12 py-8 min-h-screen">
        <div className="w-full">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">로그인</h2>
            <p className="text-gray-600">계정에 로그인하여 관리를 시작하세요</p>
          </div>

          <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                이메일 주소
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white transition-all duration-200"
                placeholder="이메일을 입력하세요"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                비밀번호
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white transition-all duration-200"
                placeholder="비밀번호를 입력하세요"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 px-4 font-semibold rounded-lg transition-all duration-200 bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg"
            >
              로그인
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-gray-500 text-sm">
              도움이 필요하신가요?{' '}
              <a href="#" className="text-blue-600 hover:text-blue-800 font-medium">
                지원팀 문의
              </a>
            </p>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-200 text-center">
            <p className="text-gray-400 text-xs">
              © 2024 마케팅의정석. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  const ModernThemeLogin = () => (
    <div style={{ height: '90vh' }} className="bg-gradient-to-br from-violet-600 via-purple-700 to-indigo-800 flex justify-center p-2 overflow-hidden">
      <div className="w-full max-w-md flex flex-col justify-center p-6">
        <div className="backdrop-blur-xl bg-white/10 rounded-3xl p-8 border border-white/20 shadow-2xl">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">마케팅의정석</h1>
            <p className="text-purple-200 text-sm">Modern Edition</p>
          </div>

          <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
            <div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-xl text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-white/60 backdrop-blur-sm"
                placeholder="이메일 주소"
              />
            </div>

            <div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-xl text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-white/60 backdrop-blur-sm"
                placeholder="비밀번호"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 px-4 bg-gradient-to-r from-white to-purple-100 text-purple-800 font-semibold rounded-xl hover:from-purple-100 hover:to-white transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              로그인
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-purple-200 text-xs">
              © 2024 마케팅의정석 Modern Edition
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  const LuxuryThemeLogin = () => (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* 배경 비디오 효과 */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-900/20 via-black/50 to-yellow-900/20"></div>
        <div className="absolute top-0 left-0 w-full h-full opacity-30">
          <div className="absolute top-10 left-10 w-32 h-32 bg-amber-500/20 rounded-full blur-xl animate-pulse"></div>
          <div className="absolute top-1/3 right-1/4 w-48 h-48 bg-yellow-400/10 rounded-full blur-2xl animate-pulse delay-1000"></div>
          <div className="absolute bottom-1/4 left-1/3 w-64 h-64 bg-amber-600/15 rounded-full blur-3xl animate-pulse delay-2000"></div>
          <div className="absolute bottom-10 right-10 w-40 h-40 bg-yellow-500/20 rounded-full blur-xl animate-pulse delay-500"></div>
        </div>
      </div>

      {/* 상단 브랜드 로고 */}
      <div className="absolute top-8 left-8 z-20">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-gradient-to-r from-amber-500 to-yellow-600 rounded-xl flex items-center justify-center">
            <svg className="w-6 h-6 text-black font-bold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
          </div>
          <div>
            <h1 className="text-amber-400 font-bold text-lg">마케팅의정석</h1>
            <p className="text-amber-600/80 text-xs">LUXURY EDITION</p>
          </div>
        </div>
      </div>

      {/* 우상단 장식 */}
      <div className="absolute top-8 right-8 z-10">
        <div className="text-amber-400/60 text-sm font-medium">ELITE ACCESS</div>
      </div>

      {/* 하단 로그인 폼 영역 */}
      <div className="absolute bottom-0 left-0 right-0 z-20 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-black/80 backdrop-blur-xl border-t-2 border-amber-500/50 p-8 rounded-t-3xl">
            {/* 폼 헤더 */}
            <div className="text-center mb-8">
              <div className="inline-block px-4 py-2 bg-amber-500/20 rounded-full border border-amber-500/30 mb-4">
                <span className="text-amber-400 text-sm font-semibold tracking-wider">ELITE MEMBER ACCESS</span>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">로그인</h2>
              <p className="text-amber-300/80">프리미엄 계정으로 로그인하세요</p>
            </div>

            {/* 로그인 폼 */}
            <form className="max-w-md mx-auto space-y-6" onSubmit={(e) => e.preventDefault()}>
              <div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-6 py-4 bg-gray-900/50 border-2 border-amber-500/30 rounded-xl text-white placeholder-amber-300/50 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-500/20 transition-all duration-300 text-center"
                  placeholder="이메일 주소"
                />
              </div>

              <div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-6 py-4 bg-gray-900/50 border-2 border-amber-500/30 rounded-xl text-white placeholder-amber-300/50 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-500/20 transition-all duration-300 text-center"
                  placeholder="비밀번호"
                />
              </div>

              <button
                type="submit"
                className="w-full py-4 px-8 rounded-xl font-bold transition-all duration-300 transform text-lg relative overflow-hidden bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-500 hover:from-amber-400 hover:via-yellow-400 hover:to-amber-400 text-black shadow-2xl hover:shadow-amber-500/50 hover:scale-105 active:scale-95"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 to-amber-400 opacity-30 rounded-xl"></div>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent rounded-xl animate-pulse"></div>
                <div className="relative z-10 flex items-center justify-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                  </svg>
                  ENTER ELITE ZONE
                </div>
              </button>
            </form>

            {/* 하단 정보 */}
            <div className="mt-8 flex justify-center items-center space-x-6 text-amber-400/60 text-xs">
              <span>24/7 PREMIUM SUPPORT</span>
              <span>•</span>
              <span>SECURE ENCRYPTION</span>
              <span>•</span>
              <span>EXCLUSIVE ACCESS</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const ThemeComponents = {
    simple: SimpleThemeLogin,
    modern: ModernThemeLogin,
    luxury: LuxuryThemeLogin
  };

  const ThemeComponent = ThemeComponents[theme];

  return (
    <div className="w-full h-screen">
      {/* 미리보기 알림 배너 */}
      <div className="absolute top-0 left-0 right-0 z-50 bg-blue-600 text-white text-center py-2 text-sm">
        <div className="flex items-center justify-center">
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          미리보기 모드 - {theme.toUpperCase()} 테마 • 실제 로그인 기능은 작동하지 않습니다
        </div>
      </div>
      
      {/* 테마 컴포넌트 */}
      <div className="pt-10">
        <ThemeComponent />
      </div>
    </div>
  );
}