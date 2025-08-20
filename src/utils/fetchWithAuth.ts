/**
 * 인증된 fetch 요청을 위한 유틸리티 함수
 * 401/403 에러 시 자동으로 로그인 페이지로 리다이렉트
 */

interface FetchOptions extends RequestInit {
  skipAuthCheck?: boolean;
}

export async function fetchWithAuth(url: string, options: FetchOptions = {}): Promise<Response> {
  const { skipAuthCheck = false, ...fetchOptions } = options;
  
  // Authorization 헤더 추가
  const token = localStorage.getItem('accessToken');
  if (token && !skipAuthCheck) {
    fetchOptions.headers = {
      ...fetchOptions.headers,
      'Authorization': `Bearer ${token}`
    };
  }
  
  try {
    const response = await fetch(url, fetchOptions);
    
    // 토큰 만료 또는 인증 실패 시 처리
    if (!skipAuthCheck && (response.status === 401 || response.status === 403)) {
      // 로컬 스토리지 정리
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      
      // 로그인 페이지로 리다이렉트
      window.location.href = '/login';
      
      // 에러 메시지 표시 (선택적)
      const message = response.status === 401 
        ? '인증이 만료되었습니다. 다시 로그인해주세요.'
        : '접근 권한이 없습니다.';
      
      // 원본 응답 반환 (리다이렉트 전까지 사용 가능)
      throw new Error(message);
    }
    
    return response;
  } catch (error) {
    // 네트워크 에러 등 다른 에러는 그대로 전달
    throw error;
  }
}

/**
 * JSON 응답을 받는 fetch 요청을 위한 헬퍼 함수
 */
export async function fetchJsonWithAuth<T = any>(
  url: string, 
  options: FetchOptions = {}
): Promise<T> {
  const response = await fetchWithAuth(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  });
  
  if (!response.ok && response.status !== 401 && response.status !== 403) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }
  
  return response.json();
}