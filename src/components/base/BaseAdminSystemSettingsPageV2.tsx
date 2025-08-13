import { useState, useEffect } from 'react';
import { useAuthContext } from '@/adapters/react';
import { useSystemSettings } from '@/contexts/SystemSettingsContext';
import { Navigate } from 'react-router-dom';
import { fieldConfigService, FieldConfig } from '@/adapters/services/ApiFieldConfigService';
import { LoginPreview } from '@/components/LoginPreview';
import { 
  PlusIcon, 
  TrashIcon, 
  ArrowUpIcon, 
  ArrowDownIcon,
  CheckIcon,
  XMarkIcon,
  PaintBrushIcon,
  CurrencyDollarIcon,
  SparklesIcon,
  AdjustmentsHorizontalIcon,
  EyeIcon
} from '@heroicons/react/24/outline';

// 테마별 스타일 정의
export const systemSettingsStyles = {
  simple: {
    container: 'min-h-screen bg-gray-50 p-6',
    header: 'text-3xl font-bold text-gray-900 mb-2',
    subheader: 'text-gray-600 mb-8',
    tabContainer: 'flex space-x-1 mb-6 bg-white rounded-lg shadow p-1',
    tab: 'flex items-center space-x-2 px-4 py-2 rounded-md font-medium transition-all cursor-pointer',
    activeTab: 'bg-blue-600 text-white',
    inactiveTab: 'text-gray-600 hover:text-gray-900 hover:bg-gray-100',
    section: 'bg-white rounded-lg shadow p-6',
    sectionTitle: 'text-xl font-semibold mb-4',
    sectionDesc: 'text-gray-600 mb-6',
    button: {
      primary: 'px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors',
      secondary: 'px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors',
      danger: 'px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors'
    },
    themeCard: 'relative border-2 rounded-lg p-6 cursor-pointer transition-all',
    themeCardActive: 'border-blue-500 bg-blue-50',
    themeCardInactive: 'border-gray-300 hover:border-gray-400',
    checkmark: 'absolute top-3 right-3 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center',
    input: 'w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500',
    switch: 'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
    switchEnabled: 'bg-blue-600',
    switchDisabled: 'bg-gray-200',
    switchToggle: 'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
    fieldRow: 'flex items-center space-x-4 p-4 bg-gray-50 rounded-lg'
  },
  modern: {
    container: 'min-h-screen bg-gradient-to-br from-slate-50 to-white p-6',
    header: 'text-3xl font-bold bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent mb-2',
    subheader: 'text-slate-600 mb-8',
    tabContainer: 'flex space-x-2 mb-6 bg-white/80 backdrop-blur rounded-xl shadow-lg p-2',
    tab: 'flex items-center space-x-2 px-4 py-2.5 rounded-lg font-medium transition-all cursor-pointer',
    activeTab: 'bg-gradient-to-r from-violet-500 to-indigo-600 text-white shadow-lg',
    inactiveTab: 'text-slate-600 hover:text-slate-900 hover:bg-slate-100',
    section: 'bg-white rounded-2xl shadow-lg p-6 border border-slate-200',
    sectionTitle: 'text-xl font-semibold text-slate-900 mb-4',
    sectionDesc: 'text-slate-600 mb-6',
    button: {
      primary: 'px-6 py-2 bg-gradient-to-r from-violet-500 to-indigo-600 text-white rounded-lg hover:from-violet-600 hover:to-indigo-700 transition-all shadow-lg',
      secondary: 'px-6 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors',
      danger: 'px-6 py-2 bg-gradient-to-r from-red-500 to-pink-600 text-white rounded-lg hover:from-red-600 hover:to-pink-700 transition-all shadow-lg'
    },
    themeCard: 'relative border-2 rounded-xl p-6 cursor-pointer transition-all hover:shadow-lg',
    themeCardActive: 'border-violet-500 bg-gradient-to-br from-violet-50 to-indigo-50',
    themeCardInactive: 'border-slate-300 hover:border-slate-400',
    checkmark: 'absolute top-3 right-3 w-8 h-8 bg-gradient-to-r from-violet-500 to-indigo-600 rounded-full flex items-center justify-center shadow-lg',
    input: 'w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-violet-500 focus:border-violet-500',
    switch: 'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
    switchEnabled: 'bg-gradient-to-r from-violet-500 to-indigo-600',
    switchDisabled: 'bg-slate-200',
    switchToggle: 'inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform',
    fieldRow: 'flex items-center space-x-4 p-4 bg-gradient-to-r from-slate-50 to-white rounded-xl'
  },
  luxury: {
    container: 'min-h-screen bg-gradient-to-br from-amber-50 via-yellow-50 to-amber-50 p-6',
    header: 'text-4xl font-bold bg-gradient-to-r from-amber-600 to-yellow-600 bg-clip-text text-transparent mb-3',
    subheader: 'text-amber-700 text-lg mb-8',
    tabContainer: 'flex space-x-3 mb-8 bg-gradient-to-br from-white via-amber-50/30 to-yellow-50/50 rounded-2xl shadow-2xl p-3 border-2 border-amber-200/50',
    tab: 'flex items-center space-x-2 px-5 py-3 rounded-xl font-semibold transition-all cursor-pointer',
    activeTab: 'bg-gradient-to-r from-amber-400 to-yellow-500 text-white shadow-xl',
    inactiveTab: 'text-amber-700 hover:text-amber-900 hover:bg-amber-100',
    section: 'bg-gradient-to-br from-white via-amber-50/30 to-yellow-50/50 rounded-3xl shadow-2xl p-8 border-2 border-amber-200/50',
    sectionTitle: 'text-2xl font-bold text-amber-800 mb-4',
    sectionDesc: 'text-amber-700 mb-6',
    button: {
      primary: 'px-8 py-3 bg-gradient-to-r from-amber-400 to-yellow-500 text-white rounded-xl hover:from-amber-500 hover:to-yellow-600 transition-all shadow-xl font-semibold',
      secondary: 'px-8 py-3 border-2 border-amber-300 text-amber-700 rounded-xl hover:bg-amber-50 transition-colors font-semibold',
      danger: 'px-8 py-3 bg-gradient-to-r from-red-500 to-orange-600 text-white rounded-xl hover:from-red-600 hover:to-orange-700 transition-all shadow-xl font-semibold'
    },
    themeCard: 'relative border-2 rounded-2xl p-8 cursor-pointer transition-all hover:shadow-2xl backdrop-blur-sm',
    themeCardActive: 'border-amber-400 bg-gradient-to-br from-amber-100/70 to-yellow-100/70',
    themeCardInactive: 'border-amber-200/50 hover:border-amber-300',
    checkmark: 'absolute top-4 right-4 w-10 h-10 bg-gradient-to-r from-amber-400 to-yellow-500 rounded-full flex items-center justify-center shadow-xl',
    input: 'w-full px-4 py-3 border-2 border-amber-200 rounded-xl focus:ring-amber-500 focus:border-amber-500 bg-white/80',
    switch: 'relative inline-flex h-7 w-14 items-center rounded-full transition-colors',
    switchEnabled: 'bg-gradient-to-r from-amber-400 to-yellow-500',
    switchDisabled: 'bg-amber-200',
    switchToggle: 'inline-block h-5 w-5 transform rounded-full bg-white shadow-lg transition-transform',
    fieldRow: 'flex items-center space-x-4 p-5 bg-gradient-to-r from-amber-50 to-yellow-50 rounded-2xl border border-amber-200/30'
  }
};

type TabType = 'theme' | 'field' | 'business' | 'feature';

export function BaseAdminSystemSettingsPageV2() {
  const { user } = useAuthContext();
  
  console.log('BaseAdminSystemSettingsPageV2 - Current user:', user);
  console.log('User role:', user?.role);
  const { 
    currentTheme, 
    currentLayout, 
    isAdmin,
    setGlobalTheme,
    setGlobalLayout,
    setPreviewTheme,
    setPreviewLayout,
    availableThemes,
    availableLayouts,
    getSetting,
    updateSetting,
    updateMultipleSettings,
    isLoading,
    settings
  } = useSystemSettings();
  
  const [activeTab, setActiveTab] = useState<TabType>('theme');
  const [hasChanges, setHasChanges] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<Record<string, any>>({});
  
  // 로그인 페이지 미리보기 상태
  const [showLoginPreview, setShowLoginPreview] = useState(false);
  const [loginPreviewTheme, setLoginPreviewTheme] = useState<'simple' | 'modern' | 'luxury'>('simple');
  
  // 필드 관리 상태 (기존 코드)
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
  
  // 비즈니스 설정 상태
  const [businessSettings, setBusinessSettings] = useState({
    useCashSystem: true,
    cashChargeMode: 'modal',
    defaultSlotPrice: 50000,
    minCashCharge: 10000,
    maxCashCharge: 1000000,
    slotAutoApproval: false,
    cashAutoApproval: false,
    maxSlotsPerUser: 100,
    maintenanceMode: false,
    registrationEnabled: true,
    slotOperationMode: 'normal', // normal | pre-allocation
    defaultSlotAllocation: 10
  });
  
  // 기능 설정 상태
  const [featureSettings, setFeatureSettings] = useState({
    chatEnabled: false,
    chatMaxMessages: 100,
    chatSoundEnabled: true,
    notificationEnabled: true,
    notificationSound: true,
    notificationAutoRead: false,
    notificationDuration: 5000,
    featureCashHistory: true,
    featureRanking: true,
    featureSlotManagement: true
  });
  
  // 테마별 스타일 가져오기
  const theme = currentTheme as 'simple' | 'modern' | 'luxury';
  const styles = systemSettingsStyles[theme];
  
  // 관리자가 아니면 접근 차단
  if (!isAdmin) {
    return <Navigate to="/slots" replace />;
  }
  
  // 로그인 미리보기 이벤트 리스너
  useEffect(() => {
    const handleShowLoginPreview = (event: CustomEvent) => {
      setLoginPreviewTheme(event.detail.theme);
      setShowLoginPreview(true);
    };
    
    window.addEventListener('showLoginPreview', handleShowLoginPreview as EventListener);
    
    return () => {
      window.removeEventListener('showLoginPreview', handleShowLoginPreview as EventListener);
    };
  }, []);
  
  // 설정 로드
  useEffect(() => {
    if (settings.business) {
      setBusinessSettings({
        useCashSystem: getSetting('useCashSystem', 'business') ?? true,
        cashChargeMode: getSetting('cashChargeMode', 'business') ?? 'modal',
        defaultSlotPrice: getSetting('defaultSlotPrice', 'business') ?? 50000,
        minCashCharge: getSetting('minCashCharge', 'business') ?? 10000,
        maxCashCharge: getSetting('maxCashCharge', 'business') ?? 1000000,
        slotAutoApproval: getSetting('slotAutoApproval', 'business') ?? false,
        cashAutoApproval: getSetting('cashAutoApproval', 'business') ?? false,
        maxSlotsPerUser: getSetting('maxSlotsPerUser', 'business') ?? 100,
        maintenanceMode: getSetting('maintenanceMode', 'business') ?? false,
        registrationEnabled: getSetting('registrationEnabled', 'business') ?? true,
        slotOperationMode: getSetting('slotOperationMode', 'business') ?? 'normal',
        defaultSlotAllocation: getSetting('defaultSlotAllocation', 'business') ?? 10
      });
    }
    
    if (settings.feature) {
      setFeatureSettings({
        chatEnabled: getSetting('chatEnabled', 'feature') ?? false,
        chatMaxMessages: getSetting('chatMaxMessages', 'feature') ?? 100,
        chatSoundEnabled: getSetting('chatSoundEnabled', 'feature') ?? true,
        notificationEnabled: getSetting('notificationEnabled', 'feature') ?? true,
        notificationSound: getSetting('notificationSound', 'feature') ?? true,
        notificationAutoRead: getSetting('notificationAutoRead', 'feature') ?? false,
        notificationDuration: getSetting('notificationDuration', 'feature') ?? 5000,
        featureCashHistory: getSetting('featureCashHistory', 'feature') ?? true,
        featureRanking: getSetting('featureRanking', 'feature') ?? true,
        featureSlotManagement: getSetting('featureSlotManagement', 'feature') ?? true
      });
    }
  }, [settings, getSetting]);
  
  // 필드 설정 로드 (기존 코드)
  useEffect(() => {
    if (activeTab === 'field') {
      loadFieldConfigs();
    }
  }, [activeTab]);
  
  const loadFieldConfigs = async () => {
    setLoadingFields(true);
    try {
      const configs = await fieldConfigService.getFieldConfigs();
      // URL 파싱 필드들은 시스템 설정에서 제외 (자동 생성되는 필드이므로)
      const filteredConfigs = configs.filter(config => 
        !['url_product_id', 'url_item_id', 'url_vendor_item_id'].includes(config.field_key)
      );
      setFieldConfigs(filteredConfigs);
    } catch (error) {
      console.error('Failed to load field configs:', error);
    } finally {
      setLoadingFields(false);
    }
  };
  
  // 테마 설정 저장
  const handleSaveThemeSettings = async () => {
    try {
      await setGlobalTheme(currentTheme);
      await setGlobalLayout(currentLayout);
      alert('테마 설정이 저장되었습니다.');
      window.location.reload();
    } catch (error) {
      alert('테마 설정 저장에 실패했습니다.');
    }
  };
  
  // 비즈니스 설정 변경 핸들러
  const handleChange = (key: string, value: any) => {
    setBusinessSettings(prev => ({
      ...prev,
      [key]: value
    }));
    setHasChanges(true);
  };

  // 비즈니스 설정 저장
  const handleSaveBusinessSettings = async () => {
    try {
      const settingsToUpdate = Object.entries(businessSettings).map(([key, value]) => ({
        key,
        value,
        category: 'business'
      }));
      
      await updateMultipleSettings(settingsToUpdate);
      alert('비즈니스 설정이 저장되었습니다.');
      setHasChanges(false);
    } catch (error) {
      alert('비즈니스 설정 저장에 실패했습니다.');
    }
  };
  
  // 기능 설정 저장
  const handleSaveFeatureSettings = async () => {
    try {
      const settingsToUpdate = Object.entries(featureSettings).map(([key, value]) => ({
        key,
        value,
        category: 'feature'
      }));
      
      await updateMultipleSettings(settingsToUpdate);
      alert('기능 설정이 저장되었습니다.');
      setHasChanges(false);
    } catch (error) {
      alert('기능 설정 저장에 실패했습니다.');
    }
  };
  
  // 필드 설정 저장 (기존 코드)
  const handleSaveFieldConfigs = async () => {
    setSavingFields(true);
    try {
      await fieldConfigService.updateFieldConfigs(fieldConfigs);
      alert('필드 설정이 저장되었습니다.');
    } catch (error) {
      console.error('Failed to save field configs:', error);
      alert('필드 설정 저장에 실패했습니다.');
    } finally {
      setSavingFields(false);
    }
  };
  
  const tabs = [
    { key: 'theme' as TabType, label: '테마 설정', icon: PaintBrushIcon },
    { key: 'field' as TabType, label: '필드 설정', icon: AdjustmentsHorizontalIcon },
    { key: 'business' as TabType, label: '비즈니스 설정', icon: CurrencyDollarIcon },
    { key: 'feature' as TabType, label: '기능 설정', icon: SparklesIcon }
  ];
  
  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">설정을 불러오는 중...</div>
        </div>
      </div>
    );
  }
  
  return (
    <div className={styles.container}>
      <h1 className={styles.header}>시스템 설정</h1>
      <p className={styles.subheader}>시스템 전체 설정을 관리합니다</p>
      
      {/* 탭 네비게이션 */}
      <div className={styles.tabContainer}>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`${styles.tab} ${
                activeTab === tab.key ? styles.activeTab : styles.inactiveTab
              }`}
            >
              <Icon className="w-5 h-5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
      
      {/* 탭 컨텐츠 */}
      <div className={styles.section}>
        {activeTab === 'theme' && (
          <ThemeSettingsTab
            styles={styles}
            currentTheme={currentTheme}
            currentLayout={currentLayout}
            availableThemes={availableThemes}
            availableLayouts={availableLayouts}
            onThemeChange={(theme) => setPreviewTheme(theme)}
            onLayoutChange={(layout) => setPreviewLayout(layout)}
            onSave={handleSaveThemeSettings}
          />
        )}
        
        {activeTab === 'field' && (
          <FieldSettingsTab
            styles={styles}
            fieldConfigs={fieldConfigs}
            setFieldConfigs={setFieldConfigs}
            showAddField={showAddField}
            setShowAddField={setShowAddField}
            newField={newField}
            setNewField={setNewField}
            loadingFields={loadingFields}
            savingFields={savingFields}
            onSave={handleSaveFieldConfigs}
          />
        )}
        
        {activeTab === 'business' && (
          <BusinessSettingsTab
            styles={styles}
            settings={businessSettings}
            onChange={setBusinessSettings}
            onSave={handleSaveBusinessSettings}
          />
        )}
        
        {activeTab === 'feature' && (
          <FeatureSettingsTab
            styles={styles}
            settings={featureSettings}
            onChange={setFeatureSettings}
            onSave={handleSaveFeatureSettings}
          />
        )}
      </div>
      
      {/* 로그인 페이지 미리보기 모달 */}
      {showLoginPreview && (
        <LoginPreview
          previewTheme={loginPreviewTheme}
          onClose={() => setShowLoginPreview(false)}
        />
      )}
    </div>
  );
}

// 테마 설정 탭 컴포넌트
function ThemeSettingsTab({ styles, currentTheme, currentLayout, availableThemes, availableLayouts, onThemeChange, onLayoutChange, onSave }: any) {
  const [selectedTheme, setSelectedTheme] = useState(currentTheme);
  const [selectedLayout, setSelectedLayout] = useState(currentLayout);
  
  return (
    <div>
      <h2 className={styles.sectionTitle}>테마 및 레이아웃 설정</h2>
      <p className={styles.sectionDesc}>시스템 전체에 적용될 테마와 레이아웃을 선택합니다</p>
      
      <div className="space-y-8">
        {/* 테마 선택 */}
        <div>
          <h3 className="font-semibold mb-4">테마 선택</h3>
          <div className="grid grid-cols-3 gap-4">
            {availableThemes.map((theme: any) => (
              <div key={theme.key} className="relative">
                <div
                  onClick={() => {
                    setSelectedTheme(theme.key);
                    onThemeChange(theme.key);
                  }}
                  className={`${styles.themeCard} ${
                    selectedTheme === theme.key ? styles.themeCardActive : styles.themeCardInactive
                  }`}
                >
                  {selectedTheme === theme.key && (
                    <div className={styles.checkmark}>
                      <CheckIcon className="w-5 h-5 text-white" />
                    </div>
                  )}
                  <h4 className="font-semibold mb-2">{theme.name}</h4>
                  <p className="text-sm opacity-75">{theme.description}</p>
                  <div className={`mt-4 h-20 rounded-lg ${theme.preview}`} />
                </div>
                
                {/* 로그인 미리보기 버튼 */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    // 부모 컴포넌트에서 상태를 관리하기 위해 window 이벤트 사용
                    window.dispatchEvent(new CustomEvent('showLoginPreview', { 
                      detail: { theme: theme.key } 
                    }));
                  }}
                  className="absolute top-3 right-14 p-2 bg-white/90 hover:bg-white rounded-lg shadow-md transition-all group z-10"
                  title={`${theme.name} 로그인 페이지 미리보기`}
                >
                  <svg className="w-4 h-4 text-gray-600 group-hover:text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
        
        {/* 레이아웃 선택 */}
        <div>
          <h3 className="font-semibold mb-4">레이아웃 선택</h3>
          <div className="grid grid-cols-2 gap-4">
            {availableLayouts.map((layout: any) => (
              <div
                key={layout.key}
                onClick={() => {
                  setSelectedLayout(layout.key);
                  onLayoutChange(layout.key);
                }}
                className={`${styles.themeCard} ${
                  selectedLayout === layout.key ? styles.themeCardActive : styles.themeCardInactive
                }`}
              >
                {selectedLayout === layout.key && (
                  <div className={styles.checkmark}>
                    <CheckIcon className="w-5 h-5 text-white" />
                  </div>
                )}
                <h4 className="font-semibold mb-2">{layout.name}</h4>
                <p className="text-sm opacity-75">{layout.description}</p>
              </div>
            ))}
          </div>
        </div>
        
        {/* 저장 버튼 */}
        <div className="flex justify-end space-x-3">
          <button className={styles.button.secondary}>초기화</button>
          <button onClick={onSave} className={styles.button.primary}>저장</button>
        </div>
      </div>
    </div>
  );
}

// 필드 설정 탭 컴포넌트 (기존 코드 활용)
function FieldSettingsTab({ styles, fieldConfigs, setFieldConfigs, showAddField, setShowAddField, newField, setNewField, loadingFields, savingFields, onSave }: any) {
  const handleToggleField = (index: number, field: keyof FieldConfig) => {
    const updated = [...fieldConfigs];
    (updated[index] as any)[field] = !(updated[index] as any)[field];
    setFieldConfigs(updated);
  };
  
  const handleMoveField = (index: number, direction: 'up' | 'down') => {
    const updated = [...fieldConfigs];
    if (direction === 'up' && index > 0) {
      [updated[index], updated[index - 1]] = [updated[index - 1], updated[index]];
    } else if (direction === 'down' && index < updated.length - 1) {
      [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
    }
    setFieldConfigs(updated);
  };
  
  const handleAddField = () => {
    if (!newField.field_key || !newField.label) {
      alert('필드 키와 라벨은 필수입니다.');
      return;
    }
    
    const newFieldConfig: FieldConfig = {
      ...newField as FieldConfig,
      order_index: fieldConfigs.length
    };
    
    setFieldConfigs([...fieldConfigs, newFieldConfig]);
    setNewField({
      field_key: '',
      label: '',
      field_type: 'text',
      is_required: false,
      is_enabled: true,
      show_in_list: true,
      is_searchable: true
    });
    setShowAddField(false);
  };
  
  return (
    <div>
      <h2 className={styles.sectionTitle}>필드 설정</h2>
      <p className={styles.sectionDesc}>슬롯 등록 시 사용할 필드를 관리합니다</p>
      
      {loadingFields ? (
        <div className="text-center py-8">필드 설정을 불러오는 중...</div>
      ) : (
        <div className="space-y-4">
          {fieldConfigs.map((field, index) => (
            <div key={field.field_key} className={styles.fieldRow}>
              <div className="flex-1">
                <div className="font-medium">{field.label}</div>
                <div className="text-sm opacity-75">키: {field.field_key} | 타입: {field.field_type}</div>
              </div>
              
              <div className="flex items-center space-x-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={field.is_enabled}
                    onChange={() => handleToggleField(index, 'is_enabled')}
                    className="mr-2"
                  />
                  <span className="text-sm">활성화</span>
                </label>
                
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={field.is_required}
                    onChange={() => handleToggleField(index, 'is_required')}
                    className="mr-2"
                  />
                  <span className="text-sm">필수</span>
                </label>
                
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={field.show_in_list}
                    onChange={() => handleToggleField(index, 'show_in_list')}
                    className="mr-2"
                  />
                  <span className="text-sm">목록 표시</span>
                </label>
                
                <button
                  onClick={() => handleMoveField(index, 'up')}
                  disabled={index === 0}
                  className="p-1 hover:bg-gray-200 rounded disabled:opacity-50"
                >
                  <ArrowUpIcon className="w-4 h-4" />
                </button>
                
                <button
                  onClick={() => handleMoveField(index, 'down')}
                  disabled={index === fieldConfigs.length - 1}
                  className="p-1 hover:bg-gray-200 rounded disabled:opacity-50"
                >
                  <ArrowDownIcon className="w-4 h-4" />
                </button>
                
                <button
                  onClick={() => {
                    if (confirm('이 필드를 삭제하시겠습니까?')) {
                      setFieldConfigs(fieldConfigs.filter((_, i) => i !== index));
                    }
                  }}
                  className="p-1 hover:bg-red-100 text-red-600 rounded"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
          
          {showAddField && (
            <div className="p-4 border-2 border-dashed rounded-lg">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <input
                  type="text"
                  placeholder="필드 키 (예: company_name)"
                  value={newField.field_key}
                  onChange={(e) => setNewField({ ...newField, field_key: e.target.value })}
                  className={styles.input}
                />
                <input
                  type="text"
                  placeholder="필드 라벨 (예: 회사명)"
                  value={newField.label}
                  onChange={(e) => setNewField({ ...newField, label: e.target.value })}
                  className={styles.input}
                />
              </div>
              
              <div className="flex items-center space-x-4 mb-4">
                <select
                  value={newField.field_type}
                  onChange={(e) => setNewField({ ...newField, field_type: e.target.value as any })}
                  className={styles.input}
                >
                  <option value="text">텍스트</option>
                  <option value="number">숫자</option>
                  <option value="select">선택</option>
                  <option value="date">날짜</option>
                  <option value="boolean">예/아니오</option>
                </select>
                
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={newField.is_required}
                    onChange={(e) => setNewField({ ...newField, is_required: e.target.checked })}
                    className="mr-2"
                  />
                  필수
                </label>
                
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={newField.is_enabled}
                    onChange={(e) => setNewField({ ...newField, is_enabled: e.target.checked })}
                    className="mr-2"
                  />
                  활성화
                </label>
              </div>
              
              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => setShowAddField(false)}
                  className={styles.button.secondary}
                >
                  취소
                </button>
                <button
                  onClick={handleAddField}
                  className={styles.button.primary}
                >
                  추가
                </button>
              </div>
            </div>
          )}
          
          {!showAddField && (
            <button
              onClick={() => setShowAddField(true)}
              className={`${styles.button.secondary} flex items-center space-x-2`}
            >
              <PlusIcon className="w-5 h-5" />
              <span>필드 추가</span>
            </button>
          )}
          
          {/* 저장 버튼 */}
          <div className="flex justify-end pt-4">
            <button
              onClick={onSave}
              disabled={savingFields}
              className={styles.button.primary}
            >
              {savingFields ? '저장 중...' : '저장'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// 비즈니스 설정 탭 컴포넌트
function BusinessSettingsTab({ styles, settings, onChange, onSave }: any) {
  const handleToggle = (key: string) => {
    onChange({ ...settings, [key]: !settings[key] });
  };
  
  const handleNumberChange = (key: string, value: string) => {
    const numValue = parseInt(value) || 0;
    onChange({ ...settings, [key]: numValue });
  };
  
  return (
    <div>
      <h2 className={styles.sectionTitle}>비즈니스 설정</h2>
      <p className={styles.sectionDesc}>캐시 시스템, 슬롯 관리 등 비즈니스 로직을 설정합니다</p>
      
      <div className="space-y-6">
        {/* 캐시 시스템 */}
        <div className="space-y-4">
          <h3 className="font-semibold">캐시 시스템</h3>
          
          <div className="flex items-center justify-between">
            <label className="font-medium">캐시 시스템 사용</label>
            <button
              onClick={() => handleToggle('useCashSystem')}
              className={`${styles.switch} ${settings.useCashSystem ? styles.switchEnabled : styles.switchDisabled}`}
            >
              <span className={`${styles.switchToggle} ${settings.useCashSystem ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">충전 방식</label>
              <select
                value={settings.cashChargeMode}
                onChange={(e) => onChange({ ...settings, cashChargeMode: e.target.value })}
                className={styles.input}
              >
                <option value="modal">모달</option>
                <option value="page">페이지</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">기본 슬롯 가격</label>
              <input
                type="number"
                value={settings.defaultSlotPrice}
                onChange={(e) => handleNumberChange('defaultSlotPrice', e.target.value)}
                className={styles.input}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">최소 충전 금액</label>
              <input
                type="number"
                value={settings.minCashCharge}
                onChange={(e) => handleNumberChange('minCashCharge', e.target.value)}
                className={styles.input}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">최대 충전 금액</label>
              <input
                type="number"
                value={settings.maxCashCharge}
                onChange={(e) => handleNumberChange('maxCashCharge', e.target.value)}
                className={styles.input}
              />
            </div>
          </div>
        </div>
        
        {/* 슬롯 관리 */}
        <div className="space-y-4">
          <h3 className="font-semibold">슬롯 관리</h3>
          
          <div>
            <label className="block text-sm font-medium mb-2">슬롯 운영 방식</label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="slotOperationMode"
                  value="normal"
                  checked={settings.slotOperationMode === 'normal'}
                  onChange={(e) => onChange({ ...settings, slotOperationMode: e.target.value })}
                  className="mr-2"
                />
                <span>일반 모드 (사용자가 필요시 생성)</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="slotOperationMode"
                  value="pre-allocation"
                  checked={settings.slotOperationMode === 'pre-allocation'}
                  onChange={(e) => onChange({ ...settings, slotOperationMode: e.target.value })}
                  className="mr-2"
                />
                <span>선슬롯발행 모드 (관리자가 미리 할당)</span>
              </label>
            </div>
          </div>
          
          {settings.slotOperationMode === 'pre-allocation' && (
            <div>
              <label className="block text-sm font-medium mb-2">기본 할당 슬롯 수</label>
              <input
                type="number"
                value={settings.defaultSlotAllocation}
                onChange={(e) => handleNumberChange('defaultSlotAllocation', e.target.value)}
                className={styles.input}
                min="1"
                max="100"
              />
              <p className="text-xs text-gray-500 mt-1">신규 사용자에게 기본으로 할당될 슬롯 개수</p>
            </div>
          )}
          
          <div className="flex items-center justify-between">
            <label className="font-medium">슬롯 자동 승인</label>
            <button
              onClick={() => handleToggle('slotAutoApproval')}
              className={`${styles.switch} ${settings.slotAutoApproval ? styles.switchEnabled : styles.switchDisabled}`}
            >
              <span className={`${styles.switchToggle} ${settings.slotAutoApproval ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">사용자당 최대 슬롯 수</label>
            <input
              type="number"
              value={settings.maxSlotsPerUser}
              onChange={(e) => handleNumberChange('maxSlotsPerUser', e.target.value)}
              className={styles.input}
            />
          </div>
        </div>
        
        {/* 운영 설정 */}
        <div className="space-y-4">
          <h3 className="font-semibold">운영 설정</h3>
          
          <div className="flex items-center justify-between">
            <label className="font-medium">유지보수 모드</label>
            <button
              onClick={() => handleToggle('maintenanceMode')}
              className={`${styles.switch} ${settings.maintenanceMode ? styles.switchEnabled : styles.switchDisabled}`}
            >
              <span className={`${styles.switchToggle} ${settings.maintenanceMode ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
          
          <div className="flex items-center justify-between">
            <label className="font-medium">회원가입 허용</label>
            <button
              onClick={() => handleToggle('registrationEnabled')}
              className={`${styles.switch} ${settings.registrationEnabled ? styles.switchEnabled : styles.switchDisabled}`}
            >
              <span className={`${styles.switchToggle} ${settings.registrationEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
          
          <div className="flex items-center justify-between">
            <label className="font-medium">캐시 충전 자동 승인</label>
            <button
              onClick={() => handleToggle('cashAutoApproval')}
              className={`${styles.switch} ${settings.cashAutoApproval ? styles.switchEnabled : styles.switchDisabled}`}
            >
              <span className={`${styles.switchToggle} ${settings.cashAutoApproval ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
        </div>
        
        {/* 저장 버튼 */}
        <div className="flex justify-end pt-4">
          <button onClick={onSave} className={styles.button.primary}>저장</button>
        </div>
      </div>
    </div>
  );
}

// 기능 설정 탭 컴포넌트
function FeatureSettingsTab({ styles, settings, onChange, onSave }: any) {
  const handleToggle = (key: string) => {
    onChange({ ...settings, [key]: !settings[key] });
  };
  
  const handleNumberChange = (key: string, value: string) => {
    const numValue = parseInt(value) || 0;
    onChange({ ...settings, [key]: numValue });
  };
  
  return (
    <div>
      <h2 className={styles.sectionTitle}>기능 설정</h2>
      <p className={styles.sectionDesc}>채팅, 알림, 기능 플래그 등을 설정합니다</p>
      
      <div className="space-y-6">
        {/* 채팅 설정 */}
        <div className="space-y-4">
          <h3 className="font-semibold">채팅 설정</h3>
          
          <div className="flex items-center justify-between">
            <label className="font-medium">채팅 기능 활성화</label>
            <button
              onClick={() => handleToggle('chatEnabled')}
              className={`${styles.switch} ${settings.chatEnabled ? styles.switchEnabled : styles.switchDisabled}`}
            >
              <span className={`${styles.switchToggle} ${settings.chatEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">최대 메시지 수</label>
              <input
                type="number"
                value={settings.chatMaxMessages}
                onChange={(e) => handleNumberChange('chatMaxMessages', e.target.value)}
                className={styles.input}
              />
            </div>
            
            <div className="flex items-center">
              <label className="font-medium mr-4">채팅 알림음</label>
              <button
                onClick={() => handleToggle('chatSoundEnabled')}
                className={`${styles.switch} ${settings.chatSoundEnabled ? styles.switchEnabled : styles.switchDisabled}`}
              >
                <span className={`${styles.switchToggle} ${settings.chatSoundEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
          </div>
        </div>
        
        {/* 알림 설정 */}
        <div className="space-y-4">
          <h3 className="font-semibold">알림 설정</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center">
              <label className="font-medium mr-4">알림 활성화</label>
              <button
                onClick={() => handleToggle('notificationEnabled')}
                className={`${styles.switch} ${settings.notificationEnabled ? styles.switchEnabled : styles.switchDisabled}`}
              >
                <span className={`${styles.switchToggle} ${settings.notificationEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
            
            <div className="flex items-center">
              <label className="font-medium mr-4">알림음</label>
              <button
                onClick={() => handleToggle('notificationSound')}
                className={`${styles.switch} ${settings.notificationSound ? styles.switchEnabled : styles.switchDisabled}`}
              >
                <span className={`${styles.switchToggle} ${settings.notificationSound ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
            
            <div className="flex items-center">
              <label className="font-medium mr-4">자동 읽음</label>
              <button
                onClick={() => handleToggle('notificationAutoRead')}
                className={`${styles.switch} ${settings.notificationAutoRead ? styles.switchEnabled : styles.switchDisabled}`}
              >
                <span className={`${styles.switchToggle} ${settings.notificationAutoRead ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">표시 시간 (ms)</label>
              <input
                type="number"
                value={settings.notificationDuration}
                onChange={(e) => handleNumberChange('notificationDuration', e.target.value)}
                className={styles.input}
              />
            </div>
          </div>
        </div>
        
        {/* 기능 플래그 */}
        <div className="space-y-4">
          <h3 className="font-semibold">기능 플래그</h3>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="font-medium">캐시 내역 기능</label>
              <button
                onClick={() => handleToggle('featureCashHistory')}
                className={`${styles.switch} ${settings.featureCashHistory ? styles.switchEnabled : styles.switchDisabled}`}
              >
                <span className={`${styles.switchToggle} ${settings.featureCashHistory ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
            
            <div className="flex items-center justify-between">
              <label className="font-medium">랭킹 기능</label>
              <button
                onClick={() => handleToggle('featureRanking')}
                className={`${styles.switch} ${settings.featureRanking ? styles.switchEnabled : styles.switchDisabled}`}
              >
                <span className={`${styles.switchToggle} ${settings.featureRanking ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
            
            <div className="flex items-center justify-between">
              <label className="font-medium">슬롯 관리 기능</label>
              <button
                onClick={() => handleToggle('featureSlotManagement')}
                className={`${styles.switch} ${settings.featureSlotManagement ? styles.switchEnabled : styles.switchDisabled}`}
              >
                <span className={`${styles.switchToggle} ${settings.featureSlotManagement ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
          </div>
        </div>
        
        {/* 저장 버튼 */}
        <div className="flex justify-end pt-4">
          <button onClick={onSave} className={styles.button.primary}>저장</button>
        </div>
      </div>
    </div>
  );
}