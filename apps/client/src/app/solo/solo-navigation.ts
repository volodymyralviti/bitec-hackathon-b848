import { InjectionToken } from '@angular/core';
export const SOLO_NAVIGATION = new InjectionToken<{ base: string; back: string; backLabel: string; privatePreview?: boolean; demo?: boolean }>('SoloNavigation', {
  providedIn: 'root', factory: () => ({ base: '/scenarios', back: '/scenarios', backLabel: 'До каталогу' })
});
