// app.component.ts

import { Component } from '@angular/core';
import { Math1Component } from './math1/math1.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [Math1Component],
  template: `<app-math1></app-math1>`,
  styles: [
    `
      :host {
        display: block;
        min-height: 100vh;
        background: #f0f2ff;
      }
    `,
  ],
})
export class AppComponent {}
