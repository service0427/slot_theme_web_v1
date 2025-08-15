import { UserSlot } from '@/core/models/UserSlot';
import { useConfig } from '@/contexts/ConfigContext';

interface BaseUserSlotCardProps {
  slot: UserSlot;
  onPause?: () => void;
  onResume?: () => void;
  onEdit?: () => void;
}

export function BaseUserSlotCard({ slot, onPause, onResume }: BaseUserSlotCardProps) {
  const { config } = useConfig();
  
  // enabled된 필드들만 가져와서 order 순으로 정렬
  const enabledFields = config.slotFields
    .filter(field => field.enabled)
    .sort((a, b) => a.order - b.order);
  
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

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="p-6">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-lg font-bold">
            {slot.customFields.keywords || '키워드 없음'}
          </h3>
          {getStatusBadge(slot.status)}
        </div>

        <div className="space-y-2 text-sm text-gray-600 mb-4">
          {enabledFields.map((field) => {
            const value = slot.customFields[field.id];
            if (!value) return null;
            
            return (
              <div key={field.id}>
                <span className="font-medium">{field.label}:</span>{' '}
                {field.type === 'url' ? (
                  <p className="text-blue-600 truncate">{value}</p>
                ) : field.type === 'textarea' ? (
                  <p className="mt-1">{value}</p>
                ) : (
                  <span>{value}</span>
                )}
              </div>
            );
          })}
          {/* 캐시 시스템 OFF일 때 승인된 가격 표시 */}
          {!config.useCashSystem && slot.status === 'active' && slot.approvedPrice && (
            <div>
              <span className="font-medium">승인 가격:</span>{' '}
              <span className="text-green-600 font-medium">
                {slot.approvedPrice.toLocaleString()}원
              </span>
            </div>
          )}
        </div>

        {/* 성과 지표 */}
        <div className="border-t pt-4 mb-4">
          <div className="grid grid-cols-3 gap-2 text-sm">
            <div className="text-center">
              <div className="text-gray-600">노출수</div>
              <div className="font-medium">{slot.impressions.toLocaleString()}</div>
            </div>
            <div className="text-center">
              <div className="text-gray-600">클릭수</div>
              <div className="font-medium">{slot.clicks.toLocaleString()}</div>
            </div>
            <div className="text-center">
              <div className="text-gray-600">CTR</div>
              <div className="font-medium text-blue-600">{(slot.impressions > 0 ? (slot.clicks / slot.impressions * 100) : 0).toFixed(2)}%</div>
            </div>
          </div>
        </div>

        {/* 거부 사유 */}
        {slot.status === 'rejected' && slot.rejectionReason && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded">
            <span className="font-medium">거부 사유:</span> {slot.rejectionReason}
          </div>
        )}

        {/* 활성화 상태 */}
        <div className="flex items-center justify-between border-t pt-4">
          <span className="text-sm font-medium text-gray-700">활성화 상태</span>
          {(slot.status === 'active' || slot.status === 'paused') ? (
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={slot.status === 'active'}
                onChange={() => slot.status === 'active' ? onPause?.() : onResume?.()}
                disabled={slot.status !== 'active' && slot.status !== 'paused'}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              <span className="ml-3 text-sm text-gray-600">
                {slot.status === 'active' ? '활성' : '일시정지'}
              </span>
            </label>
          ) : slot.status === 'pending' ? (
            <span className="text-sm text-gray-500">관리자 승인 대기중</span>
          ) : slot.status === 'rejected' ? (
            <span className="text-sm text-red-500">거절됨</span>
          ) : (
            <span className="text-sm text-gray-400">-</span>
          )}
        </div>
      </div>
    </div>
  );
}