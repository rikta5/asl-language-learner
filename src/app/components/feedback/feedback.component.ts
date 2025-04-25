import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-feedback',
  standalone: true,
  imports: [CommonModule],
  template: `
    <footer class="mt-4 flex flex-col md:flex-row items-center justify-between gap-4">
      <div 
        class="text-2xl font-medium" 
        role="alert"
        aria-live="assertive"
      >
        <p [ngClass]="statusClass()">{{ feedbackMessage() }}</p>
      </div>
      
      <button 
        class="btn btn-primary text-white py-3 px-6 text-lg"
        (click)="onNextClick()"
        aria-label="Next letter"
      >
        Next
      </button>
    </footer>
  `
})
export class FeedbackComponent {
  @Input() status: 'waiting' | 'correct' | 'incorrect' = 'waiting';
  @Output() nextLetter = new EventEmitter<void>();
  
  feedbackMessage(): string {
    switch(this.status) {
      case 'correct': return 'Correct!';
      case 'incorrect': return 'Try again';
      default: return 'Waiting...';
    }
  }
  
  statusClass(): object {
    return {
      'text-gray-600': this.status === 'waiting',
      'text-success-500': this.status === 'correct',
      'text-error-500': this.status === 'incorrect'
    };
  }
  
  onNextClick(): void {
    this.nextLetter.emit();
  }
}