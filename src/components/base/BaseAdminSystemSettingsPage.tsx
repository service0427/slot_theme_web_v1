import { useState, useEffect, useRef } from 'react';
import { useAuthContext } from '@/adapters/react';
import { useAdminTheme } from '@/contexts/AdminThemeContext';
import { Navigate } from 'react-router-dom';
import { useChatConfig } from '@/hooks/useChatConfig';
import { fieldConfigService, FieldConfig } from '@/adapters/services/ApiFieldConfigService';
import { LoginPreview } from '@/components/LoginPreview';
import { 
  PlusIcon, 
  TrashIcon, 
  ArrowUpIcon, 
  ArrowDownIcon,
  CheckIcon,
  XMarkIcon,
  EyeIcon
} from '@heroicons/react/24/outline';

// 테마별 스타일 정의
export const systemSettingsStyles = {
  simple: {
    container: 'min-h-screen bg-gray-50 p-6',
    header: 'text-3xl font-bold text-gray-900 mb-2',
    subheader: 'text-gray-600 mb-8',
    section: 'bg-white rounded-lg shadow p-6 mb-6',
    sectionTitle: 'text-xl font-semibold mb-4',
    sectionDesc: 'text-gray-600 mb-6',
    button: {
      primary: 'px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors',
      secondary: 'px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors',
      disabled: 'px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors'
    },
    themeCard: 'relative border-2 rounded-lg p-6 cursor-pointer transition-all',
    themeCardActive: 'border-blue-500 bg-blue-50',
    themeCardInactive: 'border-gray-300 hover:border-gray-400',
    checkmark: 'absolute top-3 right-3 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center'
  },
  modern: {
    container: 'min-h-screen bg-gradient-to-br from-slate-50 to-white p-6',
    header: 'text-3xl font-bold bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent mb-2',
    subheader: 'text-slate-600 mb-8',
    section: 'bg-white rounded-2xl shadow-lg p-6 mb-6 border border-slate-200',
    sectionTitle: 'text-xl font-semibold text-slate-900 mb-4',
    sectionDesc: 'text-slate-600 mb-6',
    button: {
      primary: 'px-6 py-2 bg-gradient-to-r from-violet-500 to-indigo-600 text-white rounded-lg hover:from-violet-600 hover:to-indigo-700 transition-all shadow-lg',
      secondary: 'px-6 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors',
      disabled: 'px-6 py-2 bg-gradient-to-r from-slate-500 to-slate-600 text-white rounded-lg hover:from-slate-600 hover:to-slate-700 transition-all'
    },
    themeCard: 'relative border-2 rounded-xl p-6 cursor-pointer transition-all hover:shadow-lg',
    themeCardActive: 'border-violet-500 bg-gradient-to-br from-violet-50 to-indigo-50',
    themeCardInactive: 'border-slate-300 hover:border-slate-400',
    checkmark: 'absolute top-3 right-3 w-8 h-8 bg-gradient-to-r from-violet-500 to-indigo-600 rounded-full flex items-center justify-center shadow-lg'
  },
  luxury: {
    container: 'min-h-screen bg-gradient-to-br from-amber-50 via-yellow-50 to-amber-50 p-6',
    header: 'text-4xl font-bold bg-gradient-to-r from-amber-600 to-yellow-600 bg-clip-text text-transparent mb-3',
    subheader: 'text-amber-700 text-lg mb-8',
    section: 'bg-gradient-to-br from-white via-amber-50/30 to-yellow-50/50 rounded-3xl shadow-2xl p-8 mb-6 border-2 border-amber-200/50',
    sectionTitle: 'text-2xl font-bold text-amber-800 mb-4',
    sectionDesc: 'text-amber-700 mb-6',
    button: {
      primary: 'px-8 py-3 bg-gradient-to-r from-amber-400 to-yellow-500 text-white rounded-xl hover:from-amber-500 hover:to-yellow-600 transition-all shadow-xl font-semibold',
      secondary: 'px-8 py-3 border-2 border-amber-300 text-amber-700 rounded-xl hover:bg-amber-50 transition-colors font-semibold',
      disabled: 'px-8 py-3 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-xl hover:from-gray-600 hover:to-gray-700 transition-all shadow-xl font-semibold'
    },
    themeCard: 'relative border-2 rounded-2xl p-8 cursor-pointer transition-all hover:shadow-2xl backdrop-blur-sm',
    themeCardActive: 'border-amber-400 bg-gradient-to-br from-amber-100/70 to-yellow-100/70',
    themeCardInactive: 'border-amber-200/50 hover:border-amber-300',
    checkmark: 'absolute top-4 right-4 w-10 h-10 bg-gradient-to-r from-amber-400 to-yellow-500 rounded-full flex items-center justify-center shadow-xl'
  }
};

export function BaseAdminSystemSettingsPage() {
  const { user } = useAuthContext();
  const { 
    currentTheme, currentLayout, isAdmin, 
    setGlobalTheme, setGlobalLayout,
    setPreviewTheme, setPreviewLayout, 
    isPreviewMode, availableLayouts 
  } = useAdminTheme();
  const { config: chatConfig, updateConfig: updateChatConfig } = useChatConfig();
  
  // 필드 관리 상태
  const [fieldConfigs, setFieldConfigs] = useState<FieldConfig[]>([]);
  const [loadingFields, setLoadingFields] = useState(false);
  const [savingFields, setSavingFields] = useState(false);
  const [showAddField, setShowAddField] = useState(false);
  const [newField, setNewField] = useState<Partial<FieldConfig>>({
    field_key: '',
    label: '',
    field_type: 'text',
    is_required: false,
    is_enabled: true,
    show_in_list: true,
    is_searchable: true
  });
  
  // 현재 테마의 스타일 가져오기
  const theme = currentTheme as 'simple' | 'modern' | 'luxury';
  const styles = systemSettingsStyles[theme];
  
  // 실제 저장된 전역 테마와 레이아웃 (관리자는 selectedTheme도 확인)
  const globalTheme = localStorage.getItem('globalTheme');
  const selectedThemeStorage = localStorage.getItem('selectedTheme');
  const actualGlobalTheme = (globalTheme || 'simple') as 'simple' | 'modern' | 'luxury';
  const actualGlobalLayout = (localStorage.getItem('globalLayout') || 'classic') as 'classic' | 'modern' | 'minimal' | 'dashboard';
  
  // useRef를 사용하여 재렌더링 시에도 상태 유지
  const selectedThemeRef = useRef(actualGlobalTheme);
  const selectedLayoutRef = useRef(actualGlobalLayout);
  
  const [selectedTheme, setSelectedThemeInternal] = useState(actualGlobalTheme);
  const [selectedLayout, setSelectedLayoutInternal] = useState(actualGlobalLayout);
  const [hasChanges, setHasChanges] = useState(false);
  
  // 로그인 페이지 미리보기 상태
  const [showLoginPreview, setShowLoginPreview] = useState(false);
  const [previewTheme, setPreviewTheme] = useState<'simple' | 'modern' | 'luxury'>('simple');
  
  // 상태 업데이트 함수 래핑
  const setSelectedTheme = (theme: 'simple' | 'modern' | 'luxury') => {
    selectedThemeRef.current = theme;
    setSelectedThemeInternal(theme);
  };
  
  const setSelectedLayout = (layout: 'classic' | 'modern' | 'minimal' | 'dashboard') => {
    selectedLayoutRef.current = layout;
    setSelectedLayoutInternal(layout);
  };
  
  // localStorage 값이 변경되면 selectedTheme 업데이트
  useEffect(() => {
    const savedTheme = localStorage.getItem('globalTheme') as 'simple' | 'modern' | 'luxury';
    const savedLayout = localStorage.getItem('globalLayout') as 'classic' | 'modern' | 'minimal' | 'dashboard';
    
    if (savedTheme && savedTheme !== selectedTheme) {
      setSelectedTheme(savedTheme);
    }
    if (savedLayout && savedLayout !== selectedLayout) {
      setSelectedLayout(savedLayout);
    }
  }, []);

  // 관리자가 아니면 접근 차단
  if (!isAdmin) {
    return <Navigate to="/slots" replace />;
  }

  // 컴포넌트가 재렌더링될 때 ref 값으로 상태 복원
  useEffect(() => {
    if (selectedThemeRef.current !== selectedTheme) {
      setSelectedThemeInternal(selectedThemeRef.current);
    }
    if (selectedLayoutRef.current !== selectedLayout) {
      setSelectedLayoutInternal(selectedLayoutRef.current);
    }
  }, []);

  useEffect(() => {
    const themeChanged = selectedTheme !== actualGlobalTheme;
    const layoutChanged = selectedLayout !== actualGlobalLayout;
    const changes = themeChanged || layoutChanged;
    setHasChanges(changes);
  }, [selectedTheme, selectedLayout, actualGlobalTheme, actualGlobalLayout]);

  const handleThemeSelect = (theme: 'simple' | 'modern' | 'luxury') => {
    console.log('handleThemeSelect called with:', theme);
    setSelectedTheme(theme);
    // 바로 미리보기 활성화
    setPreviewTheme(theme);
  };
  
  const handleLayoutSelect = (layout: 'classic' | 'modern' | 'minimal' | 'dashboard') => {
    setSelectedLayout(layout);
    // 바로 미리보기 활성화
    setPreviewLayout(layout);
  };

  const handleApplyTheme = () => {
    // 변경사항이 있을 때만 실제로 적용
    if (hasChanges) {
      // 직접 localStorage에 저장 (새로고침 전에 확실히 저장)
      if (selectedTheme !== actualGlobalTheme) {
        localStorage.setItem('globalTheme', selectedTheme);
        // 관리자의 개인 테마도 리셋 (globalTheme을 따르도록)
        localStorage.removeItem('selectedTheme');
      }
      // 레이아웃이 변경되었으면 저장
      if (selectedLayout !== actualGlobalLayout) {
        localStorage.setItem('globalLayout', selectedLayout);
        localStorage.removeItem('selectedLayout');
      }
      
      alert('테마와 레이아웃이 적용되었습니다!');
      // 페이지 새로고침으로 변경사항 반영
      window.location.reload();
    } else {
      // 변경사항이 없으면 아무것도 하지 않음
      alert('변경사항이 없습니다.');
    }
  };

  const handleResetTheme = () => {
    setSelectedTheme(actualGlobalTheme);
    setSelectedLayout(actualGlobalLayout);
    setPreviewTheme(null);
    setPreviewLayout(null);
    setHasChanges(false);
  };

  const handleApplyLayout = () => {
    if (hasLayoutChanges && selectedLayout) {
      setGlobalLayout(selectedLayout);
      setPreviewLayout(null);
      alert('레이아웃이 적용되었습니다!');
      // 페이지 새로고침으로 변경사항 반영
      window.location.reload();
    } else if (!hasLayoutChanges) {
      alert('변경사항이 없습니다.');
    }
  };

  const handleResetLayout = () => {
    setSelectedLayout(actualGlobalLayout);
    setPreviewLayout(null);
  };

  const hasLayoutChanges = selectedLayout !== actualGlobalLayout;
  
  // 필드 설정 로드
  useEffect(() => {
    loadFieldConfigs();
  }, []);
  
  const loadFieldConfigs = async () => {
    setLoadingFields(true);
    try {
      const configs = await fieldConfigService.getFieldConfigs();
      // 시스템 생성 필드들은 시스템 설정에서 제외 (자동 생성되는 필드이므로)
      const filteredConfigs = configs.filter(config => !config.is_system_generated);
      setFieldConfigs(filteredConfigs);
    } catch (error) {
      console.error('필드 설정 로드 실패:', error);
      alert('필드 설정을 불러오는데 실패했습니다.');
    } finally {
      setLoadingFields(false);
    }
  };
  
  // 필드 설정 저장
  const handleSaveFieldConfigs = async () => {
    setSavingFields(true);
    try {
      const updatedConfigs = await fieldConfigService.updateFieldConfigs(fieldConfigs);
      setFieldConfigs(updatedConfigs);
      alert('필드 설정이 저장되었습니다.');
    } catch (error) {
      console.error('필드 설정 저장 실패:', error);
      alert('필드 설정 저장에 실패했습니다.');
    } finally {
      setSavingFields(false);
    }
  };
  
  // 필드 추가
  const handleAddField = async () => {
    if (!newField.field_key || !newField.label) {
      alert('필드 키와 레이블은 필수입니다.');
      return;
    }
    
    try {
      const addedField = await fieldConfigService.addFieldConfig({
        field_key: newField.field_key!,
        label: newField.label!,
        field_type: newField.field_type as any || 'text',
        is_required: newField.is_required || false,
        is_enabled: newField.is_enabled !== false,
        show_in_list: newField.show_in_list !== false,
        is_searchable: newField.is_searchable !== false,
        placeholder: newField.placeholder,
        validation_rule: newField.validation_rule,
        options: newField.options,
        default_value: newField.default_value,
        display_order: fieldConfigs.length + 1
      });
      
      setFieldConfigs([...fieldConfigs, addedField]);
      setShowAddField(false);
      setNewField({
        field_key: '',
        label: '',
        field_type: 'text',
        is_required: false,
        is_enabled: true,
        show_in_list: true,
        is_searchable: true
      });
    } catch (error: any) {
      alert(error.response?.data?.message || '필드 추가에 실패했습니다.');
    }
  };
  
  // 필드 삭제
  const handleDeleteField = async (fieldKey: string) => {
    if (['keyword', 'mid', 'url'].includes(fieldKey)) {
      alert('기본 필드는 삭제할 수 없습니다.');
      return;
    }
    
    if (!confirm('정말 이 필드를 삭제하시겠습니까?')) {
      return;
    }
    
    try {
      await fieldConfigService.deleteFieldConfig(fieldKey);
      setFieldConfigs(fieldConfigs.filter(f => f.field_key !== fieldKey));
    } catch (error) {
      alert('필드 삭제에 실패했습니다.');
    }
  };
  
  // 필드 설정 변경
  const handleFieldChange = (index: number, field: string, value: any) => {
    const updated = [...fieldConfigs];
    updated[index] = { ...updated[index], [field]: value };
    setFieldConfigs(updated);
  };
  
  // 필드 순서 변경
  const handleMoveField = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= fieldConfigs.length) return;
    
    const updated = [...fieldConfigs];
    const temp = updated[index];
    updated[index] = updated[newIndex];
    updated[newIndex] = temp;
    
    // display_order 업데이트
    updated.forEach((field, idx) => {
      field.display_order = idx + 1;
    });
    
    setFieldConfigs(updated);
  };

  const themes = [
    {
      id: 'simple' as const,
      name: '심플',
      description: '깔끔하고 심플한 디자인',
      preview: 'bg-blue-500',
      textColor: 'text-blue-600'
    },
    {
      id: 'modern' as const,
      name: '모던',
      description: '현대적이고 트렌디한 디자인',
      preview: 'bg-gradient-to-r from-violet-500 to-indigo-600',
      textColor: 'text-violet-600'
    },
    {
      id: 'luxury' as const,
      name: '럭셔리',
      description: '고급스럽고 화려한 비즈니스 디자인',
      preview: 'bg-gradient-to-r from-amber-400 to-yellow-500',
      textColor: 'text-amber-600'
    }
  ];

  return (
    <div className={styles.container}>
      <div className="max-w-7xl mx-auto">
        <h1 className={styles.header}>시스템 설정</h1>
        <p className={styles.subheader}>
          사이트 전체의 시스템 설정을 관리합니다.
        </p>

        {/* 사이트 정보 설정 */}
        <div className={styles.section} style={{border: '2px solid red', padding: '20px'}}>
          <h2 className={styles.sectionTitle} style={{color: 'red', fontSize: '24px', fontWeight: 'bold'}}>🔥 사이트 정보 설정 🔥</h2>
          <p className={styles.sectionDesc}>사이트 이름과 부제목을 설정합니다.</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                사이트 이름
              </label>
              <input
                type="text"
                value={getSetting('siteName', 'business') || 'Simple Slot'}
                onChange={(e) => updateSetting('siteName', e.target.value, 'business')}
                placeholder="사이트 이름을 입력하세요"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">사이드바와 상단 네비게이션에 표시됩니다</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                사이트 부제목
              </label>
              <input
                type="text"
                value={getSetting('siteTitle', 'business') || '유연한 디자인 시스템'}
                onChange={(e) => updateSetting('siteTitle', e.target.value, 'business')}
                placeholder="사이트 부제목을 입력하세요"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">브라우저 탭 제목에 표시됩니다</p>
            </div>
          </div>
        </div>

        {/* 테마 설정 섹션 */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>테마 설정</h2>
          <p className={styles.sectionDesc}>
            사이트 전체에 적용될 테마를 선택하세요. 변경 사항은 모든 사용자에게 적용됩니다.
            <br />
            <span className="text-sm text-blue-600 font-medium">
              💡 테마를 클릭하면 미리보기가 표시되고, 다시 클릭하면 적용 버튼이 활성화됩니다.
            </span>
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            {themes.map((themeOption) => (
              <div key={themeOption.id} className="relative">
                <div
                  onClick={() => handleThemeSelect(themeOption.id)}
                  className={`${styles.themeCard} ${
                    selectedTheme === themeOption.id
                      ? styles.themeCardActive
                      : styles.themeCardInactive
                  } ${
                    isPreviewMode && currentTheme === themeOption.id
                      ? 'ring-4 ring-blue-400 ring-opacity-50'
                      : ''
                  }`}
                >
                  {selectedTheme === themeOption.id && (
                    <div className={styles.checkmark}>
                      <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                  
                  <div className={`w-full h-20 rounded-md mb-3 ${themeOption.preview}`}></div>
                  <h3 className={`font-semibold ${themeOption.textColor}`}>{themeOption.name}</h3>
                  <p className="text-gray-500 text-sm">{themeOption.description}</p>
                </div>
                
                {/* 로그인 미리보기 버튼 */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setPreviewTheme(themeOption.id);
                    setShowLoginPreview(true);
                  }}
                  className="absolute top-3 left-3 px-2 py-1 bg-blue-500 text-white text-xs rounded shadow hover:bg-blue-600 transition-all"
                  title={`${themeOption.name} 로그인 페이지 미리보기`}
                >
                  미리보기
                </button>
              </div>
            ))}
          </div>

          {/* 적용 버튼들 - 항상 표시 */}
          <div className="flex items-center justify-between">
            <div className="flex gap-3">
              <button
                onClick={handleApplyTheme}
                className={hasChanges ? styles.button.primary : styles.button.disabled}
              >
                {hasChanges ? '테마 적용' : '현재 테마 유지'}
              </button>
              {hasChanges && (
                <button
                  onClick={handleResetTheme}
                  className={styles.button.secondary}
                >
                  취소
                </button>
              )}
            </div>
            
            <div className="text-sm text-gray-500">
              현재 적용된 테마: <span className="font-medium">{themes.find(t => t.id === actualGlobalTheme)?.name}</span>
            </div>
          </div>
        </div>

        {/* 레이아웃 설정 섹션 */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>레이아웃 설정</h2>
          <p className={styles.sectionDesc}>
            사이트의 전체적인 레이아웃 구조를 선택하세요.
            <br />
            <span className="text-sm text-blue-600 font-medium">
              💡 레이아웃을 클릭하면 미리보기가 표시되고, 다시 클릭하면 적용 버튼이 활성화됩니다.
            </span>
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {availableLayouts.map((layout) => (
              <div
                key={layout.key}
                className={`${styles.themeCard} ${
                  (isPreviewMode ? currentLayout : selectedLayout) === layout.key
                    ? styles.themeCardActive
                    : styles.themeCardInactive
                }`}
                onClick={() => handleLayoutSelect(layout.key)}
              >
                {(isPreviewMode ? currentLayout : selectedLayout) === layout.key && (
                  <div className={styles.checkmark}>
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
                
                <div className="flex items-center mb-3">
                  <div className={`w-16 h-16 rounded-md ${layout.preview} flex-shrink-0`}></div>
                  <div className="ml-4">
                    <h3 className="font-semibold text-gray-900">{layout.name}</h3>
                    <p className="text-gray-500 text-sm">{layout.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {/* 레이아웃 적용 버튼 - 항상 표시 */}
          <div className="flex items-center justify-between">
            <div className="flex gap-3">
              <button
                onClick={handleApplyLayout}
                className={hasLayoutChanges ? styles.button.primary : styles.button.disabled}
              >
                {hasLayoutChanges ? '레이아웃 적용' : '현재 레이아웃 유지'}
              </button>
              {hasLayoutChanges && (
                <button
                  onClick={handleResetLayout}
                  className={styles.button.secondary}
                >
                  취소
                </button>
              )}
            </div>
            
            <div className="text-sm text-gray-500">
              현재 적용된 레이아웃: <span className="font-medium">{availableLayouts.find(l => l.key === actualGlobalLayout)?.name}</span>
            </div>
          </div>
        </div>

        {/* 채팅 시스템 설정 */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>채팅 시스템 설정</h2>
          <p className={styles.sectionDesc}>채팅 기능을 테마별로 활성화/비활성화할 수 있습니다.</p>
          
          {/* 전체 채팅 활성화 */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={chatConfig.enabled}
                onChange={(e) => updateChatConfig({ enabled: e.target.checked })}
                className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
              />
              <div>
                <span className="font-medium text-gray-900">전체 채팅 기능 활성화</span>
                <p className="text-sm text-gray-500">이 옵션을 끄면 모든 테마에서 채팅 기능이 비활성화됩니다.</p>
              </div>
            </label>
          </div>

          {/* 테마별 설정 */}
          {chatConfig.enabled && (
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900 mb-3">테마별 채팅 설정</h3>
              
              {/* Simple 테마 */}
              <div className="p-4 border border-gray-200 rounded-lg">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-medium text-gray-900">Simple 테마</h4>
                    <p className="text-sm text-gray-500">기본 채팅 버튼 표시</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={chatConfig.themes.simple.enabled}
                    onChange={(e) => updateChatConfig({ 
                      themes: { 
                        ...chatConfig.themes, 
                        simple: { ...chatConfig.themes.simple, enabled: e.target.checked }
                      }
                    })}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Modern 테마 */}
              <div className="p-4 border border-gray-200 rounded-lg">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-medium text-gray-900">Modern 테마</h4>
                    <p className="text-sm text-gray-500">고급 채팅 관리 시스템</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={chatConfig.themes.modern.enabled}
                    onChange={(e) => updateChatConfig({ 
                      themes: { 
                        ...chatConfig.themes, 
                        modern: { ...chatConfig.themes.modern, enabled: e.target.checked }
                      }
                    })}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Luxury 테마 */}
              <div className="p-4 border border-gray-200 rounded-lg">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-medium text-gray-900">Luxury 테마</h4>
                    <p className="text-sm text-gray-500">프리미엄 VIP 채팅 서비스</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={chatConfig.themes.luxury.enabled}
                    onChange={(e) => updateChatConfig({ 
                      themes: { 
                        ...chatConfig.themes, 
                        luxury: { ...chatConfig.themes.luxury, enabled: e.target.checked }
                      }
                    })}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* 자동 응답 설정 */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="font-medium text-gray-900 mb-3">자동 응답 설정</h3>
            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={chatConfig.autoReply.enabled}
                onChange={(e) => updateChatConfig({ 
                  autoReply: { ...chatConfig.autoReply, enabled: e.target.checked }
                })}
                className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
              />
              <div>
                <span className="font-medium text-gray-900">자동 응답 활성화</span>
                <p className="text-sm text-gray-500">사용자 문의 시 자동으로 응답 메시지를 전송합니다.</p>
              </div>
            </label>
          </div>
        </div>

        {/* 입력 필드 관리 */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>입력 필드 관리</h2>
          <p className={styles.sectionDesc}>
            슬롯 등록 시 입력받을 필드를 관리합니다. 각 필드의 활성화 여부와 필수 여부를 설정할 수 있습니다.
          </p>
          
          {loadingFields ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
              <p className="mt-2 text-gray-500">필드 설정을 불러오는 중...</p>
            </div>
          ) : (
            <>
              {/* 필드 목록 */}
              <div className="space-y-3 mb-6">
                {fieldConfigs.map((field, index) => (
                  <div key={field.field_key} className="border rounded-lg p-4 bg-gray-50">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <span className="font-medium text-gray-900">{field.label}</span>
                        <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded">
                          {field.field_key}
                        </span>
                        <span className="text-xs text-gray-500 bg-blue-100 px-2 py-1 rounded">
                          {field.field_type}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleMoveField(index, 'up')}
                          disabled={index === 0}
                          className="p-1 text-gray-500 hover:text-gray-700 disabled:opacity-30"
                        >
                          <ArrowUpIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleMoveField(index, 'down')}
                          disabled={index === fieldConfigs.length - 1}
                          className="p-1 text-gray-500 hover:text-gray-700 disabled:opacity-30"
                        >
                          <ArrowDownIcon className="w-4 h-4" />
                        </button>
                        {!['keyword', 'mid', 'url'].includes(field.field_key) && (
                          <button
                            onClick={() => handleDeleteField(field.field_key)}
                            className="p-1 text-red-500 hover:text-red-700"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-4 gap-4">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={field.is_enabled}
                          onChange={(e) => handleFieldChange(index, 'is_enabled', e.target.checked)}
                          className="mr-2"
                        />
                        <span className="text-sm">활성화</span>
                      </label>
                      
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={field.is_required}
                          onChange={(e) => handleFieldChange(index, 'is_required', e.target.checked)}
                          disabled={!field.is_enabled}
                          className="mr-2"
                        />
                        <span className="text-sm">필수</span>
                      </label>
                      
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={field.show_in_list}
                          onChange={(e) => handleFieldChange(index, 'show_in_list', e.target.checked)}
                          className="mr-2"
                        />
                        <span className="text-sm">리스트 표시</span>
                      </label>
                      
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={field.is_searchable}
                          onChange={(e) => handleFieldChange(index, 'is_searchable', e.target.checked)}
                          className="mr-2"
                        />
                        <span className="text-sm">검색 가능</span>
                      </label>
                    </div>
                    
                    {field.is_enabled && (
                      <div className="mt-3">
                        <input
                          type="text"
                          value={field.placeholder || ''}
                          onChange={(e) => handleFieldChange(index, 'placeholder', e.target.value)}
                          placeholder="플레이스홀더 텍스트"
                          className="w-full px-3 py-1 text-sm border border-gray-300 rounded"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
              
              {/* 새 필드 추가 */}
              {showAddField ? (
                <div className="border-2 border-dashed border-blue-300 rounded-lg p-4 bg-blue-50">
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <input
                      type="text"
                      value={newField.field_key || ''}
                      onChange={(e) => setNewField({ ...newField, field_key: e.target.value })}
                      placeholder="필드 키 (영문)"
                      className="px-3 py-2 border border-gray-300 rounded"
                    />
                    <input
                      type="text"
                      value={newField.label || ''}
                      onChange={(e) => setNewField({ ...newField, label: e.target.value })}
                      placeholder="필드 레이블"
                      className="px-3 py-2 border border-gray-300 rounded"
                    />
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <select
                      value={newField.field_type}
                      onChange={(e) => setNewField({ ...newField, field_type: e.target.value as any })}
                      className="px-3 py-2 border border-gray-300 rounded"
                    >
                      <option value="text">텍스트</option>
                      <option value="number">숫자</option>
                      <option value="url">URL</option>
                      <option value="textarea">긴 텍스트</option>
                      <option value="select">선택</option>
                      <option value="date">날짜</option>
                      <option value="email">이메일</option>
                    </select>
                    
                    <input
                      type="text"
                      value={newField.placeholder || ''}
                      onChange={(e) => setNewField({ ...newField, placeholder: e.target.value })}
                      placeholder="플레이스홀더"
                      className="px-3 py-2 border border-gray-300 rounded"
                    />
                    
                    <input
                      type="text"
                      value={newField.default_value || ''}
                      onChange={(e) => setNewField({ ...newField, default_value: e.target.value })}
                      placeholder="기본값"
                      className="px-3 py-2 border border-gray-300 rounded"
                    />
                  </div>
                  
                  <div className="flex justify-between">
                    <div className="flex gap-4">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={newField.is_required}
                          onChange={(e) => setNewField({ ...newField, is_required: e.target.checked })}
                          className="mr-2"
                        />
                        <span className="text-sm">필수</span>
                      </label>
                      
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={newField.show_in_list !== false}
                          onChange={(e) => setNewField({ ...newField, show_in_list: e.target.checked })}
                          className="mr-2"
                        />
                        <span className="text-sm">리스트 표시</span>
                      </label>
                      
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={newField.is_searchable !== false}
                          onChange={(e) => setNewField({ ...newField, is_searchable: e.target.checked })}
                          className="mr-2"
                        />
                        <span className="text-sm">검색 가능</span>
                      </label>
                    </div>
                    
                    <div className="flex gap-2">
                      <button
                        onClick={handleAddField}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        <CheckIcon className="w-4 h-4 inline mr-1" />
                        추가
                      </button>
                      <button
                        onClick={() => {
                          setShowAddField(false);
                          setNewField({
                            field_key: '',
                            label: '',
                            field_type: 'text',
                            is_required: false,
                            is_enabled: true,
                            show_in_list: true,
                            is_searchable: true
                          });
                        }}
                        className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                      >
                        <XMarkIcon className="w-4 h-4 inline mr-1" />
                        취소
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowAddField(true)}
                  className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-colors"
                >
                  <PlusIcon className="w-5 h-5 inline mr-2" />
                  새 필드 추가
                </button>
              )}
              
              {/* 저장 버튼 */}
              <div className="flex justify-between mt-6">
                <button
                  onClick={handleSaveFieldConfigs}
                  disabled={savingFields}
                  className={styles.button.primary}
                >
                  {savingFields ? '저장 중...' : '필드 설정 저장'}
                </button>
                
                <button
                  onClick={async () => {
                    if (confirm('필드 설정을 초기화하시겠습니까? 모든 커스텀 필드가 삭제됩니다.')) {
                      try {
                        const configs = await fieldConfigService.resetFieldConfigs();
                        setFieldConfigs(configs);
                        alert('필드 설정이 초기화되었습니다.');
                      } catch (error) {
                        alert('초기화에 실패했습니다.');
                      }
                    }
                  }}
                  className={styles.button.secondary}
                >
                  초기화
                </button>
              </div>
            </>
          )}
        </div>

        {/* 기타 시스템 설정 */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>기타 설정</h2>
          <p className="text-gray-500">추가 시스템 설정은 향후 업데이트에서 제공될 예정입니다.</p>
        </div>
      </div>
      
      {/* 로그인 페이지 미리보기 모달 */}
      {showLoginPreview && (
        <LoginPreview
          previewTheme={previewTheme}
          onClose={() => setShowLoginPreview(false)}
        />
      )}
    </div>
  );
}