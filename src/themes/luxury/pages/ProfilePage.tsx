import { useState } from 'react';
import { useAuthContext } from '@/adapters/react';

export function ProfilePage() {
  const { user, updateUser } = useAuthContext();
  const [formData, setFormData] = useState({
    fullName: user?.fullName || '',
    email: user?.email || '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);


    // 비밀번호 변경 시 검증
    if (formData.newPassword) {
      if (formData.newPassword !== formData.confirmPassword) {
        setMessage({ type: 'error', text: '새 비밀번호가 일치하지 않습니다.' });
        return;
      }
      if (formData.newPassword.length < 6) {
        setMessage({ type: 'error', text: '비밀번호는 최소 6자 이상이어야 합니다.' });
        return;
      }
      if (!formData.currentPassword) {
        setMessage({ type: 'error', text: '현재 비밀번호를 입력해주세요.' });
        return;
      }
    }

    try {
      // 사용자 정보 업데이트
      const updateData: any = {
        fullName: formData.fullName
      };

      if (formData.newPassword) {
        updateData.password = formData.newPassword;
        updateData.currentPassword = formData.currentPassword;
      }

      const result = await updateUser(updateData);
      
      if (result.success) {
        setMessage({ type: 'success', text: '정보가 성공적으로 업데이트되었습니다.' });
        
        // 비밀번호 필드만 초기화
        setFormData(prev => ({
          ...prev,
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        }));
      } else {
        setMessage({ type: 'error', text: result.error || '업데이트 중 오류가 발생했습니다.' });
      }
    } catch (error) {
      // Profile update error
      setMessage({ type: 'error', text: '업데이트 중 오류가 발생했습니다.' });
    }
  };

  const handleReset = () => {
    setFormData({
      fullName: user?.fullName || '',
      email: user?.email || '',
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    });
    setMessage(null);
  };

  return (
    <div className="p-6 h-full">
      <h1 className="text-2xl font-bold mb-6">내 정보</h1>

      {message && (
        <div className={`mb-4 p-4 rounded ${
          message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
        }`}>
          {message.text}
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-6">
        <form onSubmit={handleSubmit}>
          {/* 기본 정보 섹션 */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-4">기본 정보</h2>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  이름
                </label>
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  아이디
                </label>
                <input
                  type="text"
                  value={formData.email}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed"
                />
                <p className="text-xs text-gray-500 mt-1">아이디는 변경할 수 없습니다.</p>
              </div>

            </div>
          </div>

          {/* 비밀번호 변경 섹션 */}
          <div className="mt-6 pt-6 border-t">
            <h2 className="text-lg font-semibold mb-4">비밀번호 변경</h2>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  현재 비밀번호
                </label>
                <input
                  type="password"
                  value={formData.currentPassword}
                  onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  새 비밀번호
                </label>
                <input
                  type="password"
                  value={formData.newPassword}
                  onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                  placeholder="최소 6자 이상"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  새 비밀번호 확인
                </label>
                <input
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              비밀번호를 변경하지 않으려면 비워두세요.
            </p>
          </div>

          {/* 액션 버튼 */}
          <div className="flex justify-end gap-3 pt-6 border-t">
            <button
              type="button"
              onClick={handleReset}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              초기화
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              정보 수정
            </button>
          </div>
        </form>
      </div>


      {/* 추가 정보 */}
      <div className="mt-6 bg-gray-50 rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-3">계정 정보</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">가입일</span>
            <span className="font-medium">{new Date(user?.createdAt || Date.now()).toLocaleDateString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">마지막 로그인</span>
            <span className="font-medium">{new Date(user?.lastLoginAt || Date.now()).toLocaleDateString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">상태</span>
            <span className="font-medium text-green-600">활성</span>
          </div>
        </div>
      </div>
    </div>
  );
}