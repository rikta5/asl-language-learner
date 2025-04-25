import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class WebcamService {
  private stream: MediaStream | null = null;
  private webcamPermissionSubject = new BehaviorSubject<boolean>(false);
  private errorSubject = new BehaviorSubject<string>('');

  webcamPermission$ = this.webcamPermissionSubject.asObservable();
  error$ = this.errorSubject.asObservable();

  constructor() {}

  initCanvas(canvas: HTMLCanvasElement): void {
    this.requestPermission();
  }

  requestPermission(): void {
    this.errorSubject.next('');

    navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 640 },
        height: { ideal: 480 },
        facingMode: 'user',
      },
    })
      .then(stream => {
        this.stream = stream;
        this.webcamPermissionSubject.next(true);
        this.errorSubject.next('');
      })
      .catch(error => {
        console.error('Error accessing webcam:', error);
        this.errorSubject.next('Could not access webcam. Please check permissions.');
        this.webcamPermissionSubject.next(false);
      });
  }

  getStream(): MediaStream | null {
    return this.stream;
  }

  stopWebcam(): void {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    this.webcamPermissionSubject.next(false);
  }
}