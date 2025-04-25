import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class WebcamService {
  private stream: MediaStream | null = null;
  private canvasContext: CanvasRenderingContext2D | null = null;
  private animationFrameId: number | null = null;
  
  private webcamPermissionSubject = new BehaviorSubject<boolean>(false);
  private errorSubject = new BehaviorSubject<string>('');
  
  webcamPermission$ = this.webcamPermissionSubject.asObservable();
  error$ = this.errorSubject.asObservable();
  
  constructor() {}
  
  initCanvas(canvas: HTMLCanvasElement): void {
    this.canvasContext = canvas.getContext('2d');
    
    // Try to automatically request permission on init
    this.requestPermission();
  }
  
  requestPermission(): void {
    this.errorSubject.next('');
    
    navigator.mediaDevices.getUserMedia({
      video: { 
        width: { ideal: 640 },
        height: { ideal: 480 },
        facingMode: 'user'
      }
    })
    .then(stream => {
      this.stream = stream;
      this.webcamPermissionSubject.next(true);
      this.startWebcamCapture();
    })
    .catch(error => {
      console.error('Error accessing webcam:', error);
      this.errorSubject.next('Could not access webcam. Please check permissions.');
      this.webcamPermissionSubject.next(false);
    });
  }
  
  private startWebcamCapture(): void {
    if (!this.stream || !this.canvasContext) return;
    
    const video = document.createElement('video');
    video.srcObject = this.stream;
    video.play();
    
    const drawFrame = () => {
      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        this.canvasContext!.drawImage(video, 0, 0, 640, 480);
      }
      this.animationFrameId = requestAnimationFrame(drawFrame);
    };
    
    drawFrame();
  }
  
  stopWebcam(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    
    this.webcamPermissionSubject.next(false);
  }
}