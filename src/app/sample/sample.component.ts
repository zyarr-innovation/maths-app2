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

  // VERIFICATION MODE (Can be easily commented out or deleted later)
  @Input() showVerificationAnswers = true;
  // END OF VERIFICATION MODE

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
      processedExamples: subTopic.examples.map((example: any) => {
        const exampleNumbers: number[] = [];
        const exampleBlanks: Blank[] = [];

        return {
          ...example,
          processedLines: example.steps.map((line: string) => {
            const parts: LinePart[] = [];
            const segments = line.split(/(__.*?__|____|______)/g);
            let blanksInLineCount = 0;

            segments.forEach((segment: string) => {
              if (!segment) return;

              // Empty blank (e.g., ____ or ______)
              if (segment === '____' || segment === '______') {
                const id = blankCounter++;
                const solvedValue = this.solveDynamicBlank(line, exampleNumbers, exampleBlanks, blanksInLineCount);
                blanksInLineCount++;

                const newBlank: Blank = {
                  id,
                  correctValue: solvedValue,
                  userValue: '',
                  status: 'empty',
                  hint: solvedValue ? solvedValue : '?'
                };

                this.blanks.push(newBlank);
                exampleBlanks.push(newBlank);

                parts.push({
                  type: 'input',
                  inputId: id,
                  charLen: Math.max(solvedValue.length + 4, 8)
                });
              }
              // Explicit blank with answer (e.g., __72__)
              else if (segment.startsWith('__') && segment.endsWith('__')) {
                const inner = segment.slice(2, -2).trim();
                const id = blankCounter++;

                // Track explicit numbers encountered to help solve future empty blanks
                const parsedVal = parseFloat(inner);
                if (!isNaN(parsedVal)) {
                  exampleNumbers.push(parsedVal);
                }

                const newBlank: Blank = {
                  id,
                  correctValue: inner,
                  userValue: '',
                  status: 'empty',
                  hint: inner
                };

                this.blanks.push(newBlank);
                exampleBlanks.push(newBlank);

                parts.push({
                  type: 'input',
                  inputId: id,
                  charLen: Math.max(inner.length + 4, 8)
                });
              } else {
                parts.push({
                  type: 'text',
                  value: segment
                });
              }
            });

            return parts;
          })
        };
      })
    }));
  }

  // Dynamic blank solver (Can be easily commented out or deleted later)
  private solveDynamicBlank(line: string, exampleNumbers: number[], prevBlanks: Blank[], blanksInLineCount: number): string {
    // 1. Fraction check: e.g. __8__ out of __15__ → ____/____
    if (line.includes('/') && line.includes('out of')) {
      const match = line.match(/__\s*(\d+)\s*__\s+out\s+of\s+__\s*(\d+)\s*__/);
      if (match) {
        if (blanksInLineCount === 0) return match[1];
        if (blanksInLineCount === 1) return match[2];
      }
    }

    // 2. Simple equation check containing "=" and a blank
    if (line.includes('=') && (line.includes('____') || line.includes('______') || line.includes('_____'))) {
      const parts = line.split('=');
      const leftStr = parts[0];
      const rightStr = parts[1];

      // Extract left and right numbers
      const leftNums = this.extractNumbers(leftStr);
      const rightNums = this.extractNumbers(rightStr);

      if (leftNums.length > 0 && rightNums.length > 0) {
        const B = leftNums[0];
        const C = rightNums[0];

        if (leftStr.includes('+')) {
          return (C - B).toString();
        } else if (leftStr.includes('-') || leftStr.includes('–')) {
          const blankIndex = leftStr.indexOf('___');
          const minusIndex = leftStr.search(/[-–—]/);
          if (blankIndex > minusIndex) {
            return (B - C).toString(); // B - x = C => x = B - C
          } else {
            return (C + B).toString(); // x - B = C => x = C + B
          }
        } else if (leftStr.includes('×') || leftStr.includes('*')) {
          return (C / B).toString();
        } else if (leftStr.includes('÷') || leftStr.includes('/')) {
          const blankIndex = leftStr.indexOf('___');
          const divideIndex = leftStr.search(/[÷\/]/);
          if (blankIndex > divideIndex) {
            return (B / C).toString(); // B / x = C => x = B / C
          } else {
            return (C * B).toString(); // x / B = C => x = C * B
          }
        }
      }

      // If blank is on the right side: e.g. __18__ + __12__ = ____
      if (rightStr.includes('___')) {
        const leftNums = this.extractNumbers(leftStr);
        if (leftNums.length >= 2) {
          const A = leftNums[0];
          const B = leftNums[1];
          // Use standard operations
          if (leftStr.includes('+')) return (A + B).toString();
          if (leftStr.includes('-') || leftStr.includes('–')) return (A - B).toString();
          if (leftStr.includes('×') || leftStr.includes('*')) return (A * B).toString();
          if (leftStr.includes('÷') || leftStr.includes('/')) return (A / B).toString();
        }
      }
    }

    // 3. Fallback based on step keywords & active numbers
    const lineLower = line.toLowerCase();
    if (exampleNumbers.length >= 2) {
      const A = exampleNumbers[exampleNumbers.length - 2];
      const B = exampleNumbers[exampleNumbers.length - 1];

      if (lineLower.includes('+') || lineLower.includes('add') || lineLower.includes('total') || lineLower.includes('sum') || lineLower.includes('combine') || lineLower.includes('together') || lineLower.includes('altogether')) {
        return (A + B).toString();
      }
      if (lineLower.includes('-') || lineLower.includes('–') || lineLower.includes('subtract') || lineLower.includes('remain') || lineLower.includes('left') || lineLower.includes('remove') || lineLower.includes('minus') || lineLower.includes('less')) {
        return (A - B).toString();
      }
      if (lineLower.includes('×') || lineLower.includes('*') || lineLower.includes('multiply') || lineLower.includes('times')) {
        return (A * B).toString();
      }
      if (lineLower.includes('÷') || lineLower.includes('/') || lineLower.includes('divide') || lineLower.includes('split') || lineLower.includes('share')) {
        return (A / B).toString();
      }
    }

    // 4. Ultimate fallback: carry over the last calculated answer in this example
    if (prevBlanks.length > 0) {
      for (let i = prevBlanks.length - 1; i >= 0; i--) {
        if (prevBlanks[i].correctValue) {
          return prevBlanks[i].correctValue;
        }
      }
    }

    return '';
  }

  private extractNumbers(str: string): number[] {
    const nums: number[] = [];
    const doubleUnderscoreMatches = str.match(/__\s*(\d+\.?\d*)\s*__/g);
    if (doubleUnderscoreMatches) {
      doubleUnderscoreMatches.forEach(m => {
        const val = parseFloat(m.replace(/__/g, '').trim());
        if (!isNaN(val)) nums.push(val);
      });
    } else {
      const rawMatches = str.match(/(\d+\.?\d*)/g);
      if (rawMatches) {
        rawMatches.forEach(m => {
          const val = parseFloat(m);
          if (!isNaN(val)) nums.push(val);
        });
      }
    }
    return nums;
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