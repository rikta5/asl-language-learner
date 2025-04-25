import { Component, Input, OnChanges } from "@angular/core";
import { CommonModule } from "@angular/common";

@Component({
  selector: "app-asl-letter",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./asl-letter.component.html",
  styleUrl: "./asl-letter.component.css",
})
export class ASLLetterComponent implements OnChanges {
  @Input() letter: string = "A";
  imageUrl: string = "";

  // Map of ASL letter images
  private letterImages: Record<string, string> = {
    A: "assets/pics/1.png",
    B: "assets/pics/2.png",
    C: "assets/pics/3.png",
    D: "assets/pics/4.png",
    E: "assets/pics/5.png",
    F: "assets/pics/6.png",
    G: "assets/pics/7.png",
    H: "assets/pics/8.png",
    I: "assets/pics/9.png",
    J: "assets/pics/10.png",
    K: "assets/pics/11.png",
    L: "assets/pics/12.png",
    M: "assets/pics/13.png",
    N: "assets/pics/14.png",
    O: "assets/pics/15.png",
    P: "assets/pics/16.png",
    Q: "assets/pics/17.png",
    R: "assets/pics/18.png",
    S: "assets/pics/19.png",
    T: "assets/pics/20.png",
    U: "assets/pics/21.png",
    V: "assets/pics/22.png",
    W: "assets/pics/23.png",
    X: "assets/pics/24.png",
    Y: "assets/pics/25.png",
    Z: "assets/pics/26.png",
  };

  ngOnChanges(): void {
    this.updateImageUrl();
  }

  private updateImageUrl(): void {
    // First try to use the local asset path
    const normalizedLetter = this.letter.toUpperCase();

    // Check if it's a valid letter A-Z
    if (/^[A-Z]$/.test(normalizedLetter)) {
      // Try to use local asset if available
      try {
        // For development, you might want to check if the file exists
        // In production, we'll just construct the path and let Angular's asset handling work
        this.imageUrl = this.letterImages[normalizedLetter];

        // If you want to use the fallback images from an external source
        // Comment out the line above and uncomment the line below
        // this.imageUrl = this.fallbackImageBaseUrl + this.fallbackImageMap[normalizedLetter];
      } catch (error) {
        console.error(
          `Error loading ASL image for letter ${normalizedLetter}:`,
          error
        );
        this.useDefaultImage();
      }
    } else {
      console.warn(`Invalid letter input: ${this.letter}`);
      this.useDefaultImage();
    }
  }

  private useDefaultImage(): void {
    // Use a default "unknown" image
    this.imageUrl = "assets/pics/1.png";

    // Or use a placeholder image service
    // this.imageUrl = `https://via.placeholder.com/300x300?text=${this.letter}`;
  }
}
