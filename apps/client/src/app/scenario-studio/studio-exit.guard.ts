import type { CanDeactivateFn } from '@angular/router';
import type { StudioComponent } from './studio.component';

export const studioExitGuard: CanDeactivateFn<StudioComponent> = (component, _route, _state, next) => component.canLeave(next.url);
