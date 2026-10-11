import { toast } from 'sonner';
import i18n from '@/i18n';

export const notify = {
  apiLimit:      () => toast.error(i18n.t('error.apiLimitReached')),
  network:       () => toast.error(i18n.t('error.networkError')),
  success:       (msg: string) => toast.success(msg),
  cannotConvert: () => toast.error(i18n.t('error.cannotConvertUnit')),
  saved:         () => toast.success(i18n.t('common.saved')),
};
