import { Component, OnInit, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WebcamService } from '../../services/webcam.service';

@Component({
  selector: 'app-webcam-view',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex flex-col items-center">
      <div 
        class="relative w-full max-w-[640px] border-2 border-black rounded-lg overflow-hidden"
        [class.opacity-60]="!hasWebcamPermission"
      >
        <canvas #webcamCanvas width="640" height="480" 
          class="w-full h-auto"
          aria-label="Webcam feed for ASL letter practice"
        ></canvas>
        
        <div *ngIf="!hasWebcamPermission" 
          class="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 text-white p-4 text-center">
          <div>
            <p class="text-xl font-medium mb-4">Webcam access required</p>
            <button 
              (click)="enableWebcam()"
              class="btn btn-primary"
              aria-label="Enable webcam"
            >
              Enable Webcam
            </button>
          </div>
        </div>
      </div>
      
      <p *ngIf="errorMessage" class="mt-2 text-error-500" role="alert">
        {{ errorMessage }}
      </p>
    </div>
  `
})
export class WebcamViewComponent implements OnInit, OnDestroy {
  @ViewChild('webcamCanvas') webcamCanvas!: ElementRef<HTMLCanvasElement>;
  hasWebcamPermission = false;
  errorMessage = '';

  constructor(private webcamService: WebcamService) {}

  ngOnInit(): void {
    this.webcamService.webcamPermission$.subscribe(
      hasPermission => this.hasWebcamPermission = hasPermission
    );
    
    this.webcamService.error$.subscribe(
      error => this.errorMessage = error
    );
  }

  ngAfterViewInit(): void {
    if (this.webcamCanvas) {
      this.webcamService.initCanvas(this.webcamCanvas.nativeElement);
    }
  }

  enableWebcam(): void {
    this.webcamService.requestPermission();
  }

  ngOnDestroy(): void {
    this.webcamService.stopWebcam();
  }
}