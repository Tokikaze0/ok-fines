import { Injectable } from '@angular/core';
import { Preferences } from '@capacitor/preferences';

/**
 * Storage Service
 * Provides a unified interface for local storage with fallback support
 * Prefers secure storage when available (Capacitor plugin or Cordova)
 */

declare const window: any;

@Injectable({ providedIn: 'root' })
export class StorageService {
  private securePlugin: any | null = null;

  constructor() {
    this.detectSecurePlugin();
  }

  /**
   * Detect available secure storage plugins at runtime
   */
  private detectSecurePlugin(): void {
    try {
      if (typeof window !== 'undefined') {
        const cap = window.Capacitor ?? null;
        this.securePlugin = cap?.Plugins?.SecureStorage || cap?.Plugins?.SecureStoragePlugin ||
          window.SecureStorage || window.SecureStoragePlugin || null;

        if (!this.securePlugin && window.cordova && window.cordova.plugins && window.cordova.plugins.SecureStorage) {
          this.securePlugin = 'cordova-secure-storage';
        }
      }
    } catch (e) {
      this.securePlugin = null;
    }
  }

  /**
   * Returns which storage backend is being used
   */
  public whichBackend(): 'cordova-secure-storage' | 'capacitor-plugin' | 'preferences' {
    if (this.securePlugin === 'cordova-secure-storage') return 'cordova-secure-storage';
    if (this.securePlugin && typeof this.securePlugin.set === 'function') return 'capacitor-plugin';
    return 'preferences';
  }

  /**
   * Returns true if native secure storage is available
   */
  public isNativeSecureAvailable(): boolean {
    return this.whichBackend() !== 'preferences';
  }

  /**
   * Set a value in storage
   */
  async set(key: string, value: string): Promise<void> {
    const ok = await this.trySecureSet(key, value);
    if (ok) return;
    await Preferences.set({ key, value });
  }

  /**
   * Get a value from storage
   */
  async get(key: string): Promise<string | null> {
    const secureVal = await this.trySecureGet(key);
    if (secureVal !== null) return secureVal;
    const res = await Preferences.get({ key });
    return res.value ?? null;
  }

  /**
   * Remove a value from storage
   */
  async remove(key: string): Promise<void> {
    const ok = await this.trySecureRemove(key);
    if (ok) return;
    await Preferences.remove({ key });
  }

  /**
   * Try to set value in secure storage
   */
  private async trySecureSet(key: string, value: string): Promise<boolean> {
    if (!this.securePlugin) return false;
    try {
      if (typeof this.securePlugin.set === 'function') {
        await this.securePlugin.set({ key, value });
        return true;
      }

      if (this.securePlugin === 'cordova-secure-storage' && window.cordova?.plugins?.SecureStorage) {
        const ctor = window.cordova.plugins.SecureStorage;
        const storage = new ctor(() => {}, (_err: any) => {}, 'ok-fines');
        await new Promise<void>((resolve, reject) => {
          try {
            storage.set(() => resolve(), (err: any) => reject(err), key, value);
          } catch (e) {
            reject(e);
          }
        });
        return true;
      }
    } catch (e) {
      // Fall back to regular storage
    }
    return false;
  }

  /**
   * Try to get value from secure storage
   */
  private async trySecureGet(key: string): Promise<string | null> {
    if (!this.securePlugin) return null;
    try {
      if (typeof this.securePlugin.get === 'function') {
        const res = await this.securePlugin.get({ key });
        return res?.value ?? res?.result ?? null;
      }

      if (this.securePlugin === 'cordova-secure-storage' && window.cordova?.plugins?.SecureStorage) {
        const ctor = window.cordova.plugins.SecureStorage;
        const storage = new ctor(() => {}, (_err: any) => {}, 'ok-fines');
        const value = await new Promise<string>((resolve, reject) => {
          try {
            storage.get((v: any) => resolve(v), (err: any) => reject(err), key);
          } catch (e) {
            reject(e);
          }
        });
        return value ?? null;
      }
    } catch (e) {
      // Fall back to regular storage
    }
    return null;
  }

  /**
   * Try to remove value from secure storage
   */
  private async trySecureRemove(key: string): Promise<boolean> {
    if (!this.securePlugin) return false;
    try {
      if (typeof this.securePlugin.remove === 'function') {
        await this.securePlugin.remove({ key });
        return true;
      }

      if (this.securePlugin === 'cordova-secure-storage' && window.cordova?.plugins?.SecureStorage) {
        const ctor = window.cordova.plugins.SecureStorage;
        const storage = new ctor(() => {}, (_err: any) => {}, 'ok-fines');
        await new Promise<void>((resolve, reject) => {
          try {
            storage.remove(() => resolve(), (err: any) => reject(err), key);
          } catch (e) {
            reject(e);
          }
        });
        return true;
      }
    } catch (e) {
      // Fall back to regular storage
    }
    return false;
  }
}
