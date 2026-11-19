import { Component, inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { RouterLink, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterLink, RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  private readonly document = inject(DOCUMENT);

  skipToContent(event: Event): void {
    // A native fragment resolves against base href="/" and would reload a deep route.
    event.preventDefault();
    this.document.getElementById('main-content')?.focus();
  }
}
