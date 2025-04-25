import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-asl-letter',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex flex-col items-center">
      <div class="w-24 h-24 sm:w-32 sm:h-32 flex items-center justify-center">
        <img 
          [src]="getImageUrl()" 
          [alt]="'ASL letter ' + letter"
          class="max-w-full max-h-full object-contain transition-all duration-300 ease-in-out"
        />
      </div>
      
      <p class="mt-2 text-lg font-medium">Letter {{ letter }}</p>
    </div>
  `
})
export class ASLLetterComponent {
  @Input() letter: string = 'A';
  
  // This uses placeholder URLs for ASL letter images
  // In a real implementation, you would replace these with actual image URLs
  getImageUrl(): string {
    // Using placeholder images for ASL letters
    return `https://images.pexels.com/photos/4629633/pexels-photo-4629633.jpeg?auto=compress&cs=tinysrgb&w=300&h=300`;
  }
}