import { Component, OnInit } from '@angular/core';
import { GeminiService } from '@core/services/gemini.service';
import { AuthService } from '@core/services/auth.service';
import { marked } from 'marked';

@Component({
  selector: 'app-gemini-guide',
  templateUrl: './gemini-guide.component.html',
  styleUrls: ['./gemini-guide.component.scss'],
  standalone: false
})
export class GeminiGuideComponent implements OnInit {
  isOpen = false;
  userMessage = '';
  messages: { sender: 'user' | 'bot', text: string }[] = [];
  isLoading = false;
  currentUserRole: string = 'user';
  currentUserName: string = 'User';

  constructor(
    private geminiService: GeminiService,
    private authService: AuthService
  ) { }

  async ngOnInit() {
    // Get user details
    const user = this.authService.auth.currentUser;
    if (user) {
        const profile = await this.authService.getUserProfile(user.uid);
        this.currentUserRole = profile?.role || 'user';
        this.currentUserName = profile?.fullName || profile?.firstName || 'User';
    }

    // Generate Welcome Message
    this.isLoading = true;
    try {
        const welcomeMsg = await this.geminiService.generateWelcomeMessage(this.currentUserRole, this.currentUserName);
        const parsedMsg = await marked.parse(welcomeMsg);
        this.messages.push({ sender: 'bot', text: parsedMsg });
    } catch (e) {
        this.messages.push({ sender: 'bot', text: 'Hello! I am your OK-Fines guide.' });
    } finally {
        this.isLoading = false;
    }
  }

  toggleChat() {
    this.isOpen = !this.isOpen;
  }

  async sendMessage() {
    if (!this.userMessage.trim()) return;

    const msg = this.userMessage;
    this.messages.push({ sender: 'user', text: msg });
    this.userMessage = '';
    this.isLoading = true;

    try {
      const response = await this.geminiService.generateResponse(msg, this.currentUserRole);
      const parsedResponse = await marked.parse(response);
      this.messages.push({ sender: 'bot', text: parsedResponse });
    } catch (e) {
      this.messages.push({ sender: 'bot', text: 'Sorry, something went wrong.' });
    } finally {
      this.isLoading = false;
    }
  }
}
