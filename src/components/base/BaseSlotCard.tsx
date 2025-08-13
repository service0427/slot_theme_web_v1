interface SlotCardProps {
  slot: {
    id: string;
    name: string;
    minBet: number;
    maxBet: number;
    imageUrl: string;
  };
  cardClassName?: string;
  imageClassName?: string;
  contentClassName?: string;
  titleClassName?: string;
  buttonClassName?: string;
  gradientClassName?: string;
}

export function BaseSlotCard({ 
  slot,
  cardClassName = "bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow cursor-pointer",
  imageClassName = "w-full h-full object-cover",
  contentClassName = "p-4",
  titleClassName = "text-lg font-bold",
  buttonClassName = "w-full mt-4 py-2 px-4 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors",
  gradientClassName = "absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"
}: SlotCardProps) {
  return (
    <div className={cardClassName}>
      <div className="aspect-square bg-gray-200 relative">
        <img
          src={slot.imageUrl}
          alt={slot.name}
          className={imageClassName}
          onError={(e) => {
            e.currentTarget.src = 'https://via.placeholder.com/300x300?text=' + encodeURIComponent(slot.name);
          }}
        />
        <div className={gradientClassName} />
        <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
          <h3 className={titleClassName}>{slot.name}</h3>
        </div>
      </div>
      <div className={contentClassName}>
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-600">최소 베팅</span>
          <span className="font-medium">{slot.minBet.toLocaleString()}원</span>
        </div>
        <div className="flex justify-between items-center text-sm mt-2">
          <span className="text-gray-600">최대 베팅</span>
          <span className="font-medium">{slot.maxBet.toLocaleString()}원</span>
        </div>
        <button className={buttonClassName}>
          게임 시작
        </button>
      </div>
    </div>
  );
}