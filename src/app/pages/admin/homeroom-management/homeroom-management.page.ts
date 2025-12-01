import { Component, OnInit } from '@angular/core';
import { UserManagementService } from '@core/services/user-management.service';
import { AlertController, LoadingController, ToastController } from '@ionic/angular';

@Component({
  selector: 'app-homeroom-management',
  templateUrl: './homeroom-management.page.html',
  styleUrls: ['./homeroom-management.page.scss'],
  standalone: false
})
export class HomeroomManagementPage implements OnInit {
  students: any[] = [];
  filteredStudents: any[] = [];
  users: any[] = [];
  searchQuery = '';

  constructor(
    private userManagement: UserManagementService,
    private alertCtrl: AlertController,
    private loadingCtrl: LoadingController,
    private toastCtrl: ToastController
  ) { }

  ngOnInit() {
    this.loadData();
  }

  async loadData() {
    const loader = await this.loadingCtrl.create({ message: 'Loading...' });
    await loader.present();
    try {
      const [studentsData, usersData] = await Promise.all([
        this.userManagement.getAllStudentsFromCollection(),
        this.userManagement.getAllUsersInSociety()
      ]);

      this.users = usersData;
      this.students = studentsData.map(s => {
        const user = this.users.find(u => u.studentId === s.studentId);
        return {
          ...s,
          accountRole: user ? user.role : 'none',
          userUid: user ? user.uid : null,
          userEmail: user ? user.email : null
        };
      });
      this.filteredStudents = [...this.students];
    } catch (error: any) {
      this.showToast('Error loading data: ' + error.message, 'danger');
    } finally {
      loader.dismiss();
    }
  }

  onSearch(event: any) {
    const q = (this.searchQuery || '').toLowerCase();
    if (!q) {
      this.filteredStudents = [...this.students];
      return;
    }
    this.filteredStudents = this.students.filter(s => 
      s.fullName.toLowerCase().includes(q) || 
      s.studentId.toLowerCase().includes(q)
    );
  }

  getRoleColor(role: string) {
    switch(role) {
      case 'homeroom': return 'primary';
      case 'student': return 'medium';
      default: return 'light';
    }
  }

  getRoleLabel(role: string) {
    switch(role) {
      case 'homeroom': return 'Homeroom';
      case 'student': return 'Student Account';
      default: return 'No Account';
    }
  }

  async createAccount(student: any) {
    const alert = await this.alertCtrl.create({
      header: 'Create Homeroom Account',
      inputs: [
        { name: 'email', type: 'email', placeholder: 'Email' },
        { name: 'password', type: 'password', placeholder: 'Password' }
      ],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Create',
          handler: (data) => {
            if (!data.email || !data.password) {
              this.showToast('Email and password required', 'warning');
              return false;
            }
            this.doCreateAccount(student, data.email, data.password);
            return true;
          }
        }
      ]
    });
    await alert.present();
  }

  async doCreateAccount(student: any, email: string, pass: string) {
    const loader = await this.loadingCtrl.create({ message: 'Creating account...' });
    await loader.present();
    try {
      // Pass extra fields (Year/Section) so the Homeroom Dashboard works
      const extraData = {
        society: student.society,
        yearLevelId: student.yearLevelId,
        sectionId: student.sectionId,
        firstName: student.firstName,
        lastName: student.lastName
      };
      
      await this.userManagement.createHomeroomUser(email, pass, student.studentId, extraData);
      this.showToast('Homeroom account created');
      this.loadData();
    } catch (error: any) {
      this.showToast('Error: ' + error.message, 'danger');
    } finally {
      loader.dismiss();
    }
  }

  async promoteToHomeroom(student: any) {
    if (!student.userUid) return;
    const loader = await this.loadingCtrl.create({ message: 'Promoting...' });
    await loader.present();
    try {
      await this.userManagement.updateUserRole(student.userUid, 'homeroom');
      this.showToast('Promoted to Homeroom');
      this.loadData();
    } catch (error: any) {
      this.showToast('Error: ' + error.message, 'danger');
    } finally {
      loader.dismiss();
    }
  }

  async demoteToStudent(student: any) {
    if (!student.userUid) return;
    const loader = await this.loadingCtrl.create({ message: 'Demoting...' });
    await loader.present();
    try {
      await this.userManagement.updateUserRole(student.userUid, 'student');
      this.showToast('Demoted to Student');
      this.loadData();
    } catch (error: any) {
      this.showToast('Error: ' + error.message, 'danger');
    } finally {
      loader.dismiss();
    }
  }

  async removeAccount(student: any) {
    if (!student.userUid) return;
    const alert = await this.alertCtrl.create({
      header: 'Confirm Delete',
      message: `Remove account for ${student.fullName}? This will delete the login access but keep the student record.`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Delete',
          role: 'destructive',
          handler: async () => {
            const loader = await this.loadingCtrl.create({ message: 'Deleting...' });
            await loader.present();
            try {
              await this.userManagement.deleteStudentUser(student.userUid);
              this.showToast('Account removed');
              this.loadData();
            } catch (error: any) {
              this.showToast('Error: ' + error.message, 'danger');
            } finally {
              loader.dismiss();
            }
          }
        }
      ]
    });
    await alert.present();
  }

  async showToast(msg: string, color = 'success') {
    const t = await this.toastCtrl.create({ message: msg, duration: 3000, color });
    t.present();
  }
}
