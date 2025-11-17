import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ApiService {
  constructor(private http: HttpClient) {}

  // Example: get all users
  getUsers(): Observable<any> {
    return this.http.get('/api/users');
  }

  // Example: get user by id
  getUserById(id: string): Observable<any> {
    return this.http.get(`/api/users/${id}`);
  }

  // Example: create user
  createUser(data: any): Observable<any> {
    return this.http.post('/api/users', data);
  }

  // Example: update user
  updateUser(id: string, data: any): Observable<any> {
    return this.http.put(`/api/users/${id}`, data);
  }

  // Example: delete user
  deleteUser(id: string): Observable<any> {
    return this.http.delete(`/api/users/${id}`);
  }
}
