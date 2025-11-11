import { Injectable } from '@angular/core';
import { Preferences } from '@capacitor/preferences';

// This service prefers a native/secure storage Capacitor plugin when available
// (for example: @capacitor-community/secure-storage). If the plugin is not
// available at runtime (e.g. running in the browser or before the plugin is
// installed), it falls back to Capacitor Preferences so behavior remains
// consistent for web and dev.

/*
  Setup notes (run in your project root):
  1) Install a secure storage plugin, for example the community plugin:
     npm install @capacitor-community/secure-storage
  2) Sync Capacitor plugins to native projects:
     npx cap sync
  3) On native platforms the secure storage plugin will be used automatically.

  If you want me to add the dependency to package.json here, tell me and I
  will update package.json as well.
*/

declare const window: any;

@Injectable({ providedIn: 'root' })
export class StorageService {
  private securePlugin: any | null = null;

  constructor() {
    // Try to detect common plugin locations at runtime. Different secure
    // storage plugins expose their plugin object under different names, so
    // check the typical places. We keep this detection lightweight and
    // non-fatal: if nothing is found, we use Preferences as a fallback.
    try {
      if (typeof window !== 'undefined') {
        const cap = window.Capacitor ?? null;
        this.securePlugin = cap?.Plugins?.SecureStorage || cap?.Plugins?.SecureStoragePlugin ||
          window.SecureStorage || window.SecureStoragePlugin || null;
        // Detect Cordova plugin namespace (cordova-plugin-secure-storage-echo)
        if (!this.securePlugin && window.cordova && window.cordova.plugins && window.cordova.plugins.SecureStorage) {
          this.securePlugin = 'cordova-secure-storage';
        }
      }
    } catch (e) {
      this.securePlugin = null;
    }
  }

  /**
   * Returns a short string describing which backend will be used at runtime.
   * Possible values: 'cordova-secure-storage', 'capacitor-plugin', 'preferences'
   */
  public whichBackend(): 'cordova-secure-storage' | 'capacitor-plugin' | 'preferences' {
    if (this.securePlugin === 'cordova-secure-storage') return 'cordova-secure-storage';
    if (this.securePlugin && typeof this.securePlugin.set === 'function') return 'capacitor-plugin';
    return 'preferences';
  }

  /**
   * Returns true when a native secure backend is available (Cordova or Capacitor plugin)
   */
  public isNativeSecureAvailable(): boolean {
    return this.whichBackend() === 'cordova-secure-storage' || this.whichBackend() === 'capacitor-plugin';
  }

  private async trySecureSet(key: string, value: string): Promise<boolean> {
    if (!this.securePlugin) return false;
    try {
      // Case A: Capacitor-style plugin object with promise API
      if (typeof this.securePlugin.set === 'function') {
        await this.securePlugin.set({ key, value });
        return true;
      }
      // Case B: Cordova secure storage plugin (cordova-plugin-secure-storage-echo)
      if (this.securePlugin === 'cordova-secure-storage' && window.cordova && window.cordova.plugins && window.cordova.plugins.SecureStorage) {
        const ctor = window.cordova.plugins.SecureStorage;
        const storage = new ctor(() => {}, (_err: any) => {}, 'ok-fines');
        await new Promise<void>((resolve, reject) => {
          try {
            storage.set(
              () => resolve(),
              (err: any) => reject(err),
              key,
              value
            );
          } catch (e) {
            reject(e);
          }
        });
        return true;
      }
    } catch (e) {
      // ignore and fall back
    }
    return false;
  }

  private async trySecureGet(key: string): Promise<string | null> {
    if (!this.securePlugin) return null;
    try {
      if (typeof this.securePlugin.get === 'function') {
        const res = await this.securePlugin.get({ key });
        return res?.value ?? res?.result ?? null;
      }
      if (this.securePlugin === 'cordova-secure-storage' && window.cordova && window.cordova.plugins && window.cordova.plugins.SecureStorage) {
        const ctor = window.cordova.plugins.SecureStorage;
        const storage = new ctor(() => {}, (_err: any) => {}, 'ok-fines');
        const value = await new Promise<string>((resolve, reject) => {
          try {
            storage.get(
              (v: any) => resolve(v),
              (err: any) => reject(err),
              key
            );
          } catch (e) {
            reject(e);
          }
        });
        return value ?? null;
      }
    } catch (e) {
      // ignore and fall back
    }
    return null;
  }

  private async trySecureRemove(key: string): Promise<boolean> {
    if (!this.securePlugin) return false;
    try {
      if (typeof this.securePlugin.remove === 'function') {
        await this.securePlugin.remove({ key });
        return true;
      }
      if (this.securePlugin === 'cordova-secure-storage' && window.cordova && window.cordova.plugins && window.cordova.plugins.SecureStorage) {
        const ctor = window.cordova.plugins.SecureStorage;
        const storage = new ctor(() => {}, (_err: any) => {}, 'ok-fines');
        await new Promise<void>((resolve, reject) => {
          try {
            storage.remove(
              () => resolve(),
              (err: any) => reject(err),
              key
            );
          } catch (e) {
            reject(e);
          }
        });
        return true;
      }
    } catch (e) {
      // ignore and fall back
    }
    return false;
  }

  async set(key: string, value: string): Promise<void> {
    const ok = await this.trySecureSet(key, value);
    if (ok) return;
    await Preferences.set({ key, value });
  }

  async get(key: string): Promise<string | null> {
    const secureVal = await this.trySecureGet(key);
    if (secureVal !== null) return secureVal;
    const res = await Preferences.get({ key });
    return res.value ?? null;
  }

  async remove(key: string): Promise<void> {
    const ok = await this.trySecureRemove(key);
    if (ok) return;
    await Preferences.remove({ key });
  }
}
