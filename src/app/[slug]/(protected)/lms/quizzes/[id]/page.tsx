"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Loader2,
  CheckCircle,
  Clock,
  Calendar,
  Award,
  ArrowLeft,
} from "lucide-react";

import { api } from "@/lib/api";
import { useAuth } from "@/hooks/AuthProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import type { exam, Submission } from "@/types";
import QuizRadio from "@/components/lms/QuizRadio";
import QuestionEditor from "@/components/lms/QuestionEditor";

const Quiz = () => {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();
  const { user } = useAuth();
  const isStudent = user?.role === "student";
  const isTeacher = user?.role === "teacher" || user?.role === "admin";

  const { data: exam, mutate: mutateExam, isLoading: loadingExam, error: examError } = useSWR(id ? `/exams/${id}` : null);
  const { data: submission, mutate: mutateSubmission, isLoading: loadingSubmission } = useSWR(
    isStudent && id ? `/exams/${id}/result` : null,
    { shouldRetryOnError: false }
  );

  const loading = loadingExam || (isStudent && loadingSubmission);

  const [submitting, setSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  
  const totalPoints = exam
    ? exam.questions.reduce((acc: any, q: any) => acc + (q.points || 1), 0)
    : 0;
  const percentage =
    submission && totalPoints > 0
      ? Math.round((submission.score / totalPoints) * 100)
      : 0;

  useEffect(() => {
    if (examError) {
      toast.error("Failed to load exam");
      router.push(`/${params.slug}/lms/quizzes`);
    }
  }, [examError, router]);

  useEffect(() => {
    if (!loadingExam) {
      if (!exam) {
        // Only redirect if there's no exam and we're not loading and there's no error (which is handled above)
      } else if (!exam.isActive && !isTeacher) {
        router.push(`/${params.slug}/lms/quizzes`);
      }
    }
  }, [loadingExam, exam, isTeacher, router]);

  if (loading) {
    return (
      <div className="h-[80vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!exam || (!exam.isActive && !isTeacher)) {
    return null;
  }

  const isExpired = exam.isActive && new Date() > new Date(exam.dueDate);
  if ((!exam.isActive || isExpired) && !isTeacher) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center text-center space-y-4">
        <Clock className="h-12 w-12 text-accent-foreground" />
        <h2 className="text-xl font-bold">Quiz Unavailable</h2>
        <p className="text-muted-foreground">
          This quiz is currently closed or has expired.
        </p>
        <Button onClick={() => router.push(`/${params.slug}/lms/quizzes`)}>Back to List</Button>
      </div>
    );
  }

  const handleTeacherDelete = async () => {
    if (!confirm("Are you sure you want to delete this exam?")) return;
    try {
      await api.delete(`/exams/${id}`);
      toast.success("Quiz deleted");
      router.push(`/${params.slug}/lms/quizzes`);
    } catch (error) {
      toast.error("Failed to delete");
    }
  };

  const handleStudentSubmit = async () => {
    if (!exam) return;
    if (Object.keys(answers).length < exam.questions.length) {
      toast.error("Please answer all questions before submitting.");
      return;
    }
    try {
      setSubmitting(true);
      const payload = Object.entries(answers).map(([qId, ans]) => ({
        questionId: qId,
        answer: ans,
      }));
      const { data } = await api.post(`/exams/${id}/submit`, {
        answers: payload,
      });
      toast.success(`Quiz submitted! Score: ${data.score}`);
      router.push(`/${params.slug}/lms/quizzes`);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async () => {
    try {
      const { data } = await api.patch(`/exams/${id}`, { isActive: !exam?.isActive });
      toast.success(data.message);
      mutateExam();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to update status");
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div className="space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h1 className="text-2xl sm:text-3xl font-bold">{exam.title}</h1>
          <Badge className="w-fit" variant={exam.isActive ? "default" : "secondary"}>
            {exam.isActive ? "Active" : "Draft"}
          </Badge>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 text-muted-foreground text-sm">
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" /> {exam.duration} Minutes
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="h-4 w-4" /> Due:{" "}
            {new Date(exam.dueDate).toLocaleDateString()}
          </div>
        </div>
      </div>
      {isTeacher && (
        <>
          <Separator />
          <div className="bg-card p-4 rounded-lg flex flex-col lg:flex-row lg:items-center justify-between border gap-4">
            <div className="text-lg font-semibold">Teacher Controls</div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => router.push(`/${params.slug}/lms/quizzes`)}>
                Back to List
              </Button>
              {!isEditing && (
                <Button variant="secondary" size="sm" onClick={() => setIsEditing(true)}>
                  Edit Questions
                </Button>
              )}
              <Button
                variant={exam.isActive ? "destructive" : "default"}
                size="sm"
                onClick={handleToggleStatus}
              >
                {exam.isActive ? "Unpublish Quiz" : "Publish Quiz"}
              </Button>
              <Button variant="destructive" size="sm" onClick={handleTeacherDelete}>
                Delete Quiz
              </Button>
            </div>
          </div>
          <Separator />
        </>
      )}

      {isStudent && submission && (
        <>
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-8 space-y-4">
              <div className="h-16 w-16 bg-yellow-100 rounded-full flex items-center justify-center">
                <Award className="h-8 w-8 text-yellow-600" />
              </div>
              <div className="text-center">
                <h1 className="text-3xl font-bold">Quiz Results</h1>
                <p className="text-muted-foreground">You scored</p>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-extrabold text-primary">
                  {submission.score}
                </span>
                <span className="text-2xl text-muted-foreground">
                  / {totalPoints}
                </span>
              </div>
              <Badge
                variant={percentage >= 50 ? "default" : "destructive"}
                className="text-lg px-4 py-1"
              >
                {percentage}%
              </Badge>
            </CardContent>
          </Card>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push(`/${params.slug}/lms/quizzes`)}
            >
              <ArrowLeft className="h-4 w-4 mr-2" /> Back to Quizzes
            </Button>
            <h2 className="text-xl font-semibold ml-auto">Review Answers</h2>
          </div>
        </>
      )}

      {isTeacher && !isEditing ? (
        <div className="mt-6">
          <Tabs defaultValue="questions" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="questions">Questions</TabsTrigger>
              <TabsTrigger value="submissions">Submissions</TabsTrigger>
            </TabsList>
            <TabsContent value="questions">
              <QuestionsList exam={exam} isTeacher={isTeacher} answers={answers} setAnswers={setAnswers} submission={submission} />
            </TabsContent>
            <TabsContent value="submissions">
              <SubmissionsTab examId={id} />
            </TabsContent>
          </Tabs>
        </div>
      ) : isEditing ? (
        <QuestionEditor
          exam={exam}
          onSuccess={() => {
            setIsEditing(false);
            mutateExam();
          }}
          onCancel={() => setIsEditing(false)}
        />
      ) : (
        <div className="mt-6">
          <QuestionsList exam={exam} isTeacher={isTeacher} answers={answers} setAnswers={setAnswers} submission={submission} />
        </div>
      )}

      {!isEditing && (
        <div className="flex justify-end gap-4 pt-4">
        {isStudent && !submission && (
          <Button
            size="lg"
            className="w-full md:w-auto min-w-50"
            onClick={handleStudentSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              "Submit Quiz"
            )}
          </Button>
        )}
      </div>
      )}
    </div>
  );
};

// Extracted QuestionsList to keep code clean
const QuestionsList = ({ exam, isTeacher, answers, setAnswers, submission }: any) => {
  return (
    <div className="space-y-6">
      {exam.questions.map((q: any, index: number) => (
        <Card key={q._id}>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-medium flex flex-col sm:flex-row sm:items-start gap-2">
              <div className="flex gap-2 flex-1">
                <span className="text-muted-foreground">{index + 1}.</span>
                <span>{q.questionText}</span>
              </div>
              <span className="sm:ml-auto w-fit text-xs font-normal text-muted-foreground bg-secondary px-2 py-1 rounded whitespace-nowrap">
                {q.points} pts
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isTeacher ? (
              <ul className="space-y-2">
                {q.options.map((opt: string, i: number) => (
                  <li
                    key={i}
                    className={`p-3 rounded-md border flex items-center gap-2 ${
                      opt === q.correctAnswer
                        ? "bg-primary font-medium"
                        : "bg-black/20 dark:bg-black/70"
                    }`}
                  >
                    {opt === q.correctAnswer && (
                      <CheckCircle className="h-4 w-4" />
                    )}
                    {opt}
                  </li>
                ))}
              </ul>
            ) : (
              <QuizRadio
                answers={answers}
                question={q}
                setAnswers={setAnswers}
                submission={submission}
              />
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

// Submissions tracking tab
import { Users, XCircle } from "lucide-react";
const SubmissionsTab = ({ examId }: { examId: string }) => {
  const { data: tracking, isLoading } = useSWR(`/exams/${examId}/tracking`);

  if (isLoading) {
    return (
      <div className="h-40 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!tracking) return <p>Failed to load tracking data.</p>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Students</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tracking.totalStudents}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{tracking.submissions?.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Not Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-rose-600">{tracking.missingStudents?.length || 0}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-emerald-500" />
              Completed
            </CardTitle>
          </CardHeader>
          <CardContent>
            {tracking.submissions?.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No submissions yet.</p>
            ) : (
              <ul className="space-y-3">
                {tracking.submissions?.map((sub: any) => (
                  <li key={sub._id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex flex-col">
                      <span className="font-medium text-sm">{sub.student.name}</span>
                      <span className="text-xs text-muted-foreground">{new Date(sub.submittedAt).toLocaleString()}</span>
                    </div>
                    <Badge variant={sub.percentage >= 50 ? "default" : "destructive"}>
                      {sub.score}/{sub.totalPoints} ({sub.percentage}%)
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <XCircle className="h-5 w-5 text-rose-500" />
              Not Completed
            </CardTitle>
          </CardHeader>
          <CardContent>
            {tracking.missingStudents?.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">All students have submitted!</p>
            ) : (
              <ul className="space-y-3">
                {tracking.missingStudents?.map((student: any) => (
                  <li key={student._id} className="flex items-center gap-3 p-3 bg-rose-50/50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/50 rounded-lg">
                    <div className="h-8 w-8 rounded-full bg-rose-100 dark:bg-rose-900/50 flex items-center justify-center text-rose-600 dark:text-rose-400 font-medium">
                      {student.name.charAt(0)}
                    </div>
                    <span className="font-medium text-sm">{student.name}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Quiz;
