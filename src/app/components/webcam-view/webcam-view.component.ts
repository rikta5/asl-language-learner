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
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
  
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (this.video && this.video.readyState === this.video.HAVE_ENOUGH_DATA) {
      ctx.drawImage(this.video, 0, 0, 640, 480);
    }
  
    let feedback: "waiting" | "correct" | "incorrect" = "waiting";
  
    if (results.multiHandLandmarks?.length > 0) {
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
      feedback === "correct" ? "Correct!" :
      feedback === "incorrect" ? "Try again" : "Show hand gesture",
      10, 470
    );
  
    this.gestureResult.emit(feedback);
  }

  private normalizeLandmarks(landmarks: any[]): any[] {
    // Find bounding box of hand
    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;
    
    landmarks.forEach(lm => {
      minX = Math.min(minX, lm.x);
      minY = Math.min(minY, lm.y);
      maxX = Math.max(maxX, lm.x);
      maxY = Math.max(maxY, lm.y);
    });
  
    // Get hand dimensions for better scaling
    const width = maxX - minX;
    const height = maxY - minY;
    const size = Math.max(width, height);
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    
    // Normalize to 0-1 range relative to hand size with better centering
    return landmarks.map(lm => ({
      x: (lm.x - centerX) / size + 0.5,
      y: (lm.y - centerY) / size + 0.5,
      z: lm.z
    }));
  }
  
  private drawLandmarks(ctx: CanvasRenderingContext2D, landmarks: any[]) {
    ctx.save();
    
    // Draw connections for better visualization
    const connections = [
      // Thumb
      [0, 1], [1, 2], [2, 3], [3, 4],
      // Index finger
      [0, 5], [5, 6], [6, 7], [7, 8],
      // Middle finger
      [0, 9], [9, 10], [10, 11], [11, 12],
      // Ring finger
      [0, 13], [13, 14], [14, 15], [15, 16],
      // Pinky
      [0, 17], [17, 18], [18, 19], [19, 20],
      // Palm
      [0, 5], [5, 9], [9, 13], [13, 17]
    ];
    
    // Draw connections
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(0, 255, 0, 0.7)';
    connections.forEach(([i, j]) => {
      ctx.beginPath();
      ctx.moveTo(landmarks[i].x * 640, landmarks[i].y * 480);
      ctx.lineTo(landmarks[j].x * 640, landmarks[j].y * 480);
      ctx.stroke();
    });
    
    // Draw landmarks
    landmarks.forEach((lm, index) => {
      ctx.beginPath();
      ctx.arc(lm.x * 640, lm.y * 480, 5, 0, 2 * Math.PI);
      
      // Color-code different parts of the hand
      if (index === 0) { // Wrist
        ctx.fillStyle = "blue";
      } else if (index % 4 === 0) { // Fingertips
        ctx.fillStyle = "red";
      } else { // Other joints
        ctx.fillStyle = "green";
      }
      ctx.fill();
    });
    
    ctx.restore();
  }

  private recognizeASL(normalizedLandmarks: any[]): "waiting" | "correct" | "incorrect" {
    // Finger indices
    const TIPS = [4, 8, 12, 16, 20]; // Thumb, Index, Middle, Ring, Pinky
    const PIPS = [3, 7, 11, 15, 19]; // Proximal interphalangeal joints
    const MCPS = [2, 5, 9, 13, 17]; // Metacarpophalangeal joints
    const WRIST = normalizedLandmarks[0];
  
    // Get finger positions
    const thumbTip = normalizedLandmarks[TIPS[0]];
    const indexTip = normalizedLandmarks[TIPS[1]];
    const middleTip = normalizedLandmarks[TIPS[2]];
    const ringTip = normalizedLandmarks[TIPS[3]];
    const pinkyTip = normalizedLandmarks[TIPS[4]];
    
    // Get palm positions
    const palmBase = normalizedLandmarks[0];  // Wrist
    const thumbCMC = normalizedLandmarks[1];  // Thumb base
    const indexMCP = normalizedLandmarks[MCPS[1]];
    const pinkyMCP = normalizedLandmarks[MCPS[4]];
    
    // Calculate hand orientation
    const palmDirection = {
      x: (indexMCP.x + pinkyMCP.x) / 2 - palmBase.x,
      y: (indexMCP.y + pinkyMCP.y) / 2 - palmBase.y
    };
    const isHandVertical = Math.abs(palmDirection.y) > Math.abs(palmDirection.x);
    const isPalmFacingCamera = normalizedLandmarks[MCPS[2]].z < palmBase.z;
  
    // Improved finger extension detection with angle-based approach
    const getFingerDirection = (tip: number, pip: number, mcp: number) => {
      const tipPoint = normalizedLandmarks[tip];
      const pipPoint = normalizedLandmarks[pip];
      const mcpPoint = normalizedLandmarks[mcp];
      
      // Vector from mcp to pip
      const v1 = {
        x: pipPoint.x - mcpPoint.x,
        y: pipPoint.y - mcpPoint.y,
        z: pipPoint.z - mcpPoint.z
      };
      
      // Vector from pip to tip
      const v2 = {
        x: tipPoint.x - pipPoint.x,
        y: tipPoint.y - pipPoint.y,
        z: tipPoint.z - pipPoint.z
      };
      
      // Dot product
      const dotProduct = v1.x * v2.x + v1.y * v2.y + v1.z * v2.z;
      
      // Magnitudes
      const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y + v1.z * v1.z);
      const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y + v2.z * v2.z);
      
      // Angle in radians
      const angle = Math.acos(dotProduct / (mag1 * mag2));
      
      return {
        angle: angle,
        direction: {
          x: tipPoint.x - mcpPoint.x,
          y: tipPoint.y - mcpPoint.y,
          z: tipPoint.z - mcpPoint.z
        },
        extended: angle > 2.7  // Around 155 degrees (straightened)
      };
    };
    
    // Calculate finger extensions with the improved method
    const thumbDir = getFingerDirection(TIPS[0], PIPS[0], MCPS[0]);
    const indexDir = getFingerDirection(TIPS[1], PIPS[1], MCPS[1]);
    const middleDir = getFingerDirection(TIPS[2], PIPS[2], MCPS[2]);
    const ringDir = getFingerDirection(TIPS[3], PIPS[3], MCPS[3]);
    const pinkyDir = getFingerDirection(TIPS[4], PIPS[4], MCPS[4]);
    
    // Check if fingers are extended
    const thumbExtended = thumbDir.extended;
    const indexExtended = indexDir.extended;
    const middleExtended = middleDir.extended;
    const ringExtended = ringDir.extended;
    const pinkyExtended = pinkyDir.extended;
    
    // Check if fingers are curved
    const indexCurved = (indexDir.angle > 1.5 && indexDir.angle < 2.5);
    const thumbCurved = (thumbDir.angle > 1.5 && thumbDir.angle < 2.5);
    
    // Check finger touch conditions with improved thresholds
    const dynamicThreshold = 0.12;  // Adaptive threshold based on hand size
    const fingerTouching = (p1: any, p2: any) => this.distance(p1, p2) < dynamicThreshold;
    
    // Check if thumb is across palm
    const thumbAcrossPalm = (thumbTip.x < indexMCP.x) && !isPalmFacingCamera;
    
    // Check finger adjacency (for letters like H)
    const fingersAdjacent = (i: number, j: number) => {
      const tip1 = normalizedLandmarks[TIPS[i]];
      const tip2 = normalizedLandmarks[TIPS[j]];
      return Math.abs(tip1.x - tip2.x) < dynamicThreshold;
    };
    
    // Check if fingers are spread apart
    const fingersSpread = (i: number, j: number) => {
      const tip1 = normalizedLandmarks[TIPS[i]];
      const tip2 = normalizedLandmarks[TIPS[j]];
      return Math.abs(tip1.x - tip2.x) > dynamicThreshold * 2;
    };
  
    // Letter recognition with improved rules
    switch (this.currentLetter.toUpperCase()) {
      // A: Closed fist with thumb alongside
      case "A":
        return (!indexExtended && !middleExtended && !ringExtended && !pinkyExtended && 
                thumbDir.direction.x > 0 && !thumbExtended) ? "correct" : "incorrect";
  
      // B: All fingers extended upward, thumb across palm
      case "B":
        return (indexExtended && middleExtended && ringExtended && pinkyExtended && 
                !thumbExtended && isHandVertical && indexDir.direction.y < 0) ? "correct" : "incorrect";
  
      // C: Curved C shape with fingers together
      case "C":
        return (indexCurved && middleDir.angle > 1.5 && ringDir.angle > 1.5 && 
                thumbCurved && this.distance(thumbTip, indexTip) > dynamicThreshold * 2 &&
                !fingersSpread(1, 2) && !fingersSpread(2, 3) && !fingersSpread(3, 4)) ? "correct" : "incorrect";
  
      // D: Index extended upward, others curled
      case "D":
        return (indexExtended && !middleExtended && !ringExtended && !pinkyExtended && 
                !thumbExtended && isHandVertical && indexDir.direction.y < 0) ? "correct" : "incorrect";
  
      // E: All fingers curled into palm
      case "E":
        return (!indexExtended && !middleExtended && !ringExtended && !pinkyExtended && 
                !thumbExtended && thumbTip.y < indexTip.y) ? "correct" : "incorrect";
  
      // F: Index and thumb touching, other fingers extended
      case "F":
        return (fingerTouching(thumbTip, indexTip) && middleExtended && 
                ringExtended && pinkyExtended) ? "correct" : "incorrect";
  
      // G: Index pointing sideways, thumb parallel
      case "G":
        return (indexExtended && !middleExtended && !ringExtended && !pinkyExtended && 
                !isHandVertical && Math.abs(indexDir.direction.x) > Math.abs(indexDir.direction.y) &&
                thumbDir.direction.x * indexDir.direction.x > 0) ? "correct" : "incorrect";
  
      // H: Index and middle extended together horizontally
      case "H":
        return (indexExtended && middleExtended && !ringExtended && !pinkyExtended && 
                !thumbExtended && !isHandVertical && fingersAdjacent(1, 2)) ? "correct" : "incorrect";
  
      // I: Pinky extended upward, others closed
      case "I":
        return (!indexExtended && !middleExtended && !ringExtended && pinkyExtended && 
                !thumbExtended && isHandVertical && pinkyDir.direction.y < 0) ? "correct" : "incorrect";
  
      // J: Motion-based - we can approximate with pinky moving in J shape (not perfect)
      case "J":
        return (!indexExtended && !middleExtended && !ringExtended && pinkyExtended && 
                !thumbExtended && !isHandVertical) ? "correct" : "incorrect";
  
      // K: Index and middle extended upward with separation, thumb touching palm
      case "K":
        return (indexExtended && middleExtended && !ringExtended && !pinkyExtended && 
                thumbExtended && fingersSpread(1, 2) && isHandVertical) ? "correct" : "incorrect";
  
      // L: Index extended upward, thumb extended sideways (90-degree angle)
      case "L":
        return (indexExtended && !middleExtended && !ringExtended && !pinkyExtended && 
                thumbExtended && isHandVertical && 
                Math.abs(indexDir.direction.y) > Math.abs(indexDir.direction.x) &&
                Math.abs(thumbDir.direction.x) > Math.abs(thumbDir.direction.y)) ? "correct" : "incorrect";
  
      // M: Three fingers folded, thumb between them
      case "M":
        return (!indexExtended && !middleExtended && !ringExtended && !pinkyExtended && 
                thumbTip.x < indexMCP.x && thumbTip.y > indexTip.y) ? "correct" : "incorrect";
  
      // N: Index and middle folded, thumb between them
      case "N":
        return (!indexExtended && !middleExtended && !ringExtended && !pinkyExtended && 
                thumbTip.x < indexMCP.x && thumbTip.y > middleTip.y) ? "correct" : "incorrect";
  
      // O: Finger and thumb tips form circle
      case "O":
        return (fingerTouching(thumbTip, indexTip) && 
                !middleExtended && !ringExtended && !pinkyExtended &&
                indexCurved) ? "correct" : "incorrect";
  
      // P: Index pointing down, thumb out
      case "P":
        return (indexExtended && !middleExtended && !ringExtended && !pinkyExtended && 
                thumbExtended && isHandVertical && indexDir.direction.y > 0) ? "correct" : "incorrect";
  
      // Q: Index down, thumb sideways
      case "Q":
        return (indexExtended && !middleExtended && !ringExtended && !pinkyExtended && 
                thumbExtended && isHandVertical && indexDir.direction.y > 0 &&
                Math.abs(thumbDir.direction.x) > Math.abs(thumbDir.direction.y)) ? "correct" : "incorrect";
  
      // R: Index and middle extended upward with crossed fingers
      case "R":
        return (indexExtended && middleExtended && !ringExtended && !pinkyExtended && 
                isHandVertical && !fingersAdjacent(1, 2) && indexTip.x > middleTip.x) ? "correct" : "incorrect";
  
      // S: Fist with thumb across fingers
      case "S":
        return (!indexExtended && !middleExtended && !ringExtended && !pinkyExtended && 
                thumbAcrossPalm) ? "correct" : "incorrect";
  
      // T: Thumb between index and middle finger
      case "T":
        return (!indexExtended && !middleExtended && !ringExtended && !pinkyExtended && 
                thumbExtended && thumbTip.y < indexTip.y && thumbTip.x > indexMCP.x) ? "correct" : "incorrect";
  
      // U: Index and middle extended upward together
      case "U":
        return (indexExtended && middleExtended && !ringExtended && !pinkyExtended && 
                !thumbExtended && isHandVertical && fingersAdjacent(1, 2) &&
                indexDir.direction.y < 0 && middleDir.direction.y < 0) ? "correct" : "incorrect";
  
      // V: Index and middle extended upward apart
      case "V":
        return (indexExtended && middleExtended && !ringExtended && !pinkyExtended && 
                !thumbExtended && isHandVertical && fingersSpread(1, 2) &&
                indexDir.direction.y < 0 && middleDir.direction.y < 0) ? "correct" : "incorrect";
  
      // W: Index, middle, and ring extended and apart
      case "W":
        return (indexExtended && middleExtended && ringExtended && !pinkyExtended && 
                !thumbExtended && isHandVertical && 
                fingersSpread(1, 2) && fingersSpread(2, 3)) ? "correct" : "incorrect";
  
      // X: Index partially bent
      case "X":
        return (indexCurved && !indexExtended && !middleExtended && !ringExtended && 
                !pinkyExtended && thumbExtended) ? "correct" : "incorrect";
  
      // Y: Thumb and pinky extended only
      case "Y":
        return (!indexExtended && !middleExtended && !ringExtended && pinkyExtended && 
                thumbExtended && fingersSpread(0, 4)) ? "correct" : "incorrect";
  
      // Z: Motion-based - approximate with index finger pointing sideways
      case "Z":
        return (indexExtended && !middleExtended && !ringExtended && !pinkyExtended && 
                !thumbExtended && !isHandVertical && 
                Math.abs(indexDir.direction.x) > Math.abs(indexDir.direction.y)) ? "correct" : "incorrect";
  
      default:
        return "waiting";
    }
  }

  private distance(p1: any, p2: any): number {
    return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2) + Math.pow(p1.z - p2.z, 2));
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
