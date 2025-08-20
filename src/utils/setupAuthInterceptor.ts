/**
 * 전역 fetch interceptor 설정
 * 401/403 에러 시 자동으로 로그인 페이지로 리다이렉트
 */

export function setupAuthInterceptor() {
  // 원본 fetch 저장
  const originalFetch = window.fetch;
  
  // fetch 오버라이드
  window.fetch = async function(...args) {
    const [url, options = {}] = args;
    
    try {
      // 원본 fetch 호출
      const response = await originalFetch.apply(this, args);
      
      // API 요청이 아닌 경우 (정적 리소스 등) 체크 안함
      const urlStr = url.toString();
      if (!urlStr.includes('/api/')) {
        return response;
      }
      
      // 401 또는 403 에러 처리
      if (response.status === 401 || response.status === 403) {
        // 로그인 페이지 요청은 제외
        if (!urlStr.includes('/auth/')) {
          console.log(`Authentication error: ${response.status} for ${urlStr}`);
          
          // 로컬 스토리지 정리
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('user');
          
          // 현재 로그인 페이지가 아닌 경우에만 리다이렉트
          if (window.location.pathname !== '/login') {
            // 에러 메시지 저장 (로그인 페이지에서 표시할 수 있도록)
            const message = response.status === 401 
              ? '인증이 만료되었습니다. 다시 로그인해주세요.'
              : '접근 권한이 없습니다. 다시 로그인해주세요.';
            
            sessionStorage.setItem('authError', message);
            
            // 로그인 페이지로 리다이렉트
            window.location.href = '/login';
          }
        }
      }
      
      return response;
    } catch (error) {
      // 네트워크 에러 등은 그대로 전달
      throw error;
    }
  };
}