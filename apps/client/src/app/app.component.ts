import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HealthService } from './core/api/health.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  private readonly healthService = inject(HealthService);
  private readonly destroyRef = inject(DestroyRef);
  readonly status = signal<'loading' | 'success' | 'error'>('loading');

  constructor() {
    this.checkConnection();
  }

  checkConnection(): void {
    this.status.set('loading');
    this.healthService.getHealth().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => this.status.set('success'),
      error: () => this.status.set('error')
    });
  }
}
