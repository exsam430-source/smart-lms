import Quiz from "../models/Quiz.js";
import QuizSubmission from "../models/QuizSubmission.js";
import Course from "../models/Course.js";

// ✅ Teacher creates quiz
export const createQuiz = async (req, res) => {
  try {
    const { title, description, courseId, questions, duration, totalMarks } = req.body;

    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ message: "Course not found" });

    if (course.teacher.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const quiz = await Quiz.create({
      title,
      description,
      course: course._id,
      teacher: req.user._id,
      questions,
      duration,
      totalMarks: Number(totalMarks) || 0,
      status: "published",
    });

    // Populate course info before returning
    const populated = await Quiz.findById(quiz._id).populate("course", "title");

    res.status(201).json({ message: "Quiz created successfully", quiz: populated });
  } catch (error) {
    console.error("createQuiz error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ✅ Both teacher and student can fetch course quizzes
export const getCourseQuizzes = async (req, res) => {
  try {
    const quizzes = await Quiz.find({
      course: req.params.courseId,
      status: "published",
    }).populate("course", "title");

    res.json(quizzes);
  } catch (error) {
    console.error("getCourseQuizzes error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ✅ Student submits quiz
export const submitQuiz = async (req, res) => {
  try {
    const { quizId, answers } = req.body; // answers is array of { questionId, answer }

    const quiz = await Quiz.findById(quizId);
    if (!quiz) return res.status(404).json({ message: "Quiz not found" });

    // Check if already submitted
    const already = await QuizSubmission.findOne({
      quiz: quizId,
      student: req.user._id,
    });
    if (already) {
      return res.status(400).json({ message: "Quiz already submitted" });
    }

    // Identify if there are descriptive questions
    const hasDescriptive = quiz.questions.some((q) => q.type === "descriptive");
    const mcqQuestions = quiz.questions.filter((q) => q.type === "mcq" || !q.type);
    const mcqCount = mcqQuestions.length;

    // Calculate score for MCQs
    let score = 0;
    let correctMcqCount = 0;

    const formattedAnswers = quiz.questions.map((q) => {
      const studentAnsObj = answers.find(
        (a) => a.questionId === q._id.toString()
      );
      const studentAnsText = studentAnsObj ? studentAnsObj.answer : "";

      let isCorrect = false;
      let marksObtained = 0;

      if (q.type === "mcq" || !q.type) {
        if (studentAnsText && studentAnsText.trim() === q.correctAnswer.trim()) {
          isCorrect = true;
          correctMcqCount++;
        }
      }

      return {
        questionId: q._id,
        answer: studentAnsText,
        marksObtained: 0, // initially 0, will calculate or be graded by teacher
        feedback: "",
      };
    });

    // Weighted MCQ calculation
    let weightedMcqScore = 0;
    if (mcqCount > 0) {
      const weightPerQuestion = quiz.totalMarks / quiz.questions.length;
      weightedMcqScore = correctMcqCount * weightPerQuestion;
      
      // Update marksObtained in formattedAnswers for MCQs
      formattedAnswers.forEach((ans) => {
        const q = quiz.questions.find((x) => x._id.toString() === ans.questionId.toString());
        if (q && (q.type === "mcq" || !q.type)) {
          if (ans.answer && ans.answer.trim() === q.correctAnswer.trim()) {
            ans.marksObtained = weightPerQuestion;
          }
        }
      });
    }

    const submission = await QuizSubmission.create({
      quiz: quiz._id,
      student: req.user._id,
      answers: formattedAnswers,
      score: correctMcqCount, // raw MCQ correct count
      weightedScore: Number(weightedMcqScore.toFixed(2)),
      gradedByTeacher: !hasDescriptive, // if no descriptive questions, it's fully graded
    });

    res.json({
      message: "Quiz submitted successfully",
      score: correctMcqCount,
      weightedScore: submission.weightedScore,
      total: quiz.questions.length,
      submission,
    });
  } catch (error) {
    console.error("submitQuiz error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ✅ Get student submissions for teacher
export const getQuizSubmissions = async (req, res) => {
  try {
    const submissions = await QuizSubmission.find({ quiz: req.params.quizId })
      .populate("student", "name email batch semester department")
      .populate("quiz", "title totalMarks questions");

    res.json(submissions);
  } catch (error) {
    console.error("getQuizSubmissions error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ✅ Teacher grades descriptive questions
export const gradeDescriptive = async (req, res) => {
  try {
    const { submissionId, grades } = req.body; // grades: [{ questionId, marksObtained, feedback }]

    const submission = await QuizSubmission.findById(submissionId).populate("quiz");
    if (!submission) return res.status(404).json({ message: "Submission not found" });

    // Verify teacher owns the course
    const course = await Course.findById(submission.quiz.course);
    if (course.teacher.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }

    // Apply grades to answers
    grades.forEach((g) => {
      const ans = submission.answers.find(
        (a) => a.questionId.toString() === g.questionId.toString()
      );
      if (ans) {
        ans.marksObtained = Number(g.marksObtained) || 0;
        ans.feedback = g.feedback || "";
      }
    });

    // Recalculate total weighted score
    const totalWeighted = submission.answers.reduce((sum, a) => sum + (a.marksObtained || 0), 0);
    submission.weightedScore = Number(totalWeighted.toFixed(2));
    submission.gradedByTeacher = true;

    await submission.save();

    res.json({ message: "Descriptive answers graded successfully", submission });
  } catch (error) {
    console.error("gradeDescriptive error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ✅ Excel Export: get quiz marks for copying or downloading
export const getQuizMarksExcel = async (req, res) => {
  try {
    const { quizId } = req.params;
    const quiz = await Quiz.findById(quizId);
    if (!quiz) return res.status(404).json({ message: "Quiz not found" });

    const submissions = await QuizSubmission.find({ quiz: quizId })
      .populate("student", "name email batch semester department")
      .sort({ createdAt: -1 });

    const data = submissions.map((sub) => ({
      name: sub.student?.name || "N/A",
      email: sub.student?.email || "N/A",
      batch: sub.student?.batch || "N/A",
      semester: sub.student?.semester || "N/A",
      department: sub.student?.department || "N/A",
      mcqCorrect: sub.score,
      weightedScore: sub.weightedScore,
      totalMarks: quiz.totalMarks,
      status: sub.gradedByTeacher ? "Graded" : "Pending Grading",
      submittedAt: sub.createdAt,
    }));

    res.json(data);
  } catch (error) {
    console.error("getQuizMarksExcel error:", error);
    res.status(500).json({ message: "Server error" });
  }
};