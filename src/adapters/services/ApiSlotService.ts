import { BaseSlotService, SlotResult, UpdateSlotParams } from '@/core/services/SlotService';
import { UserSlot, UserSlotModel } from '@/core/models/UserSlot';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001/api';

export class ApiSlotService extends BaseSlotService {
  private accessToken: string | null = null;

  constructor() {
    super();
    // 로컬 스토리지에서 토큰 가져오기
    this.accessToken = localStorage.getItem('accessToken');
  }

  private updateAccessToken() {
    this.accessToken = localStorage.getItem('accessToken');
  }

  async getUserSlots(_userId: string): Promise<SlotResult<UserSlot[]>> {
    try {
      this.updateAccessToken();
      
      const response = await fetch(`${API_BASE_URL}/slots?limit=100`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      });

      const result = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: result.error || '슬롯 목록을 가져오는데 실패했습니다.'
        };
      }

      if (result.success && result.data) {
        const slots = result.data.items.map((item: any) => {
          // DB 필드를 UserSlot customFields로 변환
          const customFields: Record<string, string> = {
            keyword: item.keyword || '',
            url: item.url || '',
            landingUrl: item.url || '',
            mid: item.mid || '',
            seq: item.seq?.toString() || ''
          };

          // field_values가 있으면 customFields에 추가
          if (item.fieldValues && Array.isArray(item.fieldValues)) {
            item.fieldValues.forEach((fv: any) => {
              customFields[fv.field_key] = fv.value;
            });
          }

          const slot = new UserSlotModel(
            item.id,
            item.user_id,
            item.status,
            customFields,
            0, // price (캐시 시스템에서 사용)
            item.impression_count || 0,
            item.click_count || 0,
            new Date(item.created_at),
            new Date(item.updated_at),
            item.approved_at ? new Date(item.approved_at) : undefined,
            undefined, // rejectedAt
            item.rejection_reason,
            undefined, // expiredAt
            undefined  // approvedPrice
          );
          
          // fieldValues를 별도로 저장
          (slot as any).fieldValues = item.fieldValues;
          
          // rank 관련 필드 추가
          (slot as any).rank = item.rank || 0;
          (slot as any).yesterday_rank = item.yesterday_rank;
          (slot as any).is_processing = item.is_processing;
          (slot as any).fail_count = item.fail_count;
          (slot as any).slot_number = item.slot_number;
          (slot as any).is_empty = item.is_empty;
          (slot as any).url = item.url;
          (slot as any).keyword = item.keyword;
          (slot as any).mid = item.mid;
          // 선발행 날짜 데이터 추가
          (slot as any).startDate = item.pre_allocation_start_date;
          (slot as any).endDate = item.pre_allocation_end_date;
          // 선발행 관련 데이터 추가
          (slot as any).workCount = item.pre_allocation_work_count;
          (slot as any).amount = item.pre_allocation_amount;
          (slot as any).description = item.pre_allocation_description;
          
          // 썸네일과 순위 데이터 추가
          (slot as any).thumbnail = item.thumbnail;
          (slot as any).rank = item.rank;
          (slot as any).first_rank = item.first_rank;
          
          // product_name 추가
          (slot as any).product_name = item.product_name;
          
          // 환불 관련 데이터 추가
          (slot as any).refund_reason = item.refund_reason;
          (slot as any).refunded_by = item.refunded_by;
          
          // 결제 완료 상태 추가
          (slot as any).payment_completed = item.payment_completed;
          
          return slot;
        });

        return {
          success: true,
          data: slots
        };
      }

      return {
        success: false,
        error: '슬롯 목록을 가져오는데 실패했습니다.'
      };
    } catch (error) {
      // Get user slots error
      return {
        success: false,
        error: '서버와의 통신 중 오류가 발생했습니다.'
      };
    }
  }

  async createSlot(_userId: string, params: { customFields: Record<string, string> }): Promise<SlotResult<UserSlot>> {
    try {
      this.updateAccessToken();
      
      // customFields에서 필요한 필드 추출
      const { keywords, landingUrl, mid } = params.customFields;
      
      const response = await fetch(`${API_BASE_URL}/slots`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.accessToken}`
        },
        body: JSON.stringify({
          keyword: keywords || '',
          url: landingUrl || '',
          mid: mid || '',
          dailyBudget: 0 // 캐시 시스템 OFF이므로 0으로 설정
        })
      });

      const result = await response.json();

      if (!response.ok) {
        // Slot creation failed
        return {
          success: false,
          error: result.error || '슬롯 생성에 실패했습니다.'
        };
      }

      if (result.success && result.data) {
        const customFields: Record<string, string> = {
          keywords: result.data.keyword,
          landingUrl: result.data.url,
          mid: result.data.mid || '',
          seq: result.data.seq?.toString() || ''
        };

        const slot = new UserSlotModel(
          result.data.id,
          result.data.user_id,
          result.data.status,
          customFields,
          0, // price
          result.data.impression_count || 0,
          result.data.click_count || 0,
          new Date(result.data.created_at),
          new Date(result.data.updated_at)
        );

        return {
          success: true,
          data: slot
        };
      }

      return {
        success: false,
        error: '슬롯 생성에 실패했습니다.'
      };
    } catch (error) {
      // Create slot error
      return {
        success: false,
        error: '서버와의 통신 중 오류가 발생했습니다.'
      };
    }
  }

  async pauseSlot(slotId: string): Promise<SlotResult<void>> {
    try {
      this.updateAccessToken();
      
      const response = await fetch(`${API_BASE_URL}/slots/${slotId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.accessToken}`
        },
        body: JSON.stringify({ status: 'paused' })
      });

      const result = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: result.error || '슬롯 일시정지에 실패했습니다.'
        };
      }

      return {
        success: true
      };
    } catch (error) {
      // Pause slot error
      return {
        success: false,
        error: '서버와의 통신 중 오류가 발생했습니다.'
      };
    }
  }

  async resumeSlot(slotId: string): Promise<SlotResult<void>> {
    try {
      this.updateAccessToken();
      
      const response = await fetch(`${API_BASE_URL}/slots/${slotId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.accessToken}`
        },
        body: JSON.stringify({ status: 'active' })
      });

      const result = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: result.error || '슬롯 재개에 실패했습니다.'
        };
      }

      return {
        success: true
      };
    } catch (error) {
      // Resume slot error
      return {
        success: false,
        error: '서버와의 통신 중 오류가 발생했습니다.'
      };
    }
  }

  async deleteSlot(slotId: string): Promise<SlotResult<void>> {
    try {
      this.updateAccessToken();
      
      const response = await fetch(`${API_BASE_URL}/slots/${slotId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.accessToken}`
        },
        body: JSON.stringify({ status: 'deleted' })
      });

      const result = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: result.error || '슬롯 삭제에 실패했습니다.'
        };
      }

      return {
        success: true
      };
    } catch (error) {
      // Delete slot error
      return {
        success: false,
        error: '서버와의 통신 중 오류가 발생했습니다.'
      };
    }
  }

  async approveSlot(slotId: string, approvedPrice?: number): Promise<SlotResult<void>> {
    try {
      this.updateAccessToken();
      
      const response = await fetch(`${API_BASE_URL}/slots/${slotId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.accessToken}`
        },
        body: JSON.stringify({ approved: true, approvedPrice })
      });

      const result = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: result.error || '슬롯 승인에 실패했습니다.'
        };
      }

      return {
        success: true
      };
    } catch (error) {
      // Approve slot error
      return {
        success: false,
        error: '서버와의 통신 중 오류가 발생했습니다.'
      };
    }
  }

  async rejectSlot(slotId: string, reason: string): Promise<SlotResult<void>> {
    try {
      this.updateAccessToken();
      
      const response = await fetch(`${API_BASE_URL}/slots/${slotId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.accessToken}`
        },
        body: JSON.stringify({ approved: false, rejectionReason: reason })
      });

      const result = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: result.error || '슬롯 거절에 실패했습니다.'
        };
      }

      return {
        success: true
      };
    } catch (error) {
      // Reject slot error
      return {
        success: false,
        error: '서버와의 통신 중 오류가 발생했습니다.'
      };
    }
  }

  async searchSlots(query: string, filters?: any): Promise<SlotResult<UserSlot[]>> {
    try {
      this.updateAccessToken();
      
      const params = new URLSearchParams();
      if (query) params.append('search', query);
      if (filters?.status) params.append('status', filters.status);
      if (filters?.page) params.append('page', filters.page.toString());
      if (filters?.limit) params.append('limit', filters.limit.toString());

      const response = await fetch(`${API_BASE_URL}/slots?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      });

      const result = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: result.error || '슬롯 검색에 실패했습니다.'
        };
      }

      if (result.success && result.data) {
        const slots = result.data.items.map((item: any) => new UserSlotModel(
          item.id,
          item.user_id,
          item.name,
          item.target_url,
          item.daily_budget,
          item.status,
          item.click_count,
          item.impression_count,
          new Date(item.created_at),
          new Date(item.updated_at),
          item.description
        ));

        return {
          success: true,
          data: slots
        };
      }

      return {
        success: false,
        error: '슬롯 검색에 실패했습니다.'
      };
    } catch (error) {
      // Search slots error
      return {
        success: false,
        error: '서버와의 통신 중 오류가 발생했습니다.'
      };
    }
  }

  async getSlotPrice(): Promise<number> {
    // API에서 슬롯 가격을 가져오지 않고 기본값 사용
    return 0;
  }

  async getAllSlots(statusFilter?: string): Promise<SlotResult<UserSlot[]>> {
    try {
      this.updateAccessToken();
      
      const params = new URLSearchParams();
      params.append('limit', '500'); // 충분히 큰 수로 설정
      if (statusFilter && statusFilter !== 'all') {
        params.append('status', statusFilter);
      }
      
      const response = await fetch(`${API_BASE_URL}/slots?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      });

      const result = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: result.error || '슬롯 목록을 가져오는데 실패했습니다.'
        };
      }

      if (result.success && result.data) {
        const slots = result.data.items.map((item: any) => {
          // DB 필드를 UserSlot customFields로 변환
          const customFields: Record<string, string> = {
            keyword: item.keyword || '',
            url: item.url || '',
            landingUrl: item.url || '',
            mid: item.mid || '',
            seq: item.seq?.toString() || ''
          };

          // field_values가 있으면 customFields에 추가
          if (item.fieldValues && Array.isArray(item.fieldValues)) {
            item.fieldValues.forEach((fv: any) => {
              customFields[fv.field_key] = fv.value;
            });
          }

          const slot = new UserSlotModel(
            item.id,
            item.user_id,
            item.status,
            customFields,
            item.approved_price || 0,
            item.impression_count || 0,
            item.click_count || 0,
            new Date(item.created_at),
            new Date(item.updated_at),
            item.approved_at ? new Date(item.approved_at) : undefined,
            item.rejected_at ? new Date(item.rejected_at) : undefined,
            item.rejection_reason,
            undefined,
            item.approved_price,
            item.user_name,
            item.user_email
          );

          // fieldValues를 별도로 저장
          (slot as any).fieldValues = item.fieldValues;
          
          // rank 관련 필드 추가
          (slot as any).rank = item.rank || 0;
          (slot as any).yesterday_rank = item.yesterday_rank;
          (slot as any).is_processing = item.is_processing;
          (slot as any).fail_count = item.fail_count;
          (slot as any).slot_number = item.slot_number;
          (slot as any).is_empty = item.is_empty;
          (slot as any).url = item.url;
          (slot as any).keyword = item.keyword;
          (slot as any).mid = item.mid;
          // 선발행 날짜 데이터 추가
          (slot as any).startDate = item.pre_allocation_start_date;
          (slot as any).endDate = item.pre_allocation_end_date;
          // 선발행 관련 데이터 추가
          (slot as any).workCount = item.pre_allocation_work_count;
          (slot as any).amount = item.pre_allocation_amount;
          (slot as any).description = item.pre_allocation_description;
          
          // 썸네일과 순위 데이터 추가
          (slot as any).thumbnail = item.thumbnail;
          (slot as any).rank = item.rank;
          (slot as any).first_rank = item.first_rank;
          
          // product_name 추가
          (slot as any).product_name = item.product_name;
          
          // 환불 관련 데이터 추가
          (slot as any).refund_reason = item.refund_reason;
          (slot as any).refunded_by = item.refunded_by;
          
          // 결제 완료 상태 추가
          (slot as any).payment_completed = item.payment_completed;
          
          return slot;
        });

        return {
          success: true,
          data: slots
        };
      }

      return {
        success: false,
        error: '슬롯 목록을 가져오는데 실패했습니다.'
      };
    } catch (error) {
      // Get all slots error
      return {
        success: false,
        error: '서버와의 통신 중 오류가 발생했습니다.'
      };
    }
  }

  async getAllPendingSlots(): Promise<SlotResult<UserSlot[]>> {
    return this.getAllSlots('pending');
  }

  // 슬롯 개수만 가져오는 함수 (관리자 대시보드용)
  async getSlotCount(statusFilter?: string): Promise<SlotResult<{ count: number }>> {
    try {
      this.updateAccessToken();
      
      const params = new URLSearchParams();
      if (statusFilter && statusFilter !== 'all') {
        params.append('status', statusFilter);
      }
      
      const response = await fetch(`${API_BASE_URL}/slots/count?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      });

      const result = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: result.error || '슬롯 개수를 가져오는데 실패했습니다.'
        };
      }

      return {
        success: true,
        data: { count: result.data.count }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '슬롯 개수 조회 중 오류가 발생했습니다.'
      };
    }
  }

  // Pending 슬롯 개수만 가져오는 함수
  async getPendingSlotCount(): Promise<SlotResult<{ count: number }>> {
    return this.getSlotCount('pending');
  }

  async updateSlot(slotId: string, params: UpdateSlotParams): Promise<SlotResult<UserSlot>> {
    try {
      this.updateAccessToken();
      
      const customFields = params.customFields || {};
      
      // 슬롯 상태 확인 (empty 슬롯은 /fill, 나머지는 /update-fields)
      const slotResponse = await fetch(`${API_BASE_URL}/slots/${slotId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      });
      
      const slotData = await slotResponse.json();
      const isEmptySlot = slotData.data?.is_empty || slotData.data?.status === 'empty';
      
      // empty 슬롯은 /fill 엔드포인트, 나머지는 /update-fields 엔드포인트 사용
      const endpoint = isEmptySlot ? 
        `${API_BASE_URL}/slots/${slotId}/fill` : 
        `${API_BASE_URL}/slots/${slotId}/update-fields`;
      
      const response = await fetch(endpoint, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.accessToken}`
        },
        body: JSON.stringify({
          keyword: customFields.keyword || customFields.keywords || '',
          url: customFields.url || customFields.landingUrl || '',
          mid: customFields.mid || '',
          customFields: customFields
        })
      });

      const result = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: result.error || '슬롯 수정에 실패했습니다.'
        };
      }

      if (result.success && result.data) {
        const customFields: Record<string, string> = {
          keywords: result.data.keyword,
          landingUrl: result.data.url,
          mid: result.data.mid || '',
          seq: result.data.seq?.toString() || ''
        };

        const slot = new UserSlotModel(
          result.data.id,
          result.data.user_id,
          result.data.status,
          customFields,
          0,
          result.data.impression_count || 0,
          result.data.click_count || 0,
          new Date(result.data.created_at),
          new Date(result.data.updated_at),
          result.data.approved_at ? new Date(result.data.approved_at) : undefined,
          undefined,
          result.data.rejection_reason,
          undefined,
          undefined
        );

        return {
          success: true,
          data: slot
        };
      }

      return {
        success: false,
        error: '슬롯 수정에 실패했습니다.'
      };
    } catch (error) {
      // Update slot error
      return {
        success: false,
        error: '서버와의 통신 중 오류가 발생했습니다.'
      };
    }
  }

  async fillEmptySlot(slotId: string, params: UpdateSlotParams): Promise<SlotResult<UserSlot>> {
    try {
      this.updateAccessToken();
      
      const { keywords, landingUrl, mid } = params.customFields || {};
      
      const response = await fetch(`${API_BASE_URL}/slots/${slotId}/fill`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.accessToken}`
        },
        body: JSON.stringify({
          keyword: keywords,
          url: landingUrl,
          mid: mid,
          customFields: params.customFields
        })
      });

      const result = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: result.error || '빈 슬롯 채우기에 실패했습니다.'
        };
      }

      if (result.success && result.data) {
        const customFields: Record<string, string> = {
          keywords: result.data.keyword || '',
          landingUrl: result.data.url || '',
          mid: result.data.mid || '',
          seq: result.data.seq?.toString() || '',
          ...result.data.custom_fields
        };

        const slot = new UserSlotModel(
          result.data.id,
          result.data.user_id,
          result.data.status,
          customFields,
          0,
          result.data.impression_count || 0,
          result.data.click_count || 0,
          new Date(result.data.created_at),
          new Date(result.data.updated_at),
          result.data.approved_at ? new Date(result.data.approved_at) : undefined,
          undefined,
          result.data.rejection_reason,
          undefined,
          undefined
        );

        return {
          success: true,
          data: slot
        };
      }

      return {
        success: false,
        error: '빈 슬롯 채우기에 실패했습니다.'
      };
    } catch (error) {
      // Fill empty slot error
      return {
        success: false,
        error: '서버와의 통신 중 오류가 발생했습니다.'
      };
    }
  }
}