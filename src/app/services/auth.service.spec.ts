import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';
import { StorageService } from './storage.service';
import { Router } from '@angular/router';

describe('AuthService', () => {
  let service: AuthService;
  let storageSpy: jasmine.SpyObj<StorageService>;
  const fakeRouter = { navigate: jasmine.createSpy('navigate') } as any;

  beforeEach(() => {
    storageSpy = jasmine.createSpyObj('StorageService', ['set', 'get', 'remove']);

    TestBed.configureTestingModule({
      providers: [
        { provide: StorageService, useValue: storageSpy },
        { provide: Router, useValue: fakeRouter }
      ]
    });
  });

  it('register should create a user and store token on success', async () => {
    // Mock auth instance with createUserWithEmailAndPassword
    const mockUser = { getIdToken: () => Promise.resolve('FAKE_TOKEN') };
    const mockCred = { user: mockUser };
    const mockAuth = {
      createUserWithEmailAndPassword: jasmine.createSpy('createUserWithEmailAndPassword').and.returnValue(Promise.resolve(mockCred))
    } as any;

    service = new AuthService(storageSpy, fakeRouter, mockAuth);

    await service.register('a@b.com', 'password');

    expect(mockAuth.createUserWithEmailAndPassword).toHaveBeenCalledWith(service['auth'], 'a@b.com', 'password');
    expect(storageSpy.set).toHaveBeenCalledWith('access_token', 'FAKE_TOKEN');
  });

  it('register should propagate errors and not store token when creation fails', async () => {
    const mockAuth = {
      createUserWithEmailAndPassword: jasmine.createSpy('createUserWithEmailAndPassword').and.returnValue(Promise.reject(new Error('fail')))
    } as any;

    service = new AuthService(storageSpy, fakeRouter, mockAuth);

    let thrown = false;
    try {
      await service.register('a@b.com', 'password');
    } catch (e) {
      thrown = true;
    }
    expect(thrown).toBeTrue();
    expect(storageSpy.set).not.toHaveBeenCalled();
  });
});
