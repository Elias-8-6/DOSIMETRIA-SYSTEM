import { useState, useCallback } from 'react';

export function useFormModal<T>() {
  const [modal, setModal] = useState<{ open: boolean; entity: T | null }>({
    open: false,
    entity: null,
  });
  const [modalKey, setModalKey] = useState(0);

  const openCreate = useCallback(() => {
    setModalKey((k) => k + 1);
    setModal({ open: true, entity: null });
  }, []);

  const openEdit = useCallback((entity: T) => {
    setModalKey((k) => k + 1);
    setModal({ open: true, entity });
  }, []);

  const close = useCallback(() => {
    setModal((prev) => ({ ...prev, open: false }));
  }, []);

  return {
    modal,
    isOpen: modal.open,
    entity: modal.entity,
    modalKey,
    openCreate,
    openEdit,
    close,
  };
}
