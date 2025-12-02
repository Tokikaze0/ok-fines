import { Injectable } from '@angular/core';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { environment } from 'src/environments/environment';

@Injectable({
    providedIn: 'root'
})
export class GeminiService {
    private genAI: GoogleGenerativeAI;
    private model: any;

    constructor() {
        this.genAI = new GoogleGenerativeAI(environment.geminiApiKey);
        this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    }

    private getSystemPrompt(role: string = 'user'): string {
        return `
      You are the intelligent navigation guide for "OK-Fines", a Project Contribution Tracking System.
      Your goal is to help the current user (Role: ${role}) navigate the system and understand its features.

      **System Knowledge Base:**

      **1. Admin Features (Only for Admins):**
      - **Dashboard**: General overview of collections and stats.
      - **Manage Fees**: Create, edit, or delete contribution fees. You can set target Year Levels and Sections.
      - **Track Payments**: The central hub for monitoring payments. 
          - *New Feature*: You can filter students by "Paid", "Unpaid", or "All".
          - *New Feature*: You can filter by specific "Year & Section".
          - *New Feature*: The list is grouped by Year and Section for better readability.
      - **Homeroom Management**: Manage homeroom sections and assign officers.
      - **Student User Management**: Create and manage student accounts.
      - **Outstanding Report**: Generate reports on who hasn't paid yet.
      - **My Profile**: View your account details and reset your password.

      **2. Homeroom Officer Features (Only for Homeroom Officers):**
      - **Homeroom Dashboard**: View the contribution status specifically for your assigned section.
      - **Track Payments**: View payment status for your students.
      - **My Profile**: View your account details and reset your password.

      **3. Student Features (Only for Students):**
      - **Student Fees**: View your own assigned fees and check if you have paid them.
      - **My Profile**: View your account details and reset your password.

      **Instructions:**
      - Always tailor your answer to the user's role (${role}).
      - If a user asks "What can I do?", list the features available to their role.
      - Provide step-by-step navigation instructions (e.g., "Go to the Sidebar > Manage Fees").
      - Keep responses friendly, concise, and formatted (use bolding and lists).
    `;
    }

    async generateWelcomeMessage(role: string, name: string): Promise<string> {
        try {
            const prompt = `
        ${this.getSystemPrompt(role)}

        Task: Generate a warm, short welcome message for a new user named "${name}" who has the role of "${role}".
        1. Welcome them to OK-Fines.
        2. Briefly explain what they can do in the system based on their role.
        3. Offer to help them navigate.
      `;

            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            return response.text();
        } catch (error) {
            console.error('Error generating welcome:', error);
            return `Welcome ${name}! I am here to help you navigate OK-Fines.`;
        }
    }

    async generateResponse(userPrompt: string, role: string = 'user'): Promise<string> {
        try {
            const fullPrompt = `${this.getSystemPrompt(role)}\n\nUser: ${userPrompt}\nGuide:`;

            const result = await this.model.generateContent(fullPrompt);
            const response = await result.response;
            return response.text();
        } catch (error) {
            console.error('Error generating content:', error);
            return 'Sorry, I am having trouble connecting to the guide service right now. Please check your API key or try again later.';
        }
    }
}