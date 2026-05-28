"use client";

import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Plus, Trash2, X, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import type { exam, question } from "@/types";

interface QuestionEditorProps {
  exam: exam;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function QuestionEditor({ exam, onSuccess, onCancel }: QuestionEditorProps) {
  const [questions, setQuestions] = useState<question[]>(
    exam.questions.map(q => ({ ...q })) // Deep clone shallowly
  );
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "error">("saved");
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    setSaveStatus("saving");
    const timer = setTimeout(() => {
      silentSave();
    }, 1000);

    return () => clearTimeout(timer);
  }, [questions]);

  const handleQuestionChange = (index: number, field: keyof question, value: any) => {
    const updated = [...questions];
    updated[index] = { ...updated[index], [field]: value };
    setQuestions(updated);
  };

  const handleOptionChange = (qIndex: number, optIndex: number, value: string) => {
    const updated = [...questions];
    const newOptions = [...updated[qIndex].options];
    newOptions[optIndex] = value;
    updated[qIndex] = { ...updated[qIndex], options: newOptions };
    setQuestions(updated);
  };

  const addOption = (qIndex: number) => {
    const updated = [...questions];
    updated[qIndex].options.push("");
    setQuestions(updated);
  };

  const removeOption = (qIndex: number, optIndex: number) => {
    const updated = [...questions];
    updated[qIndex].options = updated[qIndex].options.filter((_, i) => i !== optIndex);
    // If the removed option was the correct answer, reset correct answer
    if (updated[qIndex].correctAnswer === questions[qIndex].options[optIndex]) {
      updated[qIndex].correctAnswer = "";
    }
    setQuestions(updated);
  };

  const addQuestion = () => {
    setQuestions([
      ...questions,
      {
        _id: Date.now().toString(), // Temp ID
        questionText: "",
        type: "MCQ",
        options: ["", "", "", ""],
        correctAnswer: "",
        points: 1,
      },
    ]);
  };

  const removeQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const silentSave = async () => {
    // Validation
    let isValid = true;
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.questionText.trim() || q.options.some(opt => !opt.trim()) || !q.correctAnswer || !q.options.includes(q.correctAnswer)) {
        isValid = false;
        break;
      }
    }

    if (!isValid) {
      setSaveStatus("error");
      return;
    }

    try {
      const payload = questions.map(q => {
        const { _id, ...rest } = q;
        return _id.length > 20 ? q : rest; // keep real mongo ids, drop temp ones
      });

      await api.patch(`/exams/${exam._id}`, { questions: payload });
      setSaveStatus("saved");
    } catch (error: any) {
      setSaveStatus("error");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-card p-4 rounded-lg border shadow-sm">
        <div>
          <h2 className="text-xl font-bold">Edit Questions</h2>
          <p className="text-sm text-muted-foreground">Modify the AI generated quiz</p>
        </div>
        <div className="flex gap-2 items-center">
          {saveStatus === "saving" && (
            <span className="text-sm text-muted-foreground flex items-center mr-4">
              <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...
            </span>
          )}
          {saveStatus === "saved" && (
            <span className="text-sm text-green-600 flex items-center mr-4">
              <CheckCircle2 className="h-4 w-4 mr-2" /> All changes saved
            </span>
          )}
          {saveStatus === "error" && (
            <span className="text-sm text-destructive flex items-center mr-4">
              <AlertCircle className="h-4 w-4 mr-2" /> Unsaved (Check errors)
            </span>
          )}
          <Button onClick={onSuccess}>
            Done
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        {questions.map((q, qIndex) => (
          <Card key={q._id || qIndex} className="border-primary/20 relative">
            <Button
              variant="destructive"
              size="icon"
              className="absolute -top-3 -right-3 h-8 w-8 rounded-full"
              onClick={() => removeQuestion(qIndex)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-medium flex gap-4 items-start">
                <span className="text-muted-foreground mt-2">{qIndex + 1}.</span>
                <Textarea
                  value={q.questionText}
                  onChange={(e) => handleQuestionChange(qIndex, "questionText", e.target.value)}
                  placeholder="Enter question text..."
                  className="flex-1"
                />
                <div className="flex flex-col gap-1 w-24">
                  <span className="text-xs text-muted-foreground">Points</span>
                  <Input
                    type="number"
                    min={1}
                    value={q.points}
                    onChange={(e) => handleQuestionChange(qIndex, "points", parseInt(e.target.value) || 1)}
                  />
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 pl-8">
                {q.options.map((opt, optIndex) => (
                  <div key={optIndex} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name={`correct-${qIndex}`}
                      checked={q.correctAnswer === opt && opt !== ""}
                      onChange={() => handleQuestionChange(qIndex, "correctAnswer", opt)}
                      className="h-4 w-4 text-primary"
                      title="Mark as correct answer"
                    />
                    <Input
                      value={opt}
                      onChange={(e) => {
                        handleOptionChange(qIndex, optIndex, e.target.value);
                        if (q.correctAnswer === opt) {
                          handleQuestionChange(qIndex, "correctAnswer", e.target.value);
                        }
                      }}
                      placeholder={`Option ${optIndex + 1}`}
                      className="flex-1"
                    />
                    <Button variant="ghost" size="icon" onClick={() => removeOption(qIndex, optIndex)}>
                      <X className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={() => addOption(qIndex)} className="mt-2">
                  <Plus className="h-3 w-3 mr-1" /> Add Option
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        <Button variant="secondary" className="w-full py-8 border-dashed border-2" onClick={addQuestion}>
          <Plus className="h-5 w-5 mr-2" /> Add New Question
        </Button>
      </div>
    </div>
  );
}
