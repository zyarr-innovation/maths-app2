// app.component.ts

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { RouterOutlet } from '@angular/router';

import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { BreakpointObserver } from '@angular/cdk/layout';

import { SampleComponent } from './sample/sample.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    HttpClientModule,
    RouterOutlet,
    SampleComponent,
    MatSidenavModule,
    MatListModule,
    MatIconModule,
    MatToolbarModule,
    MatButtonModule
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {

  menuOpened = true;
  sidenavMode: 'side' | 'over' = 'side';

  // VERIFICATION MODE (Can be easily commented out or deleted later)
  showVerifyButton = true; // Set to false to completely hide the "Verify" button from the toolbar
  showVerificationAnswers = false; // Starts as false (inactive) by default
  toggleVerification() {
    this.showVerificationAnswers = !this.showVerificationAnswers;
  }
  // END OF VERIFICATION MODE

  jsonFiles: string[] = [];

  selectedFile = '';

  constructor(
    private http: HttpClient,
    private breakpointObserver: BreakpointObserver
  ) { }

  ngOnInit(): void {
    this.loadJsonFileList();
    this.observeBreakpoints();
  }

  observeBreakpoints() {
    this.breakpointObserver
      .observe(['(max-width: 900px)'])
      .subscribe((result) => {
        if (result.matches) {
          this.menuOpened = false;
          this.sidenavMode = 'over';
        } else {
          this.menuOpened = true;
          this.sidenavMode = 'side';
        }
      });
  }

  loadJsonFileList() {
    this.http
      .get<string[]>('assets/json/files.json')
      .subscribe({
        next: (files) => {
          this.jsonFiles = files.sort((a, b) => {
            const numA = parseInt(a.split('.')[0], 10);
            const numB = parseInt(b.split('.')[0], 10);
            return numA - numB;
          });

          if (this.jsonFiles.length > 0) {
            this.selectedFile = this.jsonFiles[0];
          }
        },
        error: (err) => {
          console.error(err);
        }
      });
  }

  selectFile(file: string) {
    this.selectedFile = file;
    if (this.sidenavMode === 'over') {
      this.menuOpened = false;
    }
  }

  getDisplayName(file: string): string {

    return file
      .replace('.json', '')
      .replace(/^\d+\./, '')
      .replace(/_/g, ' ');
  }
}