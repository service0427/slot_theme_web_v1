import React, { useState, useEffect } from 'react';
import { ApiUserService } from '@/adapters/services/ApiUserService';
import { User } from '@/core/models/User';
import { UserFilter } from '@/core/services/UserService';
import { BaseSlotAllocationModal, PreAllocationData } from './BaseSlotAllocationModal';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001/api';

interface AdminUserManageThemeProps {
  containerClass?: string;
  headerClass?: string;
  titleClass?: string;
  subtitleClass?: string;
  loadingClass?: string;
  searchBarClass?: string;
  searchInputClass?: string;
  searchButtonClass?: string;
  addButtonClass?: string;
  tableContainerClass?: string;
  tableClass?: string;
  tableHeaderClass?: string;
  tableRowClass?: string;
  roleBadgeClass?: string;
  statusBadgeClass?: string;
  actionButtonClass?: string;
  paginationClass?: string;
  modalContainerClass?: string;
  modalClass?: string;
  modalTitleClass?: string;
  modalInputClass?: string;
  modalButtonClass?: string;
  modalCancelButtonClass?: string;
}

interface BaseAdminUserManagePageProps {
  theme?: AdminUserManageThemeProps;
}

export const BaseAdminUserManagePage: React.FC<BaseAdminUserManagePageProps> = ({
  theme = {}
}) => {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [currentFilter, setCurrentFilter] = useState<UserFilter>({
    page: 1,
    limit: 10
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });
  const [pageSize, setPageSize] = useState(10);

  // 슬롯 할당 관련 상태
  const [showSlotAllocationModal, setShowSlotAllocationModal] = useState(false);
  const [selectedUserForAllocation, setSelectedUserForAllocation] = useState<User | null>(null);
  const [userAllocations, setUserAllocations] = useState<Record<string, {allocated: number, used: number}>>({});
  
  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    fullName: '',
    role: 'user'
  });

  const [editUser, setEditUser] = useState({
    fullName: '',
    role: '',
    isActive: true,
    password: ''
  });

  const userService = new ApiUserService();

  // 기본 스타일
  const defaultTheme: AdminUserManageThemeProps = {
    containerClass: 'p-6',
    headerClass: 'mb-6',
    titleClass: 'text-2xl font-bold mb-2',
    subtitleClass: 'text-gray-600',
    loadingClass: 'p-6 flex items-center justify-center',
    searchBarClass: 'mb-6 flex gap-4',
    searchInputClass: 'flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500',
    searchButtonClass: 'px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700',
    addButtonClass: 'px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700',
    tableContainerClass: 'bg-white rounded-lg shadow overflow-hidden',
    tableClass: 'w-full',
    tableHeaderClass: 'bg-gray-50',
    tableRowClass: 'hover:bg-gray-50',
    roleBadgeClass: 'px-2 py-1 text-xs font-medium rounded-full',
    statusBadgeClass: 'px-2 py-1 text-xs font-medium rounded-full',
    actionButtonClass: 'text-blue-600 hover:text-blue-900',
    paginationClass: 'mt-4 flex justify-center gap-2',
    modalContainerClass: 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50',
    modalClass: 'bg-white rounded-lg p-6 max-w-md w-full mx-4',
    modalTitleClass: 'text-lg font-semibold mb-4',
    modalInputClass: 'w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500',
    modalButtonClass: 'px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700',
    modalCancelButtonClass: 'px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300'
  };

  // 테마 병합
  const mergedTheme = { ...defaultTheme, ...theme };

  // 모든 사용자의 실제 슬롯 개수 로드
  const loadAllUserAllocations = async (userList: User[]) => {
    try {
      const token = localStorage.getItem('accessToken');
      const allocations: Record<string, {allocated: number, used: number}> = {};
      
      await Promise.all(
        userList.map(async (user) => {
          try {
            // count API를 사용하여 슬롯 개수만 가져오기
            const response = await fetch(`${API_BASE_URL}/slots/count?userId=${user.id}`, {
              headers: {
                'Authorization': `Bearer ${token}`
              }
            });
            
            if (response.ok) {
              const result = await response.json();
              if (result.success && result.data) {
                allocations[user.id] = {
                  allocated: result.data.allocated || 0,
                  used: result.data.used || 0
                };
              }
            }
          } catch (error) {
            // 에러 무시
          }
        })
      );
      
      setUserAllocations(allocations);
    } catch (error) {
      // 에러 무시
    }
  };

  // 사용자 목록 로드
  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const result = await userService.getUsers({
        ...currentFilter,
        search: searchTerm
      });
      
      if (result.success && result.data) {
        setUsers(result.data.users);
        setPagination(result.data.pagination);
        
        // 슬롯 할당 정보도 함께 로드
        loadAllUserAllocations(result.data.users);
      } else {
        alert(result.error || '사용자 목록을 불러오는데 실패했습니다.');
      }
    } catch (error) {
      alert('사용자 목록을 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [currentFilter]);

  // 검색
  const handleSearch = () => {
    setCurrentFilter(prev => ({ ...prev, page: 1 }));
    loadUsers();
  };

  // 페이지 크기 변경
  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setCurrentFilter(prev => ({ 
      ...prev, 
      limit: newSize,
      page: 1 
    }));
  };

  // 사용자 추가
  const handleAddUser = async () => {
    if (!newUser.email || !newUser.password || !newUser.fullName) {
      alert('모든 필수 항목을 입력해주세요.');
      return;
    }

    try {
      // role을 항상 'user'로 강제 설정
      const result = await userService.createUser({
        ...newUser,
        role: 'user'  // 운영자는 일반 사용자만 추가 가능
      });
      
      if (result.success) {
        alert('사용자가 추가되었습니다.');
        setShowAddModal(false);
        setNewUser({
          email: '',
          password: '',
          fullName: '',
          role: 'user'
        });
        loadUsers();
      } else {
        alert(result.error || '사용자 추가에 실패했습니다.');
      }
    } catch (error) {
      alert('사용자 추가에 실패했습니다.');
    }
  };

  // 사용자 수정
  const handleUpdateUser = async () => {
    if (!selectedUser) return;

    try {
      const updateData: any = {};
      
      if (editUser.fullName && editUser.fullName !== selectedUser.fullName) {
        updateData.fullName = editUser.fullName;
      }
      
      if (editUser.role && editUser.role !== selectedUser.role) {
        updateData.role = editUser.role;
      }
      
      if (editUser.isActive !== (selectedUser as any).isActive) {
        updateData.isActive = editUser.isActive;
      }
      
      if (editUser.password) {
        updateData.password = editUser.password;
      }

      const result = await userService.updateUser(selectedUser.id, updateData);
      
      if (result.success) {
        alert('사용자 정보가 수정되었습니다.');
        setShowEditModal(false);
        setSelectedUser(null);
        loadUsers();
      } else {
        alert(result.error || '사용자 수정에 실패했습니다.');
      }
    } catch (error) {
      alert('사용자 수정에 실패했습니다.');
    }
  };

  // 사용자 삭제
  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm('정말로 이 사용자를 삭제하시겠습니까?')) {
      return;
    }

    try {
      const result = await userService.deleteUser(userId);
      
      if (result.success) {
        alert('사용자가 삭제되었습니다.');
        loadUsers();
      } else {
        alert(result.error || '사용자 삭제에 실패했습니다.');
      }
    } catch (error) {
      alert('사용자 삭제에 실패했습니다.');
    }
  };

  // 슬롯 할당 모달 열기
  const openSlotAllocationModal = async (user: User) => {
    setSelectedUserForAllocation(user);
    
    // 해당 사용자의 현재 할당 정보 조회
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${API_BASE_URL}/slots/allocation/${user.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          setUserAllocations(prev => ({
            ...prev,
            [user.id]: {
              allocated: result.data.allocated_slots,
              used: result.data.used_slots
            }
          }));
        }
      }
    } catch (error) {
    }
    
    setShowSlotAllocationModal(true);
  };

  // 슬롯 할당 실행
  const handleSlotAllocation = async (data: PreAllocationData) => {
    if (!selectedUserForAllocation) return;
    
    try {
      const token = localStorage.getItem('accessToken');
      // 선슬롯발행 API 호출 (allocate 엔드포인트 사용)
      const response = await fetch(`${API_BASE_URL}/slots/allocate/${selectedUserForAllocation.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          userId: selectedUserForAllocation.id,
          slotCount: data.slotCount,
          startDate: data.startDate,
          endDate: data.endDate,
          workCount: data.workCount,
          amount: data.amount,
          description: data.description
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        alert(`${selectedUserForAllocation.fullName || selectedUserForAllocation.email}님에게 ${data.slotCount}개의 선슬롯이 발행되었습니다.`);
        setShowSlotAllocationModal(false);
        setSelectedUserForAllocation(null);
        
        // 할당 정보 업데이트
        setUserAllocations(prev => ({
          ...prev,
          [selectedUserForAllocation.id]: {
            allocated: (prev[selectedUserForAllocation.id]?.allocated || 0) + data.slotCount,
            used: prev[selectedUserForAllocation.id]?.used || 0
          }
        }));
        
        // 사용자 목록 새로고침
        loadUsers();
      } else {
        alert(result.error || '선슬롯 발행에 실패했습니다.');
      }
    } catch (error) {
      alert('선슬롯 발행 중 오류가 발생했습니다.');
    }
  };

  // 사용자 편집 모달 열기
  const openEditModal = (user: User) => {
    setSelectedUser(user);
    setEditUser({
      fullName: user.fullName || '',
      role: user.role,
      isActive: (user as any).isActive !== false,
      password: ''
    });
    setShowEditModal(true);
  };

  const getRoleBadge = (role: string) => {
    const styles: Record<string, string> = {
      operator: 'bg-purple-100 text-purple-800',
      admin: 'bg-red-100 text-red-800',
      user: 'bg-blue-100 text-blue-800',
    };

    const labels: Record<string, string> = {
      operator: '운영자',
      admin: '관리자',
      user: '일반 사용자',
    };

    return (
      <span className={`${mergedTheme.roleBadgeClass} ${styles[role] || styles.user}`}>
        {labels[role] || role}
      </span>
    );
  };

  const getStatusBadge = (isActive: boolean) => {
    return (
      <span className={`${mergedTheme.statusBadgeClass} ${
        isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
      }`}>
        {isActive ? '활성' : '비활성'}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className={mergedTheme.loadingClass}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className={mergedTheme.containerClass}>
      <div className={mergedTheme.headerClass}>
        <h1 className={mergedTheme.titleClass}>사용자 관리</h1>
        <p className={mergedTheme.subtitleClass}>
          전체 사용자: {pagination.total}명
        </p>
      </div>

      {/* 검색 바와 추가 버튼 */}
      <div className={mergedTheme.searchBarClass}>
        <div className="flex-1 flex gap-2">
          <input
            type="text"
            placeholder="아이디 또는 이름으로 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            className={mergedTheme.searchInputClass}
          />
          <button
            onClick={handleSearch}
            className={mergedTheme.searchButtonClass}
          >
            검색
          </button>
        </div>
        <select
          value={pageSize}
          onChange={(e) => handlePageSizeChange(Number(e.target.value))}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value={10}>10개씩</option>
          <option value={50}>50개씩</option>
          <option value={100}>100개씩</option>
        </select>
        <button
          onClick={() => setShowAddModal(true)}
          className={mergedTheme.addButtonClass}
        >
          사용자 추가
        </button>
      </div>

      {/* 사용자 목록 */}
      <div className={mergedTheme.tableContainerClass}>
        <table className={mergedTheme.tableClass}>
          <thead className={mergedTheme.tableHeaderClass}>
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">가입일</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">아이디</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">이름</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">역할</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">상태</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">할당된 슬롯</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">액션</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {users.map(user => (
              <tr key={user.id} className={mergedTheme.tableRowClass}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {new Date((user as any).createdAt || user.createdAt).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {user.email}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {user.fullName || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {getRoleBadge(user.role)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {getStatusBadge((user as any).isActive !== false)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center text-sm">
                  {userAllocations[user.id] ? (
                    <div className="text-xs">
                      <div className="font-medium text-blue-600">
                        {userAllocations[user.id].allocated}개 할당
                      </div>
                      <div className="text-gray-500">
                        {userAllocations[user.id].used}개 사용중
                      </div>
                    </div>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <div className="flex gap-2">
                    <button
                      onClick={() => openSlotAllocationModal(user)}
                      className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 text-xs"
                    >
                      슬롯 할당
                    </button>
                    <button
                      onClick={() => openEditModal(user)}
                      className={mergedTheme.actionButtonClass}
                    >
                      수정
                    </button>
                    <button
                      onClick={() => handleDeleteUser(user.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      삭제
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 페이지네이션 */}
      {pagination.totalPages > 1 && (
        <div className={mergedTheme.paginationClass}>
          <button
            onClick={() => setCurrentFilter(prev => ({ ...prev, page: prev.page! - 1 }))}
            disabled={pagination.page === 1}
            className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50"
          >
            이전
          </button>
          <span className="px-3 py-1">
            {pagination.page} / {pagination.totalPages}
          </span>
          <button
            onClick={() => setCurrentFilter(prev => ({ ...prev, page: prev.page! + 1 }))}
            disabled={pagination.page === pagination.totalPages}
            className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50"
          >
            다음
          </button>
        </div>
      )}

      {/* 사용자 추가 모달 */}
      {showAddModal && (
        <div className={mergedTheme.modalContainerClass}>
          <div className={mergedTheme.modalClass}>
            <h3 className={mergedTheme.modalTitleClass}>새 사용자 추가</h3>
            <form onSubmit={(e) => {
              e.preventDefault();
              handleAddUser();
            }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  아이디 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newUser.email}
                  onChange={(e) => {
                    const value = e.target.value;
                    // 영어와 숫자만 허용 (정규식 검증)
                    const alphanumericRegex = /^[a-zA-Z0-9]*$/;
                    if (!alphanumericRegex.test(value)) {
                      return;
                    }
                    setNewUser({ ...newUser, email: value });
                  }}
                  className={mergedTheme.modalInputClass}
                  placeholder="사용자 아이디 (영문, 숫자만)"
                  required
                />
                <p className="mt-1 text-xs text-gray-500">
                  아이디는 영문자와 숫자만 사용 가능합니다
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  비밀번호 <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  className={mergedTheme.modalInputClass}
                  placeholder="최소 4자리"
                  minLength={4}
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  이름 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newUser.fullName}
                  onChange={(e) => setNewUser({ ...newUser, fullName: e.target.value })}
                  className={mergedTheme.modalInputClass}
                  placeholder="홍길동"
                  required
                />
              </div>
              
              {/* 역할은 자동으로 일반 사용자로 설정, 드롭다운 제거 */}
              <input type="hidden" value="user" />
              
              <div className="mt-6 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setNewUser({
                      email: '',
                      password: '',
                      fullName: '',
                      role: 'user'
                    });
                  }}
                  className={mergedTheme.modalCancelButtonClass}
                >
                  취소
                </button>
                <button
                  type="submit"
                  className={mergedTheme.modalButtonClass}
                >
                  추가하기
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 사용자 수정 모달 */}
      {showEditModal && selectedUser && (
        <div className={mergedTheme.modalContainerClass}>
          <div className={mergedTheme.modalClass}>
            <h3 className={mergedTheme.modalTitleClass}>사용자 정보 수정</h3>
            <form onSubmit={(e) => {
              e.preventDefault();
              handleUpdateUser();
            }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  아이디
                </label>
                <input
                  type="text"
                  value={selectedUser.email}
                  disabled
                  className={`${mergedTheme.modalInputClass} bg-gray-100`}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  이름
                </label>
                <input
                  type="text"
                  value={editUser.fullName}
                  onChange={(e) => setEditUser({ ...editUser, fullName: e.target.value })}
                  className={mergedTheme.modalInputClass}
                  placeholder="홍길동"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  상태
                </label>
                <select
                  value={editUser.isActive ? 'active' : 'inactive'}
                  onChange={(e) => setEditUser({ ...editUser, isActive: e.target.value === 'active' })}
                  className={mergedTheme.modalInputClass}
                >
                  <option value="active">활성</option>
                  <option value="inactive">비활성</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  새 비밀번호 (변경 시에만 입력)
                </label>
                <input
                  type="password"
                  value={editUser.password}
                  onChange={(e) => setEditUser({ ...editUser, password: e.target.value })}
                  className={mergedTheme.modalInputClass}
                  placeholder="••••••••"
                />
              </div>
              
              <div className="mt-6 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedUser(null);
                  }}
                  className={mergedTheme.modalCancelButtonClass}
                >
                  취소
                </button>
                <button
                  type="submit"
                  className={mergedTheme.modalButtonClass}
                >
                  수정하기
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 슬롯 할당 모달 */}
      {selectedUserForAllocation && (
        <BaseSlotAllocationModal
          isOpen={showSlotAllocationModal}
          onClose={() => {
            setShowSlotAllocationModal(false);
            setSelectedUserForAllocation(null);
          }}
          onAllocate={handleSlotAllocation}
          userName={selectedUserForAllocation.fullName || selectedUserForAllocation.email}
          userId={selectedUserForAllocation.id}
          currentAllocation={userAllocations[selectedUserForAllocation.id]}
        />
      )}
    </div>
  );
};