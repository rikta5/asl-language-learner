import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  template: `
    <header class="text-center">
      <h1 
        class="text-3xl md:text-4xl font-bold animate-slide-in"
        aria-live="polite"
      >
        Show ASL Letter: {{ currentLetter }}
      </h1>
    </header>
  `
})
export class HeaderComponent {
  @Input() currentLetter: string = 'A';
}