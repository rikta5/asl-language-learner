import {
  Component,
  OnInit,
  ViewChild,
  ElementRef,
  OnDestroy,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { WebcamService } from "../../services/webcam.service";

@Component({
  selector: "app-webcam-view",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./webcam-view.component.html",
  styleUrl: "./webcam-view.component.css",
})
export class WebcamViewComponent implements OnInit, OnDestroy {
  @ViewChild("webcamCanvas") webcamCanvas!: ElementRef<HTMLCanvasElement>;
  hasWebcamPermission = false;
  errorMessage = "";

  constructor(private webcamService: WebcamService) {}

  ngOnInit(): void {
    this.webcamService.webcamPermission$.subscribe(
      (hasPermission) => (this.hasWebcamPermission = hasPermission)
    );

    this.webcamService.error$.subscribe((error) => (this.errorMessage = error));
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
