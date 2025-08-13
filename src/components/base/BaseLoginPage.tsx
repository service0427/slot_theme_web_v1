import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '@/adapters/react';

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
}

// 공통 로직을 가진 베이스 LoginPage 컴포넌트
export function BaseLoginPage({ 
  styles, 
  title = "로그인" 
}: BaseLoginPageProps) {
  const navigate = useNavigate();
  const { login, isLoading, error, isAuthenticated, user } = useAuthContext();
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
    <div className={styles.container}>
      <h1 className={styles.title}>{title}</h1>
      
      {error && (
        <div className={styles.errorMessage}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.inputGroup}>
          <label className={styles.label}>
            이메일
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={styles.input}
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