import { useCashContext } from '@/adapters/react';
import { ComponentType } from 'react';

interface BaseCashChargeModalProps {
  isOpen: boolean;
  onClose: () => void;
  CashChargeForm: ComponentType<{
    onSubmit: (data: any) => void;
  }>;
  overlayClassName?: string;
  containerClassName?: string;
  modalClassName?: string;
  headerClassName?: string;
  titleClassName?: string;
  closeButtonClassName?: string;
}

export function BaseCashChargeModal({
  isOpen,
  onClose,
  CashChargeForm,
  overlayClassName = "fixed inset-0 z-50 overflow-y-auto",
  containerClassName = "flex min-h-screen items-center justify-center p-4",
  modalClassName = "relative bg-white rounded-lg shadow-xl max-w-md w-full p-6",
  headerClassName = "mb-4",
  titleClassName = "text-lg font-bold",
  closeButtonClassName = "absolute top-4 right-4 text-gray-400 hover:text-gray-600"
}: BaseCashChargeModalProps) {
  const { createChargeRequest } = useCashContext();

  const handleSubmit = async (data: any) => {
    const success = await createChargeRequest(data);
    if (success) {
      // 충전 요청 성공 시 모달 닫기
      setTimeout(() => {
        onClose();
      }, 2000);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={overlayClassName}>
      <div className={containerClassName}>
        {/* 배경 오버레이 */}
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
          onClick={onClose}
        />

        {/* 모달 컨텐츠 */}
        <div className={modalClassName}>
          {/* 헤더 */}
          <div className={headerClassName}>
            <h3 className={titleClassName}>캐시 충전</h3>
            <button
              onClick={onClose}
              className={closeButtonClassName}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <CashChargeForm onSubmit={handleSubmit} />
        </div>
      </div>
    </div>
  );
}