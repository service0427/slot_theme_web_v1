import { BaseSlotCard } from '@/components/base/BaseSlotCard';

interface SlotCardProps {
  slot: {
    id: string;
    name: string;
    minBet: number;
    maxBet: number;
    imageUrl: string;
  };
}

export function SlotCard({ slot }: SlotCardProps) {
  return (
    <BaseSlotCard slot={slot} />
  );
}