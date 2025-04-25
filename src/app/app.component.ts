import { Component } from "@angular/core";
import { CommonModule } from "@angular/common";
import { HeaderComponent } from "./components/header/header.component";
import { WebcamViewComponent } from "./components/webcam-view/webcam-view.component";
import { ASLLetterComponent } from "./components/asl-letter/asl-letter.component";
import { FeedbackComponent } from "./components/feedback/feedback.component";
import { LetterService } from "./services/letter.service";

@Component({
  selector: "app-root",
  standalone: true,
  imports: [
    CommonModule,
    HeaderComponent,
    WebcamViewComponent,
    ASLLetterComponent,
    FeedbackComponent,
  ],
  template: `
    <div class="min-h-screen bg-white flex flex-col background">
      <div class="container-app py-8 flex-1 flex flex-col">
        <ng-container
          *ngIf="letterService.currentLetter$ | async as currentLetter"
        >
          <app-header [currentLetter]="currentLetter"></app-header>
          <main class="flex-1 my-8">
            <div
              class="flex flex-col md:flex-row gap-8 items-center justify-center main-container"
            >
              <app-webcam-view
                [currentLetter]="currentLetter"
                (gestureResult)="updateFeedback($event)"
              ></app-webcam-view>
              <app-asl-letter
                [letter]="currentLetter"
                class="animate-fade-in"
              ></app-asl-letter>
            </div>
          </main>
          <app-feedback
            [status]="feedback"
            (nextLetter)="nextLetter()"
            (previousLetter)="previousLetter()"
          ></app-feedback>
        </ng-container>
      </div>
    </div>
  `,
  styleUrl: "./app.component.css",
})
export class AppComponent {
  feedback: "waiting" | "correct" | "incorrect" = "waiting";
  private letters = ["A", "B", "C"];
  private currentIndex = 0;

  constructor(public letterService: LetterService) {}

  updateFeedback(status: "waiting" | "correct" | "incorrect") {
    this.feedback = status;
  }

  previousLetter() {
    this.letterService.previousLetter();
  }

  nextLetter() {
    this.letterService.nextLetter();
  }
}
