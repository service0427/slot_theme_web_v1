import { UserSlot } from '@/core/models/UserSlot';
import { FieldConfig } from '@/adapters/services/ApiFieldConfigService';

interface BaseUserSlotListItemProps {
  slot: UserSlot;
  fieldConfigs?: FieldConfig[];
  onPause?: () => void;
  onResume?: () => void;
  onEdit?: () => void;
}

export function BaseUserSlotListItem({ slot, fieldConfigs = [], onPause, onResume, onEdit }: BaseUserSlotListItemProps) {
  
  const getStatusBadge = (status: string) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800',
      active: 'bg-green-100 text-green-800',
      paused: 'bg-gray-100 text-gray-800',
      rejected: 'bg-red-100 text-red-800',
      expired: 'bg-red-100 text-red-800',
      refunded: 'bg-purple-100 text-purple-800',
    };

    const labels = {
      pending: '대기중',
      active: '활성',
      paused: '일시정지',
      rejected: '거절됨',
      expired: '만료됨',
      refunded: '환불완료',
    };

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[status as keyof typeof styles]}`}>
        {labels[status as keyof typeof labels]}
      </span>
    );
  };


  // 필드 값 가져오기 (fieldValues와 customFields에서 모두 찾기)
  const getFieldValue = (field: FieldConfig, customFields: any) => {
    // slot.fieldValues에서 먼저 찾기
    if (slot.fieldValues) {
      const fieldValue = slot.fieldValues.find((fv: any) => fv.field_key === field.field_key);
      if (fieldValue) return fieldValue.value;
    }
    // customFields에서 찾기
    return customFields[field.field_key];
  };

  const renderFieldValue = (field: FieldConfig, value: any) => {
    if (!value) return '-';
    
    switch (field.field_type) {
      case 'url':
        return (
          <a href={value} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline truncate block max-w-xs">
            {value}
          </a>
        );
      case 'email':
        return (
          <a href={`mailto:${value}`} className="text-blue-600 hover:underline">
            {value}
          </a>
        );
      case 'textarea':
        return (
          <div className="max-w-xs truncate" title={value}>
            {value}
          </div>
        );
      default:
        return value;
    }
  };

  // 슬롯 번호 추출 (ID의 마지막 부분이나 seq 사용)
  const slotNumber = slot.customFields.seq || slot.id.split('-')[0].substring(0, 8);
  
  return (
    <tr className="hover:bg-gray-50">
      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
        {slotNumber}
      </td>
      {/* 관리자가 설정한 필드들 또는 기본 필드들 */}
      {fieldConfigs && fieldConfigs.length > 0 ? fieldConfigs.map(field => {
        const value = getFieldValue(field, slot.customFields);
        return (
          <td key={field.field_key} className="px-4 py-4">
            <div className="text-sm text-gray-900">
              {renderFieldValue(field, value)}
            </div>
          </td>
        );
      }) : (
        // fieldConfigs가 없을 때 기본 필드들 표시 (luxury 테마용)
        <>
          <td className="px-4 py-4">
            <div className="text-sm text-gray-900">
              {slot.customFields.keyword || '-'}
            </div>
          </td>
          <td className="px-4 py-4">
            <div className="text-sm text-gray-900">
              {slot.customFields.url ? (
                <a href={slot.customFields.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 truncate block max-w-xs" title={slot.customFields.url}>
                  {slot.customFields.url.length > 30 ? slot.customFields.url.substring(0, 30) + '...' : slot.customFields.url}
                </a>
              ) : '-'}
            </div>
          </td>
          <td className="px-4 py-4">
            <div className="text-xs text-gray-900">
              {(() => {
                // fieldValues에서 먼저 찾기
                if (slot.fieldValues) {
                  const fieldValue = slot.fieldValues.find((fv: any) => fv.field_key === 'url_product_id');
                  if (fieldValue) return fieldValue.value;
                }
                return slot.customFields.url_product_id || '-';
              })()}
            </div>
          </td>
          <td className="px-4 py-4">
            <div className="text-xs text-gray-900">
              {(() => {
                if (slot.fieldValues) {
                  const fieldValue = slot.fieldValues.find((fv: any) => fv.field_key === 'url_item_id');
                  if (fieldValue) return fieldValue.value;
                }
                return slot.customFields.url_item_id || '-';
              })()}
            </div>
          </td>
          <td className="px-4 py-4">
            <div className="text-xs text-gray-900">
              {(() => {
                if (slot.fieldValues) {
                  const fieldValue = slot.fieldValues.find((fv: any) => fv.field_key === 'url_vendor_item_id');
                  if (fieldValue) return fieldValue.value;
                }
                return slot.customFields.url_vendor_item_id || '-';
              })()}
            </div>
          </td>
        </>
      )}
      {/* 시스템 필드들 */}
      <td className="px-4 py-4 whitespace-nowrap text-center text-sm text-gray-900">
        <span className="font-semibold">-</span>
      </td>
      <td className="px-4 py-4 whitespace-nowrap text-center text-sm text-gray-900">
        <span className="font-semibold">-</span>
      </td>
      <td className="px-4 py-4 whitespace-nowrap text-center text-sm text-gray-500">
        {slot.customFields.startDate ? new Date(slot.customFields.startDate).toLocaleDateString() : '-'}
      </td>
      <td className="px-4 py-4 whitespace-nowrap text-center text-sm text-gray-500">
        {slot.customFields.endDate ? new Date(slot.customFields.endDate).toLocaleDateString() : '-'}
      </td>
      <td className="px-4 py-4 whitespace-nowrap text-center text-sm text-gray-500">
        {new Date(slot.createdAt).toLocaleDateString()}
      </td>
      <td className="px-6 py-4 text-sm">
        <div className="flex flex-col items-center gap-2">
          {/* 상태 배지 */}
          {getStatusBadge(slot.status)}
          
          {/* 토글 스위치 (active/paused에서만) */}
          {(slot.status === 'active' || slot.status === 'paused') && (
            <div className="flex items-center gap-1">
              <span className="text-xs text-gray-500">활성</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={slot.status === 'paused'}
                  onChange={() => slot.status === 'active' ? onPause?.() : onResume?.()}
                />
                <div className={`w-6 h-3 rounded-full peer peer-focus:outline-none peer-focus:ring-1 peer-focus:ring-blue-300 ${
                  slot.status === 'active' ? 'bg-green-500' : 'bg-orange-500'
                } peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[1px] after:left-[1px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-2.5 after:w-2.5 after:transition-all`}></div>
              </label>
              <span className="text-xs text-gray-500">정지</span>
            </div>
          )}
        </div>
      </td>
      {/* 액션 버튼 */}
      <td className="px-6 py-4 text-sm">
        <div className="flex items-center justify-center">
          {(slot.status === 'pending' || slot.status === 'rejected') ? (
            <button
              onClick={onEdit}
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              수정
            </button>
          ) : (
            <span className="text-gray-400">-</span>
          )}
        </div>
      </td>
    </tr>
  );
}