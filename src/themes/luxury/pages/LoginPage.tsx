import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '@/adapters/react';
import { useSystemSettings } from '@/contexts/SystemSettingsContext';

export function LoginPage() {
  const navigate = useNavigate();
  const { login, isLoading, error, isAuthenticated, user } = useAuthContext();
  const { getSetting } = useSystemSettings();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // 로그인 성공시 리다이렉트
  useEffect(() => {
    if (isAuthenticated && user) {
      const redirectPath = user.role === 'operator' ? '/admin' : '/slots';
      navigate(redirectPath);
    }
  }, [isAuthenticated, user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await login({ email, password });
  };

  return (
    <div className="relative">
      {/* 배경을 fixed로 전체 화면 덮기 */}
      <div className="fixed inset-0 bg-black">
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
            <h1 className="text-amber-400 font-bold text-lg">{getSetting('siteName', 'business') || 'Simple Slot'}</h1>
            <p className="text-amber-600/80 text-xs">LUXURY EDITION</p>
          </div>
        </div>
      </div>

      {/* 우상단 장식 */}
      <div className="absolute top-8 right-8 z-10">
        <div className="text-amber-400/60 text-sm font-medium">ELITE ACCESS</div>
      </div>

      {/* 로그인 카드 */}
      <div className="relative z-20">
        <div className="bg-black/80 backdrop-blur-xl border-2 border-amber-500/50 p-10 rounded-3xl">
            {/* 폼 헤더 */}
            <div className="text-center mb-8">
              <div className="inline-block px-4 py-2 bg-amber-500/20 rounded-full border border-amber-500/30 mb-4">
                <span className="text-amber-400 text-sm font-semibold tracking-wider">ELITE MEMBER ACCESS</span>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">로그인</h2>
              <p className="text-amber-300/80">프리미엄 계정으로 로그인하세요</p>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-900/30 border border-red-500/30 text-red-300 rounded-lg backdrop-blur-sm text-center">
                {error}
              </div>
            )}

            {/* 로그인 폼 */}
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-6 py-4 bg-gray-900/50 border-2 border-amber-500/30 rounded-xl text-white placeholder-amber-300/50 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-500/20 transition-all duration-300 text-center"
                  placeholder="이메일 주소"
                  required
                />
              </div>

              <div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-6 py-4 bg-gray-900/50 border-2 border-amber-500/30 rounded-xl text-white placeholder-amber-300/50 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-500/20 transition-all duration-300 text-center"
                  placeholder="비밀번호"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className={`w-full py-4 px-8 rounded-xl font-bold transition-all duration-300 transform text-lg relative overflow-hidden ${
                  isLoading
                    ? 'bg-gray-700/50 text-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-500 hover:from-amber-400 hover:via-yellow-400 hover:to-amber-400 text-black shadow-2xl hover:shadow-amber-500/50 hover:scale-105 active:scale-95'
                }`}
              >
                {!isLoading && (
                  <>
                    <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 to-amber-400 opacity-30 rounded-xl"></div>
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent rounded-xl animate-pulse"></div>
                  </>
                )}
                <div className="relative z-10 flex items-center justify-center">
                  {isLoading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-6 w-6" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      로그인 중...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                      </svg>
                      ENTER ELITE ZONE
                    </>
                  )}
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
  );
}