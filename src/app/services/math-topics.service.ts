// services/math-topics.service.ts

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Topic } from '../models/math-topic.model';

@Injectable({
  providedIn: 'root',
})
export class MathTopicsService {
  private readonly dataUrl = 'assets/math-topics.json';

  constructor(private http: HttpClient) {}

  getTopics(): Observable<Topic[]> {
    return this.http.get<Topic[]>(this.dataUrl);
  }
}
