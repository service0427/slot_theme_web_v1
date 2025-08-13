import { BaseAdSlotCard } from '@/components/base/BaseAdSlotCard';

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
}

export function AdSlotCard({ slot }: AdSlotCardProps) {
  return (
    <BaseAdSlotCard slot={slot} />
  );
}