import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HomeroomManagementPage } from './homeroom-management.page';

describe('HomeroomManagementPage', () => {
  let component: HomeroomManagementPage;
  let fixture: ComponentFixture<HomeroomManagementPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(HomeroomManagementPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
