// sample.component.ts

import {
  Component,
  Input,
  OnInit,
  OnChanges,
  SimpleChanges
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatCardModule } from '@angular/material/card';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';

interface Blank {
  id: number;
  correctValue: string;
  userValue: string;
  status: 'empty' | 'incorrect' | 'correct';
  hint: string;
}

interface LinePart {
  type: 'text' | 'input';
  value?: string;
  inputId?: number;
  charLen?: number;
}

@Component({
  selector: 'app-sample',
  standalone: true,
  imports: [
    CommonModule,
    HttpClientModule,
    FormsModule,
    MatInputModule,
    MatFormFieldModule,
    MatCardModule,
    MatExpansionModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule
  ],
  templateUrl: './sample.component.html',
  styleUrls: ['./sample.component.css']
})
export class SampleComponent implements OnInit, OnChanges {

  @Input() filePath: string = '';

  data: any;

  blanks: Blank[] = [];

  processedSections: any[] = [];

  constructor(private http: HttpClient) { }

  ngOnInit(): void {

    if (this.filePath) {
      this.loadFile();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {

    if (
      changes['filePath'] &&
      changes['filePath'].currentValue
    ) {

      this.loadFile();
    }
  }

  loadFile() {

    this.http.get<any>(this.filePath).subscribe({

      next: (res) => {

        this.data = res;

        this.processData();
      },

      error: (err) => {
        console.error(err);
      }

    });
  }

  processData() {

    this.blanks = [];

    let blankCounter = 0;

    this.processedSections = this.data.sub_topics.map((subTopic: any) => ({

      ...subTopic,

      processedExamples: subTopic.examples.map((example: any) => ({

        ...example,

        processedLines: example.steps.map((line: string) => {

          const parts: LinePart[] = [];

          const segments = line.split(/(__.*?__|____)/g);

          segments.forEach((segment: string) => {

            if (!segment) return;

            // Empty blank
            if (segment === '____') {

              const id = blankCounter++;

              this.blanks.push({
                id,
                correctValue: '',
                userValue: '',
                status: 'empty',
                hint: '?'
              });

              parts.push({
                type: 'input',
                inputId: id,
                charLen: 8
              });
            }

            // Expression / number / variable
            else if (
              segment.startsWith('__') &&
              segment.endsWith('__')
            ) {

              const inner = segment.slice(2, -2).trim();

              const id = blankCounter++;

              this.blanks.push({
                id,
                correctValue: inner,
                userValue: '',
                status: 'empty',
                hint: inner
              });

              parts.push({
                type: 'input',
                inputId: id,
                charLen: Math.max(inner.length + 4, 8)
              });
            }

            else {

              parts.push({
                type: 'text',
                value: segment
              });
            }

          });

          return parts;
        })

      }))

    }));
  }

  onKeyup(id: number) {
    const blank = this.blanks[id];
    if (!blank) return;

    const input = blank.userValue.trim();
    const target = blank.correctValue;
    if (target === '') {
      blank.status = input ? 'correct' : 'empty';
      return;
    }

    if (input === '') {
      blank.status = 'empty';
    }
    else if (input === target) {
      blank.status = 'correct';
    }
    else {

      blank.status = 'incorrect';
    }
  }
}