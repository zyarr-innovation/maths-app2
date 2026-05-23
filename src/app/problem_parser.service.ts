import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

export interface Example {
  id: string;
  description: string;
  lines: string[];
}

export interface Section {
  title: string;
  level: number;
  examples: Example[];
}

@Injectable({
  providedIn: 'root'
})
export class ProblemParserService {
  constructor(private http: HttpClient) { }
  // This function reads the file and pipes it through the parser
  getWorkbookData(filePath: string): Observable<Section[]> {
    return this.http.get(filePath, { responseType: 'text' }).pipe(
      map(rawText => this.parseText(rawText))
    );
  }

  parseText(rawText: string): Section[] {
    const sections: Section[] = [];
    const lines = rawText.split('\n');

    let currentSection: Section | null = null;
    let currentExample: Example | null = null;

    for (let line of lines) {
      // 1. Create a trimmed version for identification logic ONLY
      // We use trimEnd() for the actual storage to preserve leading tabs/spaces
      const trimmedLine = line.trim();

      // Skip horizontal separators or completely empty lines
      if (trimmedLine.startsWith('____')) continue;

      // 2. Identify Headings (e.g., # Header)
      if (trimmedLine.startsWith('#')) {
        const match = trimmedLine.match(/^(#+)\s*(.*)/);
        if (match) {
          currentSection = {
            title: match[2],
            level: match[1].length,
            examples: []
          };
          sections.push(currentSection);

          // Start an 'Intro' block to catch text appearing before the first 'Step'
          currentExample = {
            id: 'Intro',
            description: 'Problem Description',
            lines: []
          };
          currentSection.examples.push(currentExample);
        }
      }

      // 3. Identify Example or Step start (e.g., "Step 1: ...")
      // We use the trimmed version to check the prefix
      else if (/^(ex|step)/i.test(trimmedLine)) {
        const separatorIndex = line.indexOf(':');

        if (separatorIndex !== -1) {
          currentExample = {
            id: line.substring(0, separatorIndex).trim(),
            description: line.substring(separatorIndex + 1).trim(),
            lines: []
          };
        } else {
          // Fallback if there is no colon
          currentExample = {
            id: trimmedLine,
            description: '',
            lines: []
          };
        }

        if (currentSection) {
          currentSection.examples.push(currentExample);
        }
      }

      // 4. Content Lines
      else if (currentExample) {
        /* CRITICAL CHANGE: 
           We push the original 'line' (not trimmedLine) to preserve 
           the tab characters (\t) and leading spaces for alignment.
           We use trimEnd() just to clean up the trailing newline artifacts.
        */
        currentExample.lines.push(line.trimEnd());
      }
    }

    // Final Clean up: Remove 'Intro' blocks if they remained empty
    sections.forEach(s => {
      s.examples = s.examples.filter(e => e.id !== 'Intro' || e.lines.length > 0);
    });

    return sections;
  }
}