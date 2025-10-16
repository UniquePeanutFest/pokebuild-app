import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

@Component({
  selector: 'app-progress-indicator',
  templateUrl: './progress-indicator.component.html',
  styleUrls: ['./progress-indicator.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule]
})
export class ProgressIndicatorComponent implements OnInit, OnDestroy {
  @Input() progress: number = 0;
  @Input() total: number = 100;
  @Input() showPercentage: boolean = true;
  @Input() showText: boolean = true;
  @Input() text: string = 'Cargando...';
  @Input() color: string = 'primary';
  @Input() size: 'small' | 'medium' | 'large' = 'medium';
  @Input() type: 'linear' | 'circular' | 'dots' = 'linear';
  @Input() animated: boolean = true;

  percentage: number = 0;
  private animationFrame: number | null = null;

  ngOnInit() {
    this.updateProgress();
  }

  ngOnDestroy() {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }
  }

  ngOnChanges() {
    this.updateProgress();
  }

  private updateProgress() {
    if (this.animated) {
      this.animateProgress();
    } else {
      this.percentage = Math.min(100, Math.max(0, (this.progress / this.total) * 100));
    }
  }

  private animateProgress() {
    const targetPercentage = Math.min(100, Math.max(0, (this.progress / this.total) * 100));
    const startPercentage = this.percentage;
    const duration = 500; // 500ms animation
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function (ease-out)
      const easeOut = 1 - Math.pow(1 - progress, 3);
      
      this.percentage = startPercentage + (targetPercentage - startPercentage) * easeOut;
      
      if (progress < 1) {
        this.animationFrame = requestAnimationFrame(animate);
      }
    };

    this.animationFrame = requestAnimationFrame(animate);
  }

  get progressText(): string {
    if (this.showText && this.text) {
      return this.text;
    }
    return '';
  }

  get percentageText(): string {
    if (this.showPercentage) {
      return `${Math.round(this.percentage)}%`;
    }
    return '';
  }
}
