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
      {/* 배경을 fixed로 전체 화면 덮기 - 더 옅은 색상 */}
      <div className="fixed inset-0 bg-gradient-to-br from-violet-400 via-purple-500 to-indigo-600">
        <div className="absolute -inset-10 opacity-30">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-400 rounded-full mix-blend-multiply filter blur-xl animate-pulse"></div>
          <div className="absolute top-3/4 right-1/4 w-96 h-96 bg-indigo-400 rounded-full mix-blend-multiply filter blur-xl animate-pulse delay-2000"></div>
          <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-violet-400 rounded-full mix-blend-multiply filter blur-xl animate-pulse delay-4000"></div>
        </div>
      </div>

      {/* 로그인 카드 - 더 큰 패딩 */}
      <div className="relative z-10">
        <div className="backdrop-blur-xl bg-white/15 border border-white/25 rounded-3xl shadow-2xl p-12">
          {/* 로고 + 로그인 헤더 */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl shadow-lg mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">{getSetting('siteName', 'business') || 'Simple Slot'}</h1>
            <p className="text-gray-300 text-sm">계정에 로그인하여 시작하세요</p>
          </div>
          
          {error && (
            <div className="bg-red-500/20 border border-red-500/50 backdrop-blur-sm text-red-100 px-4 py-3 rounded-lg mb-6 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-5 py-3.5 bg-white/20 border border-white/30 rounded-xl text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent backdrop-blur-sm transition-all duration-300 text-base"
                placeholder="이메일을 입력하세요"
                required
              />
            </div>

            <div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-5 py-3.5 bg-white/20 border border-white/30 rounded-xl text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent backdrop-blur-sm transition-all duration-300 text-base"
                placeholder="비밀번호를 입력하세요"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-3.5 px-5 rounded-xl font-medium transition-all duration-300 transform mt-5 text-base ${
                isLoading
                  ? 'bg-gray-600/50 text-gray-300 cursor-not-allowed'
                  : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-purple-500/25 hover:scale-105 active:scale-95'
              }`}
            >
              {isLoading ? '로그인 중...' : '로그인'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}