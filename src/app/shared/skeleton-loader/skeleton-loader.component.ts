import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

@Component({
  selector: 'app-skeleton-loader',
  templateUrl: './skeleton-loader.component.html',
  styleUrls: ['./skeleton-loader.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule]
})
export class SkeletonLoaderComponent {
  @Input() type: 'pokemon-card' | 'pokemon-list' | 'team-card' | 'item-list' | 'stats' | 'custom' = 'pokemon-card';
  @Input() count: number = 1;
  @Input() height: string = 'auto';
  @Input() width: string = '100%';
  @Input() borderRadius: string = '8px';

  get skeletonItems(): number[] {
    return Array(this.count).fill(0);
  }
}
