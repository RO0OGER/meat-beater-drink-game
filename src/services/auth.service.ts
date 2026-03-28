import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { User } from '@supabase/supabase-js';
import { SupabaseService } from './supabase';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  readonly currentUser$ = this.currentUserSubject.asObservable();

  constructor(private supabase: SupabaseService) {
    // Sync auth state on startup
    this.supabase.client.auth.getSession().then(({ data }) => {
      this.currentUserSubject.next(data.session?.user ?? null);
    });

    this.supabase.client.auth.onAuthStateChange((_event, session) => {
      this.currentUserSubject.next(session?.user ?? null);
    });
  }

  get currentUser(): User | null {
    return this.currentUserSubject.value;
  }

  async getCurrentUser(): Promise<User | null> {
    const { data } = await this.supabase.client.auth.getSession();
    const user = data.session?.user ?? null;
    this.currentUserSubject.next(user);
    return user;
  }

  async signUp(email: string, password: string, username: string): Promise<{ error: string | null }> {
    const { data, error } = await this.supabase.client.auth.signUp({ email, password });

    if (error) return { error: error.message };
    if (!data.user) return { error: 'Registrierung fehlgeschlagen.' };

    // Update username if different from email prefix (handle_new_user trigger sets default)
    const emailPrefix = email.split('@')[0];
    if (username !== emailPrefix) {
      await this.supabase.client
        .from('profiles')
        .update({ username })
        .eq('id', data.user.id);
    }

    return { error: null };
  }

  async signIn(email: string, password: string): Promise<{ error: string | null }> {
    const { error } = await this.supabase.client.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  }

  async signOut(): Promise<void> {
    await this.supabase.client.auth.signOut();
    this.currentUserSubject.next(null);
  }
}
