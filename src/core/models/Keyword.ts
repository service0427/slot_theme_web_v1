export interface Keyword {
  id: string;
  keyword: string;
  category: string;
  searchVolume: number;
  competition: CompetitionLevel;
  suggestedBid: number;
  currentBid?: number;
  position?: number;
  impressions: number;
  clicks: number;
  conversions: number;
  spend: number;
  createdAt: Date;
  updatedAt: Date;
}

export type CompetitionLevel = 'low' | 'medium' | 'high';

export interface KeywordPerformance {
  keywordId: string;
  date: Date;
  position: number;
  impressions: number;
  clicks: number;
  conversions: number;
  spend: number;
  ctr: number;
  cpc: number; // Cost Per Click
  cvr: number; // Conversion Rate
  roi: number; // Return on Investment
}

export class KeywordModel implements Keyword {
  constructor(
    public id: string,
    public keyword: string,
    public category: string,
    public searchVolume: number,
    public competition: CompetitionLevel,
    public suggestedBid: number,
    public impressions: number,
    public clicks: number,
    public conversions: number,
    public spend: number,
    public createdAt: Date,
    public updatedAt: Date,
    public currentBid?: number,
    public position?: number
  ) {}

  get ctr(): number {
    return this.impressions > 0 ? (this.clicks / this.impressions) * 100 : 0;
  }

  get cpc(): number {
    return this.clicks > 0 ? this.spend / this.clicks : 0;
  }

  get cvr(): number {
    return this.clicks > 0 ? (this.conversions / this.clicks) * 100 : 0;
  }

  get roi(): number {
    // 간단한 ROI 계산 (실제로는 수익 데이터가 필요)
    const revenue = this.conversions * 50000; // 가정: 전환당 5만원 수익
    return this.spend > 0 ? ((revenue - this.spend) / this.spend) * 100 : 0;
  }
}