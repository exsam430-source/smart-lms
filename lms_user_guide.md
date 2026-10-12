# Smart LMS — Comprehensive User & Admin Guide (Detailed Walkthrough)

Welcome to the **Smart Learning Management System (LMS)**. This detailed guide provides step-by-step instructions for **Administrators**, **Teachers**, and **Students** to perform administrative tasks, assign marks, and retrieve result transcripts.

---

## Table of Contents
1. [Admin Panel: Step-by-Step Operations](#1-admin-panel-step-by-step-operations)
   * [Add a Student & Assign Registration Info](#add-a-student--assign-registration-info)
   * [Create a New Course & Configure Evaluation Weights](#create-a-new-course--configure-evaluation-weights)
   * [Enroll Students (Automatic vs. Direct)](#enroll-students-automatic-vs-direct)
   * [Promoting Classes (With Drop/Fail Reasons)](#promoting-classes-with-dropfail-reasons)
   * [Manage Course Evaluation Grades](#manage-course-evaluation-grades)
2. [Teacher Panel: Step-by-Step Operations](#2-teacher-panel-step-by-step-operations)
   * [Add an Assignment with Max Marks](#add-an-assignment-with-max-marks)
   * [Add Quizzes (MCQ vs. Descriptive with PDF Reference)](#add-quizzes-mcq-vs-descriptive-with-pdf-reference)
   * [Filling the Award List Matrix](#filling-the-award-list-matrix)
   * [Exporting Grades to Excel / Clipboard](#exporting-grades-to-excel--clipboard)
3. [Student Panel: Step-by-Step Operations](#3-student-panel-step-by-step-operations)
   * [Submit Assignments & Take Quizzes](#submit-assignments--take-quizzes)
   * [Retrieve Marks & Export Official Transcript PDF](#retrieve-marks--export-official-transcript-pdf)

---

## 1. Admin Panel: Step-by-Step Operations

### Add a Student & Assign Registration Info
To register a student and set up their program criteria:
1. Log in as **Admin** and click **Students** in the left sidebar menu.
2. Click the **Add Student** button (a plus icon) at the top right of the student list.
3. Fill out the student registration form:
   * **Full Name**: Enter student's name (e.g., `Ali Khan`).
   * **Email Address**: Enter their academic email (e.g., `ali.khan@lms.edu`).
   * **Password**: Assign a secure starting password (e.g., `Student@123`).
   * **Registration Number (`Reg No`)**: Enter their unique university roll number (e.g., `FA22-BCS-089`).
   * **Batch**: Select the target student batch from the dropdown (e.g., `2022-2026`).
   * **Semester**: Select the current semester from the dropdown (e.g., Semester `4`).
   * **Department**: Select the program department (e.g., `Computer Science`).
4. Click **Create Student**. The student profile will save and auto-populate in lists.

### Create a New Course & Configure Evaluation Weights
To introduce a course subject and configure its grading weights:
1. Click **Courses** in the left sidebar menu.
2. Click **Create Course** at the top right.
3. In the course creation form:
   * **Course Title**: Enter the name of the course (e.g., `Programming Fundamentals`).
   * **Description**: Provide course highlights or syllabus.
   * **Subject**: Type the course code or catalog subject (e.g., `CS-101`).
   * **Category**: Select or enter a category (e.g., `Programming`).
   * **Duration**: Set duration (e.g., `4 Months`).
   * **Teacher**: Assign a subject teacher from the dropdown of registered instructors.
   * **Batch**: Select the cohort allowed to take this course (e.g., `2024-2028`).
   * **Semester**: Select the target semester (e.g., Semester `1`).
   * **Department**: Select the matching department (e.g., `Computer Science`).
4. **Configure Components (Weights)**:
   Set the marks distribution out of 100 under **Assessment Components Total Marks**:
   * *Quiz Weight*: Enter `5` (means quizzes count for 5% of final grade).
   * *Assignment Weight*: Enter `10` (means assignments count for 10% of final grade).
   * *Presentation Weight*: Enter `5`.
   * *Lab Work Weight*: Enter `10`.
   * *Mid-Term Weight*: Enter `20`.
   * *Final-Term Weight*: Enter `50`.
   * **Note**: The modal shows a helper sum at the bottom (e.g., `Current Total: 100`). Adjust component totals to equal exactly 100.
5. Click **Create Course**.

### Enroll Students (Automatic vs. Direct)
Students can be enrolled in two ways:
* **Option A: Auto-Enrollment (Recommended)**: 
  When you create the course above with `Batch: 2024-2028`, `Semester: 1`, and `Department: Computer Science`, the system automatically searches the database for all students whose profile records match this criteria. Those students are **instantly enrolled** in the course.
* **Option B: Direct Enrollment (Manual Override)**:
  1. Go to the Admin **Courses** list.
  2. Find the course card (e.g., `Programming Fundamentals`) and click **Enroll Student**.
  3. Search and select a student from the dropdown list (displays student batch and department labels).
  4. Click **Enroll Student** to force enrollment regardless of batch matches.

### Promoting Classes (With Drop/Fail Reasons)
At the end of an academic semester, to move a cohort of students to the next semester:
1. Go to the Admin **Students** list.
2. Click the **Promote Students** button.
3. In the promotion dialog:
   * Select the cohort's **Current Batch** (e.g., `2020-2024`).
   * Select their **Current Semester** (e.g., Semester `7`).
   * Select the **Target Promotion Semester** (e.g., Semester `8`).
4. A list of students matching the batch and semester will appear.
5. **Check the box** next to students who passed and are promoted.
6. **Uncheck the box** next to students who failed, dropped out, or left:
   * For unchecked students, a dropdown will appear under **Reason**. Select either `failed`, `dropped`, or `left`.
7. Click **Promote Students**. Approved students move to Semester 8, while failed/dropped students retain their current semester and receive their designated status label.

### Manage Course Evaluation Grades
To review or override grading for any course:
1. Go to the Admin **Courses** tab.
2. Find the course card and click **Award List**.
3. A spreadsheet matrix displays all enrolled students.
   * **Quiz** & **Assignment** columns are read-only and automatically aggregated from student submissions.
   * **Presentation, Lab, Mid, and Final** are editable input boxes.
4. Input or override marks in the textboxes (checks are in place so entries cannot exceed the course's configured component weights).
5. Click **Save Award List**.

---

## 2. Teacher Panel: Step-by-Step Operations

### Add an Assignment with Max Marks
1. Log in as a **Teacher** and click **Assignments** in the sidebar.
2. Click **Create Assignment**.
3. Select the target course (e.g., `Programming Fundamentals`).
4. Enter the **Total Marks** (e.g., `100` or `50`).
5. Provide a Title, Description, and select a Due Date.
6. Choose a reference assignment PDF/Document from your local machine to upload.
7. Click **Create Assignment**.
8. To grade submissions, open the assignment card, select a student file submission, review their work, type their score (out of the configured max marks), and enter feedback.

### Add Quizzes (MCQ vs. Descriptive with PDF Reference)
1. Go to **Quizzes** in the sidebar.
2. Click **Create Quiz**. Select the course and configure the **Total Marks** (e.g., `30`).
3. Add questions:
   * **For MCQs**: Select "MCQ" type, enter options (A, B, C, D), and mark the correct option.
   * **For Descriptive**: Select "Descriptive" type, type the query, and optionally upload a PDF diagram or text resource.
4. Submit the quiz to publish it to students.
5. For Descriptive submissions, click **Grade**, read the student's text answer, and save their score.

### Filling the Award List Matrix
1. Go to **My Courses** in the sidebar.
2. Locate the course card and click **Award List**.
3. The table displays:
   * **Student Name & Registration No**.
   * **Quiz (Auto-calculated)**: Aggregates all published quizzes. For instance, if a student gets 16 marks total out of 25 across three quizzes, the system automatically translates this into the course's quiz weight (e.g., 5 marks) as:
     $$\text{Quiz Weight Score} = (16 / 25) \times 5 = 3.20$$
   * **Assignment (Auto-calculated)**: Aggregates assignment scores automatically relative to the assignment weight.
   * **Manual Fields**: Double-click or select the textboxes for **Presentation, Lab work, Mid-term, and Final-term** to type the scores.
4. The final **Total (out of 100)** updates automatically.
5. Click **Save Award List** to upload these results.

### Exporting Grades to Excel / Clipboard
To back up grades or upload them to university databases:
1. In the **Quizzes** submission grading dialog:
   * Click **Download CSV** to generate a spreadsheet file.
   * Click **Copy TSV** to copy the data directly to your clipboard, allowing you to paste the marks column directly into Excel.

---

## 3. Student Panel: Step-by-Step Operations

### Submit Assignments & Take Quizzes
* **To Submit Assignments**:
  1. Go to **Assignments** in the sidebar.
  2. Click on the active assignment card.
  3. Drag and drop your file submission (PDF, Zip, Word, etc.) and click **Submit**. The card status changes to a locked green **Submitted** badge.
* **To Take Quizzes**:
  1. Go to **Quizzes** or the course lectures page.
  2. Click **Start Quiz**. Review questions and select options (MCQs) or write descriptive text.
  3. If a reference document exists, click **View Reference PDF** to read the diagram.
  4. Submit the quiz.

### Retrieve Marks & Export Official Transcript PDF
1. Go to the student **Dashboard**.
2. Scroll to the bottom card titled **Semester Results & Award List**.
3. View the evaluation metrics for all courses:
   * Component breakdown scores (Quiz, Assignment, Presentation, Lab, Mid, Final).
   * Total aggregated score out of 100.
   * Final Letter Grade (e.g. `A`, `B`, `F`).
4. Click **Download PDF** at the top right of the card. A formatted academic transcript report will launch and automatically trigger your browser's PDF print/save dialogue.
