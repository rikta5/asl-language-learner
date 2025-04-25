import {
  Component,
  OnInit,
  ViewChild,
  ElementRef,
  OnDestroy,
  Output,
  EventEmitter,
  Input,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { WebcamService } from "../../services/webcam.service";
import { LetterService } from "../../services/letter.service";
import { Subscription } from "rxjs";

declare const Hands: any;
declare const Camera: any;

@Component({
  selector: "app-webcam-view",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./webcam-view.component.html",
  styleUrl: "./webcam-view.component.css",
})
export class WebcamViewComponent implements OnInit, OnDestroy {
  @ViewChild("webcamCanvas") webcamCanvas!: ElementRef<HTMLCanvasElement>;
  @Input() currentLetter: string = "A";
  @Output() gestureResult = new EventEmitter<
    "waiting" | "correct" | "incorrect"
  >();
  hasWebcamPermission = false;
  errorMessage = "";
  private subscription: Subscription = new Subscription();
  private camera: any;
  private video!: HTMLVideoElement;
  private animationFrameId: number | null = null;
  private hands: any;

  constructor(
    private webcamService: WebcamService,
    private letterService: LetterService
  ) {}

  ngOnInit(): void {
    console.log("WebcamViewComponent: ngOnInit");
    this.subscription.add(
      this.webcamService.webcamPermission$.subscribe((hasPermission) => {
        console.log("Permission status:", hasPermission);
        this.hasWebcamPermission = hasPermission;
        if (hasPermission) {
          console.log("Starting MediaPipe");
          this.startMediaPipe();
        }
      })
    );

    this.subscription.add(
      this.webcamService.error$.subscribe((error) => {
        console.log("Error received:", error);
        this.errorMessage = error;
      })
    );

    this.webcamService.error$.subscribe((error) => (this.errorMessage = error));
  }

  ngAfterViewInit(): void {
    console.log("WebcamViewComponent: ngAfterViewInit");
    this.webcamService.initCanvas(this.webcamCanvas.nativeElement);
  }

  enableWebcam(): void {
    console.log("WebcamViewComponent: enableWebcam");
    this.webcamService.requestPermission();
  }

  stopWebcam() {
    if (this.camera) {
      this.camera.stop();
      this.camera = null;
    }

    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.webcamService.stopWebcam();
  }

  private startMediaPipe(): void {
    console.log("startMediaPipe: Initializing Hands");
    if (typeof Hands === "undefined") {
      console.error("MediaPipe Hands not loaded");
      this.errorMessage =
        "MediaPipe library failed to load, falling back to webcam feed";
      this.startWebcamCapture();
      return;
    }

    try {
      this.hands = new Hands({
        locateFile: (file: string) => {
          console.log("Loading MediaPipe file:", file);
          return `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1646424915/${file}`;
        },
      });

      this.hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 1,
        minDetectionConfidence: 0.5,
      });

      this.hands.onResults(this.handleResults.bind(this));

      console.log("startMediaPipe: Initializing Video");
      const stream = this.webcamService.getStream();
      if (!stream) {
        console.error("No stream available");
        this.errorMessage = "Webcam stream not available";
        return;
      }

      this.video = document.createElement("video");
      this.video.srcObject = stream;
      this.video.width = 640;
      this.video.height = 480;
      this.video.onloadedmetadata = () => {
        console.log("Video metadata loaded, playing video");
        this.video
          .play()
          .then(() => {
            console.log("Video playing");
          })
          .catch((err: any) => {
            console.error("Video play failed:", err);
            this.errorMessage = "Failed to play webcam video";
          });
      };

      console.log("startMediaPipe: Initializing Camera");
      this.camera = new Camera(this.video, {
        onFrame: async () => {
          if (this.hands && this.video) {
            try {
              await this.hands.send({ image: this.video });
            } catch (err) {
              console.error("Error during hand detection:", err);
            }
          }
        },
        width: 640,
        height: 480,
      });

      this.camera
        .start()
        .then(() => {
          console.log("Camera started successfully");
        })
        .catch((err: any) => {
          console.error("Camera failed to start:", err);
          this.errorMessage = "Failed to start webcam feed";
          this.startWebcamCapture();
        });
    } catch (error) {
      console.error("Error initializing MediaPipe:", error);
      this.errorMessage = "Failed to initialize hand tracking";
      this.startWebcamCapture();
    }
  }

  private handleResults(results: any): void {
    const canvas = this.webcamCanvas.nativeElement;
    const ctx = canvas.getContext("2d");

    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (this.video && this.video.readyState === this.video.HAVE_ENOUGH_DATA) {
      ctx.drawImage(this.video, 0, 0, 640, 480);
    }

    let feedback: "waiting" | "correct" | "incorrect" = "waiting";

    // Safe check for multiHandLandmarks existence and non-empty array
    if (
      results.multiHandLandmarks &&
      Array.isArray(results.multiHandLandmarks) &&
      results.multiHandLandmarks.length > 0
      //&&
      //["A", "B", "C"].includes(this.currentLetter)
    ) {
      const landmarks = results.multiHandLandmarks[0];

      // Double-check landmarks is an array with expected length
      if (Array.isArray(landmarks) && landmarks.length >= 9) {
        console.log("Landmarks detected:", landmarks.length);

        // Draw landmarks
        for (const lm of landmarks) {
          ctx.beginPath();
          ctx.arc(lm.x * 640, lm.y * 480, 5, 0, 2 * Math.PI);
          ctx.fillStyle = "red";
          ctx.fill();
        }

        // Safe access to specific landmarks
        const thumbTip = landmarks[4];
        const indexBase = landmarks[5];
        const indexTip = landmarks[8];
        const middleTip = landmarks[12];
        const ringTip = landmarks[16];
        const pinkyTip = landmarks[20];

        const thumbMCP = landmarks[2];
        const indexMCP = landmarks[5];
        const middleMCP = landmarks[9];
        const ringMCP = landmarks[13];
        const pinkyMCP = landmarks[17];

        const thumbIP = landmarks[3];
        const palmBase = landmarks[0];

        if (thumbTip && indexBase && indexTip) {
          if (
            this.currentLetter === "A" &&
            thumbTip.x > indexBase.x &&
            Math.abs(indexTip.y - indexBase.y) < 0.1
          ) {
            feedback = "correct";
          } else if (
            this.currentLetter === "B" &&
            Math.abs(thumbTip.x - indexBase.x) < 0.05 &&
            Math.abs(indexTip.y - indexBase.y) > 0.2
          ) {
            feedback = "correct";
          } else if (
            this.currentLetter === "C" &&
            thumbTip.x < indexBase.x &&
            indexTip.x < indexBase.x
          ) {
            feedback = "correct";
          } else if (this.currentLetter === "D") {
            if (
              indexTip.y < middleTip.y &&
              middleTip.y < ringTip.y &&
              ringTip.y < pinkyTip.y &&
              thumbTip.x < indexTip.x
            ) {
              feedback = "correct";
            }
          } else if (this.currentLetter === "E") {
            if (
              indexTip.y > indexMCP.y &&
              middleTip.y > middleMCP.y &&
              ringTip.y > ringMCP.y &&
              pinkyTip.y > pinkyMCP.y &&
              thumbTip.x < indexTip.x
            ) {
              feedback = "correct";
            }
          } else if (this.currentLetter === "F") {
            const dist = Math.hypot(
              indexTip.x - thumbTip.x,
              indexTip.y - thumbTip.y
            );
            if (
              dist < 0.07 &&
              middleTip.y < middleMCP.y &&
              ringTip.y < ringMCP.y &&
              pinkyTip.y < pinkyMCP.y
            ) {
              feedback = "correct";
            }
          } else if (this.currentLetter === "G") {
            if (
              thumbTip.y < thumbIP.y &&
              indexTip.x > indexMCP.x &&
              middleTip.y > middleMCP.y &&
              ringTip.y > ringMCP.y &&
              pinkyTip.y > pinkyMCP.y
            ) {
              feedback = "correct";
            }
          } else if (this.currentLetter === "H") {
            if (
              indexTip.y < indexMCP.y &&
              middleTip.y < middleMCP.y &&
              ringTip.y > ringMCP.y &&
              pinkyTip.y > pinkyMCP.y &&
              indexTip.x < middleTip.x
            ) {
              feedback = "correct";
            }
          } else if (this.currentLetter === "I") {
            if (
              pinkyTip.y < pinkyMCP.y &&
              indexTip.y > indexMCP.y &&
              middleTip.y > middleMCP.y &&
              ringTip.y > ringMCP.y &&
              thumbTip.x < indexTip.x
            ) {
              feedback = "correct";
            }
          } else if (this.currentLetter === "J") {
            if (
              pinkyTip.y < pinkyMCP.y &&
              indexTip.y > indexMCP.y &&
              middleTip.y > middleMCP.y &&
              ringTip.y > ringMCP.y &&
              thumbTip.x > pinkyTip.x
            ) {
              feedback = "correct";
            }
          } else if (this.currentLetter === "K") {
            if (
              middleTip.y < middleMCP.y &&
              indexTip.y < indexMCP.y &&
              thumbTip.x < indexTip.x
            ) {
              feedback = "correct";
            }
          } else if (this.currentLetter === "L") {
            if (
              indexTip.y < indexMCP.y &&
              thumbTip.x < thumbIP.x &&
              middleTip.y > middleMCP.y &&
              ringTip.y > ringMCP.y &&
              pinkyTip.y > pinkyMCP.y
            ) {
              feedback = "correct";
            }
          } else if (this.currentLetter === "M") {
            if (
              thumbTip.x < indexTip.x &&
              indexTip.y > indexMCP.y &&
              middleTip.y > middleMCP.y &&
              ringTip.y > ringMCP.y &&
              pinkyTip.y < pinkyMCP.y
            ) {
              feedback = "correct";
            }
          } else if (this.currentLetter === "N") {
            if (
              thumbTip.x < indexTip.x &&
              indexTip.y > indexMCP.y &&
              middleTip.y > middleMCP.y &&
              ringTip.y < ringMCP.y &&
              pinkyTip.y < pinkyMCP.y
            ) {
              feedback = "correct";
            }
          } else if (this.currentLetter === "O") {
            const dist = Math.hypot(
              thumbTip.x - indexTip.x,
              thumbTip.y - indexTip.y
            );
            if (
              dist < 0.1 &&
              middleTip.y < middleMCP.y &&
              ringTip.y < ringMCP.y &&
              pinkyTip.y < pinkyMCP.y
            ) {
              feedback = "correct";
            }
          } else if (this.currentLetter === "P") {
            if (
              indexTip.y < indexMCP.y &&
              middleTip.y > middleMCP.y &&
              thumbTip.y < indexTip.y
            ) {
              feedback = "correct";
            }
          } else if (this.currentLetter === "Q") {
            if (
              thumbTip.y > thumbIP.y &&
              indexTip.x < indexMCP.x &&
              middleTip.y > middleMCP.y &&
              ringTip.y > ringMCP.y &&
              pinkyTip.y > pinkyMCP.y
            ) {
              feedback = "correct";
            }
          } else if (this.currentLetter === "R") {
            if (
              indexTip.y < indexMCP.y &&
              middleTip.y < middleMCP.y &&
              ringTip.y > ringMCP.y &&
              pinkyTip.y > pinkyMCP.y &&
              indexTip.x < middleTip.x
            ) {
              feedback = "correct";
            }
          } else if (this.currentLetter === "S") {
            if (
              indexTip.y > indexMCP.y &&
              middleTip.y > middleMCP.y &&
              ringTip.y > ringMCP.y &&
              pinkyTip.y > pinkyMCP.y &&
              thumbTip.x < palmBase.x
            ) {
              feedback = "correct";
            }
          } else if (this.currentLetter === "T") {
            const dist = Math.hypot(
              thumbTip.x - indexTip.x,
              thumbTip.y - indexTip.y
            );
            if (
              dist < 0.07 &&
              middleTip.y > middleMCP.y &&
              ringTip.y > ringMCP.y &&
              pinkyTip.y > pinkyMCP.y
            ) {
              feedback = "correct";
            }
          } else if (this.currentLetter === "U") {
            if (
              indexTip.y < indexMCP.y &&
              middleTip.y < middleMCP.y &&
              ringTip.y > ringMCP.y &&
              pinkyTip.y > pinkyMCP.y
            ) {
              feedback = "correct";
            }
          } else if (this.currentLetter === "V") {
            if (
              indexTip.y < indexMCP.y &&
              middleTip.y < middleMCP.y &&
              ringTip.y > ringMCP.y &&
              pinkyTip.y > pinkyMCP.y &&
              Math.abs(indexTip.x - middleTip.x) > 0.03
            ) {
              feedback = "correct";
            }
          } else if (this.currentLetter === "W") {
            if (
              indexTip.y < indexMCP.y &&
              middleTip.y < middleMCP.y &&
              ringTip.y < ringMCP.y &&
              pinkyTip.y > pinkyMCP.y
            ) {
              feedback = "correct";
            }
          } else if (this.currentLetter === "X") {
            if (
              indexTip.x < indexMCP.x &&
              indexTip.y > indexMCP.y &&
              middleTip.y > middleMCP.y &&
              ringTip.y > ringMCP.y &&
              pinkyTip.y > pinkyMCP.y
            ) {
              feedback = "correct";
            }
          } else if (this.currentLetter === "Y") {
            if (
              thumbTip.x < thumbMCP.x &&
              pinkyTip.y < pinkyMCP.y &&
              indexTip.y > indexMCP.y &&
              middleTip.y > middleMCP.y &&
              ringTip.y > ringMCP.y
            ) {
              feedback = "correct";
            }
          } else if (this.currentLetter === "Z") {
            if (
              indexTip.y < indexMCP.y &&
              middleTip.y > middleMCP.y &&
              ringTip.y > ringMCP.y &&
              pinkyTip.y > pinkyMCP.y &&
              thumbTip.x > indexTip.x
            ) {
              feedback = "correct";
            }
          } else {
            feedback = "incorrect";
          }
        } else {
          feedback = "waiting";
          console.warn("Incomplete hand landmarks detected");
        }
      } else {
        console.warn("Invalid landmarks array:", landmarks);
      }
    } else {
      feedback = "waiting";
    }

    // Draw status text
    ctx.fillStyle =
      feedback === "correct"
        ? "green"
        : feedback === "incorrect"
        ? "red"
        : "black";
    ctx.font = "24px Arial";
    ctx.fillText(
      feedback === "waiting" ? "No hand detected" : feedback,
      10,
      470
    );

    this.gestureResult.emit(feedback);
  }

  private startWebcamCapture(): void {
    console.log("startWebcamCapture: Fallback to WebcamService drawing");
    const stream = this.webcamService.getStream();
    if (!stream) {
      console.error("No stream available for fallback");
      return;
    }

    this.video = document.createElement("video");
    this.video.srcObject = stream;
    this.video.width = 640;
    this.video.height = 480;
    this.video.onloadedmetadata = () => {
      this.video
        .play()
        .then(() => {
          console.log("Fallback video playing");
          const canvas = this.webcamCanvas.nativeElement;
          const ctx = canvas.getContext("2d");

          if (!ctx) return;

          const drawFrame = () => {
            if (this.video.readyState === this.video.HAVE_ENOUGH_DATA) {
              ctx.drawImage(this.video, 0, 0, 640, 480);
              ctx.fillStyle = "black";
              ctx.font = "24px Arial";
              ctx.fillText(
                "MediaPipe failed, showing webcam feed only",
                10,
                470
              );
            }
            this.animationFrameId = requestAnimationFrame(drawFrame);
          };
          drawFrame();
        })
        .catch((err: any) => {
          console.error("Fallback video play failed:", err);
          this.errorMessage = "Failed to play webcam video in fallback";
        });
    };
  }

  ngOnDestroy(): void {
    console.log("WebcamViewComponent: ngOnDestroy");
    this.webcamService.stopWebcam();
    if (this.camera) {
      this.camera.stop();
    }
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    this.subscription.unsubscribe();
  }
}
