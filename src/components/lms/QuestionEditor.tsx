"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Save, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import type { exam, Question } from "@/types";

interface QuestionEditorProps {
  exam: exam;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function QuestionEditor({ exam, onSuccess, onCancel }: QuestionEditorProps) {
  const [questions, setQuestions] = useState<Question[]>(
    exam.questions.map(q => ({ ...q })) // Deep clone shallowly
  );
  const [saving, setSaving] = useState(false);

  const handleQuestionChange = (index: number, field: keyof Question, value: any) => {
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
        options: ["", "", "", ""],
        correctAnswer: "",
        points: 1,
      },
    ]);
  };

  const removeQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    // Validation
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.questionText.trim()) return toast.error(`Question ${i + 1} text is empty`);
      if (q.options.some(opt => !opt.trim())) return toast.error(`Question ${i + 1} has empty options`);
      if (!q.correctAnswer) return toast.error(`Question ${i + 1} has no correct answer selected`);
      if (!q.options.includes(q.correctAnswer)) return toast.error(`Question ${i + 1} correct answer must match one of the options exactly`);
    }

    try {
      setSaving(true);
      // Remove temp _ids from new questions before sending to backend
      const payload = questions.map(q => {
        const { _id, ...rest } = q;
        return _id.length > 20 ? q : rest; // keep real mongo ids, drop temp ones
      });

      await api.patch(`/exams/${exam._id}`, { questions: payload });
      toast.success("Questions updated successfully");
      onSuccess();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to save questions");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-card p-4 rounded-lg border shadow-sm">
        <div>
          <h2 className="text-xl font-bold">Edit Questions</h2>
          <p className="text-sm text-muted-foreground">Modify the AI generated quiz</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel} disabled={saving}>
            <X className="h-4 w-4 mr-2" /> Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Save Changes
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
