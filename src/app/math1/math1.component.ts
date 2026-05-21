// math1/math1.component.ts

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatBadgeModule } from '@angular/material/badge';

import { MathTopicsService } from '../services/math-topics.service';
import { Topic, SubTopic } from '../models/math-topic.model';

@Component({
  selector: 'app-math1',
  standalone: true,
  imports: [
    CommonModule,
    MatExpansionModule,
    MatListModule,
    MatIconModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatBadgeModule,
  ],
  templateUrl: './math1.component.html',
  styleUrls: ['./math1.component.css'],
})
export class Math1Component implements OnInit {
  topics: Topic[] = [];
  loading = true;
  error: string | null = null;

  // Track which sub-topic panels are open
  expandedSubTopics: Set<string> = new Set();

  constructor(private mathTopicsService: MathTopicsService) {}

  ngOnInit(): void {
    this.mathTopicsService.getTopics().subscribe({
      next: (data) => {
        this.topics = data;
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Failed to load math topics. Please try again.';
        this.loading = false;
        console.error('Error loading topics:', err);
      },
    });
  }

  trackByTopic(index: number, topic: Topic): string {
    return topic.topic;
  }

  trackBySubTopic(index: number, sub: SubTopic): string {
    return sub.sub_topic;
  }

  trackByExample(index: number, example: string): string {
    return example;
  }

  getExampleCount(sub: SubTopic): number {
    return sub.examples.length;
  }
}
