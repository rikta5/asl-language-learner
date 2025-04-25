import { Injectable } from "@angular/core";
import { BehaviorSubject } from "rxjs";

@Injectable({
  providedIn: "root",
})
export class LetterService {
  private readonly alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  private currentLetterSubject = new BehaviorSubject<string>(this.alphabet[0]);

  currentLetter$ = this.currentLetterSubject.asObservable();

  constructor() {}

  previousLetter(): void {
    const currentIndex = this.alphabet.indexOf(this.currentLetterSubject.value);
    if (currentIndex > 0) {
      const prevIndex = currentIndex - 1;
      this.currentLetterSubject.next(this.alphabet[prevIndex]);
    }
  }

  nextLetter(): void {
    const currentIndex = this.alphabet.indexOf(this.currentLetterSubject.value);
    const nextIndex = (currentIndex + 1) % this.alphabet.length;
    this.currentLetterSubject.next(this.alphabet[nextIndex]);
  }

  setLetter(letter: string): void {
    if (this.alphabet.includes(letter)) {
      this.currentLetterSubject.next(letter);
    }
  }
}
