import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '@/adapters/react';
import { useSystemSettings } from '@/contexts/SystemSettingsContext';

// 테마별 스타일 설정 타입
export interface LoginPageStyles {
  container: string;
  title: string;
  errorMessage: string;
  form: string;
  inputGroup: string;
  label: string;
  input: string;
  button: string;
  loadingButton: string;
}

// Props 타입
export interface BaseLoginPageProps {
  styles: LoginPageStyles;
  title?: string;
  showCompanyName?: boolean;
}

// 공통 로직을 가진 베이스 LoginPage 컴포넌트
export function BaseLoginPage({ 
  styles, 
  title = "로그인",
  showCompanyName = true
}: BaseLoginPageProps) {
  const navigate = useNavigate();
  const { login, isLoading, error, isAuthenticated, user } = useAuthContext();
  const { companyName } = useSystemSettings();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // 로그인 성공시 리다이렉트
  useEffect(() => {
    if (isAuthenticated && user) {
      const redirectPath = (user.role === 'operator' || user.role === 'developer') ? '/admin' : '/slots';
      navigate(redirectPath);
    }
  }, [isAuthenticated, user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // 비밀번호 최소 4자리 체크
    if (password.length < 4) {
      alert('비밀번호는 최소 4자리 이상이어야 합니다.');
      return;
    }
    await login({ email: username, password });
  };

  return (
    <div className={styles.container}>
      {showCompanyName && (
        <div className="text-center mb-4">
          <h2 className="text-2xl font-bold text-gray-800">{companyName}</h2>
        </div>
      )}
      <h1 className={styles.title}>{title}</h1>
      
      {error && (
        <div className={styles.errorMessage}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.inputGroup}>
          <label className={styles.label}>
            아이디
          </label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className={styles.input}
            placeholder="아이디를 입력하세요"
            required
          />
        </div>

        <div className={styles.inputGroup}>
          <label className={styles.label}>
            비밀번호
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={styles.input}
            placeholder="비밀번호 (최소 4자리)"
            minLength={4}
            required
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className={isLoading ? styles.loadingButton : styles.button}
        >
          {isLoading ? '로그인 중...' : '로그인'}
        </button>
      </form>
    </div>
  );
}