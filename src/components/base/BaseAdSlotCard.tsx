interface AdSlotCardProps {
  slot: {
    id: string;
    name: string;
    description?: string;
    position: string;
    size: string;
    pricePerDay: number;
    pricePerClick: number;
    status: string;
    currentOwner?: string;
    expiresAt?: Date;
    impressions: number;
    clicks: number;
  };
  className?: string;
  cardClassName?: string;
  titleClassName?: string;
  descriptionClassName?: string;
  buttonClassName?: string;
  availableButtonClassName?: string;
  unavailableButtonClassName?: string;
}

export function BaseAdSlotCard({ 
  slot,
  className = "p-6",
  cardClassName = "bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow",
  titleClassName = "text-lg font-bold",
  descriptionClassName = "text-sm text-gray-600",
  buttonClassName = "w-full mt-4 py-2 px-4 rounded transition-colors",
  availableButtonClassName = "bg-blue-600 text-white hover:bg-blue-700",
  unavailableButtonClassName = "bg-gray-300 text-gray-500 cursor-not-allowed"
}: AdSlotCardProps) {
  const ctr = slot.impressions > 0 ? ((slot.clicks / slot.impressions) * 100).toFixed(2) : '0';
  
  const getStatusBadge = (status: string) => {
    const styles = {
      available: 'bg-green-100 text-green-800',
      occupied: 'bg-red-100 text-red-800',
      pending: 'bg-yellow-100 text-yellow-800',
      disabled: 'bg-gray-100 text-gray-800',
    };

    const labels = {
      available: '이용 가능',
      occupied: '사용 중',
      pending: '대기 중',
      disabled: '비활성',
    };

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[status as keyof typeof styles]}`}>
        {labels[status as keyof typeof labels]}
      </span>
    );
  };

  const getPositionLabel = (position: string) => {
    const labels: Record<string, string> = {
      'header': '헤더',
      'sidebar': '사이드바',
      'footer': '푸터',
      'main-top': '메인 상단',
      'main-bottom': '메인 하단',
      'popup': '팝업',
    };
    return labels[position] || position;
  };

  return (
    <div className={cardClassName}>
      <div className={className}>
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className={titleClassName}>{slot.name}</h3>
            <p className={descriptionClassName}>{slot.description}</p>
          </div>
          {getStatusBadge(slot.status)}
        </div>

        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">위치</span>
            <span className="font-medium">{getPositionLabel(slot.position)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">크기</span>
            <span className="font-medium">{slot.size}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">일일 단가</span>
            <span className="font-medium">{slot.pricePerDay.toLocaleString()}원</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">클릭 단가</span>
            <span className="font-medium">{slot.pricePerClick.toLocaleString()}원</span>
          </div>
        </div>

        <div className="border-t mt-4 pt-4">
          <h4 className="text-sm font-medium mb-2">성과 지표</h4>
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
              <div className="font-medium text-blue-600">{ctr}%</div>
            </div>
          </div>
        </div>

        {slot.currentOwner && (
          <div className="border-t mt-4 pt-4">
            <div className="text-sm">
              <span className="text-gray-600">현재 광고주: </span>
              <span className="font-medium">{slot.currentOwner}</span>
            </div>
            {slot.expiresAt && (
              <div className="text-sm mt-1">
                <span className="text-gray-600">만료일: </span>
                <span className="font-medium">
                  {new Date(slot.expiresAt).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>
        )}

        <button 
          className={`${buttonClassName} ${
            slot.status === 'available' ? availableButtonClassName : unavailableButtonClassName
          }`}
          disabled={slot.status !== 'available'}
        >
          {slot.status === 'available' ? '구매하기' : '이용 불가'}
        </button>
      </div>
    </div>
  );
}