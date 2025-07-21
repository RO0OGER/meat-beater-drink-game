import { Injectable } from '@angular/core';
import { Task } from '../model/Task';
import {SupabaseService} from './supabase';

@Injectable({ providedIn: 'root' })
export class TaskService {
  constructor(private supabaseService: SupabaseService) {}

  async getAllTasks(): Promise<Task[]> {
    const { data, error } = await this.supabaseService.client
      .from('tasks')
      .select('*');

    if (error) {
      console.error('Fehler beim Abrufen der Aufgaben:', error.message);
      return [];
    }

    return data as Task[];
  }

  async getRandomTask(): Promise<Task | null> {
    const { data, error } = await this.supabaseService.client
      .from('tasks')
      .select('*');

    if (error) {
      console.error('Fehler beim Abrufen der Aufgaben:', error.message);
      return null;
    }

    if (!data || data.length === 0) {
      console.warn('Keine Aufgaben gefunden.');
      return null;
    }

    const randomIndex = Math.floor(Math.random() * data.length);
    return data[randomIndex] as Task;
  }
}
