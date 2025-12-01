OK FINES: THE ONLINE KONTRIBUSYON MANAGEMENT APP FOR COLLEGE ORGANIZATIONS

A Final Project
Presented to the Faculty of the College of Computer Studies
MINDORO STATE UNIVERSITY – MAIN CAMPUS
Alcate, Victoria, Oriental Mindoro


In Partial Fulfillment
Of the Requirements for the Course
OBJECT ORIENTED PROGRAMMING (ITE 212)



Submitted by:
Echanova, Neil Franklin S.
Madeja, Arwin R.
Omolida, Rafaelo Kotaro Z.
Paynandos, Jun Rey 


December __, 2024 
CHAPTER 1
INTRODUCTION

A.	BACKGROUND OF THE STUDY
In college organizations and departments, the collection and management of student contributions is a constant and essential administrative task. However, the prevailing methods for handling these finances are often manual and outdated, creating significant inefficiencies for both the treasurers and the students.
The most common method relies on a designated treasurer manually tracking payments using spreadsheets, such as Microsoft Excel. This process is exhausting and highly time-consuming due to the large number of students in a department. The treasurer must manually input every single transaction, cross-reference names with student lists, and manually update payment statuses. This reliance on manual data entry is not only tedious but also highly susceptible to human error, leading to inaccurate financial records.
This inefficiency creates two major problems. First, for society treasurer and classroom treasurers, there is no simple or fast way to get a clear financial overview. When a new event or fee is created, the entire manual tracking process begins again. Consequently, tracking students who have not paid for a specific fee becomes a difficult task of manually scanning and tallying lists. Easily finding out which students are not fully paid across all contributions is even more complex, requiring a slow reconciliation of multiple lists or spreadsheet tabs.
Second, from the student's perspective, the system lacks transparency. Students have no direct or immediate way to track their own payments or view a consolidated list of their paid and unpaid dues. To confirm their status, they must personally contact the treasurer, who then must perform the same time-consuming manual lookup.
The "OK FINES" system is proposed to directly solve these specific operational bottlenecks. It aims to replace this exhaustive manual process by providing a centralized platform where department and classroom treasurers can simply add an event or fee and have the system automate the tracking. This will provide society treasurer with an instant and accurate report of all outstanding payments. Simultaneously, it will provide students with a dedicated module where they can input their student ID to immediately retrieve a comprehensive record of their payment history and view any outstanding balances.
 
B.	OBJECTIVES OF THE STUDY
Generally, the aim of the study is to develop an online fine and contribution management system, "OK FINES," to automate and modernize the tracking of student payments for college departments and organizations.
Specifically, it aims to;
1.	Design and implement a secure administrator module where authorized department or classroom treasurers can easily create, post, and manage new fees or contributions for students.

2.	Develop a student-facing portal where a student can input their unique Student ID to immediately retrieve and review a comprehensive record of their payment history and current outstanding balances.

3.	Provide administrators with an automated tracking dashboard that can instantly generate consolidated reports of all students with outstanding dues, replacing the need for manual spreadsheet reconciliation.

4.	Replace the traditional, time-consuming, and error-prone manual method of financial tracking with a centralized, efficient, and transparent database system to ensure data accuracy and accountability. 


C.	SCOPE AND LIMITATIONS
To discuss the scope of the whole system, the following are the system’s features:
o	Treasurer Management: The system will provide a secure login module for authorized treasurer, such as department and classroom treasurers.

o	Fee and Contribution Management: Administrators will have the functionality to create, post, name, and set the amount for new events, fees, fines, or other contributions.

o	Payment Status Tracking: Administrators will be able to access the student database to update the payment status (e.g., "Paid" or "Unpaid") for each student corresponding to a specific fee.

o	Automated Reporting: The system will feature a dashboard for administrators to automatically generate and view consolidated reports, specifically for identifying all students with outstanding balances.

o	Student Payment Viewing: The system will offer a public-facing portal for students to check their financial status.

o	Student ID Lookup: Students can access their records by inputting their unique Student ID. This module will display a comprehensive list of all their contributions, clearly distinguishing between "Paid" and "Unpaid" items.


   On the other hand, (1) this OK FINES system is limited for:
o	The system will not process any actual online financial transactions. It is a recording and monitoring tool, not a payment gateway (e.g., it will not integrate with GCash, Maya, or bank transfers).

o	Students do not have individual accounts to log into. Their access is limited to a read-only view of their own payment history, which is retrieved using their Student ID.

o	Students cannot edit, update, or modify their own payment records. All data entry and updates are restricted to the authorized administrators to maintain data integrity.

o	The system is developed for use within the college departments and organizations of Mindoro State University – Main Campus and is not intended to replace or integrate with the university's official (registrar or cashier) financial and enrollment system.

o	The system is an online application and will require a stable internet connection for both administrators and students to access its features. It will not have an offline mode.

D.	DEFINITION OF TERMS
The researchers were able to gather terms and they are as follows:
Society Treasurer – Refers to the authorized user, such as a department or classroom treasurer, who has privileged access to the system. This user can log in to manage, create, and update student fees, and track payment statuses.

Contribution – An umbrella term used in the system to describe any financial obligation assigned to a student, which may include project fees, event payments, organizational dues, or fines.

OK FINES – The official name of the "Online Kontribusyon Management App" being developed in this study. It serves as the primary tool for tracking student contributions.

Treasurer Module – The secure, backend section of the "OK FINES" system accessible only to administrators. This is where the creation of fees and the updating of payment records occur.

Student Portal – The public-facing component of the system where students can input their Student ID to view their financial records.

Outstanding Balance – Refers to the total amount of unpaid contributions or fees that a student currently owes, as displayed by the system.

Payment History – A comprehensive, read-only record displayed to a student, which lists all their assigned contributions and marks them as either "Paid" or "Unpaid." 
CHAPTER 2
SYSTEM DESIGN AND DESCRIPTION
A.	SITEMAP
B.	WIREFRAME
 

Figure 1: Student Portal Wireframe 
		Figure 1 illustrates the wireframe for the Student Portal, which serves as the primary access point for students. The design is intentionally minimalist to ensure ease of use. It features a single input field prompting the user to "Enter your student ID" and a "Search" button to initiate the query. This interface provides a read-only view of a student's financial status. A hyperlink labeled "Admin Login" is discreetly placed at the bottom, providing a separate entry point for authorized treasurers. 
 
Figure 2: Treasurer Dashboard Wireframe
		Figure 2 represents the wireframe for the "OK FINES - Treasurer Dashboard," the main control panel for administrators. The design is task-oriented, utilizing a tabbed navigation system to separate the primary functions: "Manage Fees," "Track Payments," and "Reports." 
The "Manage Fees" section provides an interface for administrators to add new contributions, including a "Description" and "Amount," with "Edit" and "Delete" actions available for existing fees. Below this, the "Track Payments" section features a comprehensive table displaying "Student ID," "Name," and "Status" (e.g., Paid/Unpaid), along with an "Action" column for updating a student's record. Finally, a prominent "Generate Outstanding Balance Report" button is located at the bottom, allowing the administrator to instantly compile a consolidated list of all unpaid dues.

VISUAL DESIGN ELEMENTS: Color Scheme
(Include the actual color palette you used. Provide Explanation/ description)
(Example only)

 



 
CHAPTER 3
SYSTEM ARCHITECTURE AND STRUCTURE
A.	CONCEPTUAL FRAMEWORK 

The diagram below illustrates the concept flow of the proposed project:
















 
B.	PROGRAM FLOWCHART 
 



C.	DATABASE STRUCTURE

Database Schema




















Physical Database Schema

 
Chapter 4
PRESENTATION OF SYSTEM OUTPUT
A.	USER INTERFACE (UI) DESIGN











Figure #: Window name [i.e. Home Page]
		Explanation/ description of the Figure (this is in paragraph form)
 
B.	PROGRAM LISTING

