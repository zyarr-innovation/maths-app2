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

  jsonFiles: string[] = [];

  selectedFile = '';

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadJsonFileList();
  }

  loadJsonFileList() {
    this.http
    .get<string[]>('/assets/json/files.json')
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
  }

  getDisplayName(file: string): string {

    return file
      .replace('.json', '')
      .replace(/^\d+\./, '')
      .replace(/_/g, ' ');
  }
}