"use client";

import React, { useRef } from "react";
import { format } from "date-fns";
import { Download, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";

interface ReportCardProps {
  report: any;
  showActions?: boolean;
}

function gradeColor(grade: string): string {
  switch (grade) {
    case "A": return "#16a34a";
    case "B": return "#2563eb";
    case "C": return "#d97706";
    case "D": return "#ea580c";
    case "F": return "#dc2626";
    default:  return "#6b7280";
  }
}

function getRemarks(avg: number): string {
  if (avg >= 90) return "Outstanding performance. Keep up the excellent work!";
  if (avg >= 80) return "Very good performance. Continue to strive for excellence.";
  if (avg >= 70) return "Good performance. There is room for further improvement.";
  if (avg >= 60) return "Satisfactory performance. More consistent effort is needed.";
  if (avg >= 50) return "Performance is below average. Significant improvement is required.";
  return "Poor performance. Urgent attention and support needed.";
}

export const AnnualReportCardView = ({ report, showActions = true }: ReportCardProps) => {
  const printRef = useRef<HTMLDivElement>(null);
  const [schoolInfo, setSchoolInfo] = React.useState<{name: string, logoUrl: string, motto: string} | null>(null);

  React.useEffect(() => {
    api.get("/settings/school")
      .then((res) => {
        if (res.data?.settings) {
          setSchoolInfo({
            name: res.data.settings.schoolName || "EduNexus High School",
            logoUrl: res.data.settings.schoolLogo || "",
            motto: res.data.settings.schoolMotto || "Excellence · Integrity · Innovation",
          });
        } else {
          setSchoolInfo({
            name: "EduNexus High School",
            logoUrl: "",
            motto: "Excellence · Integrity · Innovation",
          });
        }
      })
      .catch((err) => {
        console.error("Failed to load school branding", err);
        setSchoolInfo({
          name: "EduNexus High School",
          logoUrl: "",
          motto: "Excellence · Integrity · Innovation",
        });
      });
  }, []);

  if (!schoolInfo) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  const handlePrint = () => {
    const printContents = printRef.current?.innerHTML;
    if (!printContents) return;
    const win = window.open("", "_blank", "width=900,height=700");
    if (!win) return;
    win.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Annual Report Card – ${report.student?.name}</title>
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; background: white; }
            @page { size: A4; margin: 10mm; }
          </style>
        </head>
        <body>${printContents}</body>
      </html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 500);
  };

  const avg = report.annualAverage ?? report.averageScore ?? 0;
  const gradeCol = gradeColor(report.overallGrade);

  return (
    <div>
      {/* Action Buttons */}
      {showActions && (
        <div className="flex gap-2 mb-4 justify-end">
          <Button variant="outline" onClick={handlePrint} className="gap-2">
            <Printer className="h-4 w-4" />
            Print / Save PDF
          </Button>
          <Button onClick={handlePrint} className="gap-2">
            <Download className="h-4 w-4" />
            Download PDF
          </Button>
        </div>
      )}

      {/* Printable Report Card */}
      <div
        ref={printRef}
        style={{
          background: "white",
          color: "#1e293b",
          fontFamily: "'Segoe UI', Arial, sans-serif",
          maxWidth: 794,
          minWidth: 794,
          margin: "0 auto",
          padding: 0,
          borderRadius: 12,
          overflow: "hidden",
          boxShadow: "0 4px 32px rgba(0,0,0,0.10)",
        }}
      >
        {/* ── Top accent bar ─────────────────────────────── */}
        <div style={{ background: "linear-gradient(135deg, #1e40af 0%, #3b82f6 60%, #06b6d4 100%)", height: 8 }} />

        {/* ── Header ─────────────────────────────────────── */}
        <div style={{ padding: "28px 36px 20px", borderBottom: "2px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            {/* Logo */}
            <div style={{
              width: 60, height: 60, borderRadius: 16,
              background: schoolInfo.logoUrl ? "transparent" : "linear-gradient(135deg, #1e40af, #3b82f6)",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
              overflow: "hidden",
            }}>
              {schoolInfo.logoUrl ? (
                <img src={schoolInfo.logoUrl} alt="School Logo" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <span style={{ color: "white", fontWeight: 900, fontSize: 22, letterSpacing: -1 }}>EN</span>
              )}
            </div>
            <div>
              <div style={{ fontWeight: 900, fontSize: 22, color: "#1e40af", letterSpacing: 0.5 }}>{schoolInfo.name}</div>
              <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{schoolInfo.motto}</div>
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ background: "#eff6ff", border: "1.5px solid #bfdbfe", borderRadius: 8, padding: "6px 14px" }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: "#1e40af" }}>ANNUAL REPORT CARD</div>
              <div style={{ fontSize: 12, color: "#3b82f6", marginTop: 2 }}>
                {report.academicYear?.name}
              </div>
            </div>
          </div>
        </div>

        {/* ── Student Info Row ───────────────────────────── */}
        <div style={{ padding: "18px 36px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.5 }}>Student Name</div>
            <div style={{ fontWeight: 700, fontSize: 16, marginTop: 2 }}>{report.student?.name}</div>
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.5 }}>Class</div>
            <div style={{ fontWeight: 700, fontSize: 16, marginTop: 2 }}>{report.class?.name}</div>
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.5 }}>Date Issued</div>
            <div style={{ fontWeight: 700, fontSize: 16, marginTop: 2 }}>{format(new Date(), "MMM dd, yyyy")}</div>
          </div>
        </div>

        {/* ── Performance Summary Banner ─────────────────── */}
        <div style={{ padding: "18px 36px", background: "linear-gradient(90deg, #eff6ff 0%, #f0fdf4 100%)", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: 24 }}>
          {/* Big grade circle */}
          <div style={{
            width: 72, height: 72, borderRadius: "50%",
            border: \`4px solid \${gradeCol}\`,
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}>
            <span style={{ fontWeight: 900, fontSize: 26, color: gradeCol, lineHeight: 1 }}>{report.overallGrade}</span>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <span style={{ fontWeight: 700, fontSize: 15 }}>Annual Average: <span style={{ color: gradeCol }}>{avg}%</span></span>
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                {report.annualRank && report.annualRank > 0 && (
                  <span style={{
                    background: "#1e40af", color: "white",
                    borderRadius: 6, padding: "3px 10px",
                    fontWeight: 700, fontSize: 12,
                  }}>
                    Annual Rank: {report.annualRank}
                  </span>
                )}
                <span style={{ fontSize: 12, color: "#64748b" }}>{report.grades?.length ?? 0} subjects assessed</span>
              </div>
            </div>
            {/* Progress bar */}
            <div style={{ background: "#e2e8f0", borderRadius: 6, height: 10, width: "100%", overflow: "hidden" }}>
              <div style={{ width: \`\${avg}%\`, height: "100%", background: avg >= 80 ? "#16a34a" : avg >= 60 ? "#d97706" : "#dc2626", borderRadius: 6 }} />
            </div>
            <div style={{ marginTop: 8, fontSize: 12, color: "#475569", fontStyle: "italic" }}>{getRemarks(Number(avg))}</div>
          </div>
        </div>

        {/* ── Grades Table ───────────────────────────────── */}
        <div style={{ padding: "20px 36px" }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: "#1e40af", marginBottom: 12, textTransform: "uppercase", letterSpacing: 0.5 }}>
            Annual Subject Performance
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ background: "#1e40af" }}>
                <th style={{ color: "white", fontWeight: 700, padding: "9px 10px", textAlign: "left", borderRadius: "6px 0 0 0" }}>Subject</th>
                <th style={{ color: "white", fontWeight: 700, padding: "9px 10px", textAlign: "center", width: 70 }}>Term 1</th>
                <th style={{ color: "white", fontWeight: 700, padding: "9px 10px", textAlign: "center", width: 70 }}>Term 2</th>
                <th style={{ color: "white", fontWeight: 700, padding: "9px 10px", textAlign: "center", width: 70 }}>Term 3</th>
                <th style={{ color: "white", fontWeight: 700, padding: "9px 10px", textAlign: "center", width: 80 }}>Average</th>
                <th style={{ color: "white", fontWeight: 700, padding: "9px 10px", textAlign: "center", width: 60 }}>Grade</th>
                <th style={{ color: "white", fontWeight: 700, padding: "9px 10px", textAlign: "left", borderRadius: "0 6px 0 0", width: 90 }}>Remark</th>
              </tr>
            </thead>
            <tbody>
              {report.grades?.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: "20px", textAlign: "center", color: "#94a3b8" }}>No grades recorded for this year.</td>
                </tr>
              ) : (
                report.grades?.map((g: any, i: number) => (
                  <tr key={g._id || i} style={{ background: i % 2 === 0 ? "#f8fafc" : "white" }}>
                    <td style={{ padding: "9px 10px", fontWeight: 600 }}>{g.subject?.name ?? g.subject}</td>
                    <td style={{ padding: "9px 10px", textAlign: "center" }}>
                      {g.termScores && g.termScores["Term 1"] != null ? g.termScores["Term 1"].toFixed(1) : "—"}
                    </td>
                    <td style={{ padding: "9px 10px", textAlign: "center" }}>
                      {g.termScores && g.termScores["Term 2"] != null ? g.termScores["Term 2"].toFixed(1) : "—"}
                    </td>
                    <td style={{ padding: "9px 10px", textAlign: "center" }}>
                      {g.termScores && g.termScores["Term 3"] != null ? g.termScores["Term 3"].toFixed(1) : "—"}
                    </td>
                    <td style={{ padding: "9px 10px", textAlign: "center", fontWeight: 700, fontSize: 14 }}>
                      {g.score != null ? g.score.toFixed(1) : "—"}
                    </td>
                    <td style={{ padding: "9px 10px", textAlign: "center" }}>
                      <span style={{
                        display: "inline-block", fontWeight: 800, fontSize: 12,
                        color: gradeColor(g.grade), background: \`\${gradeColor(g.grade)}15\`,
                        border: \`1.5px solid \${gradeColor(g.grade)}50\`,
                        borderRadius: 6, padding: "2px 8px"
                      }}>{g.grade}</span>
                    </td>
                    <td style={{ padding: "9px 10px", color: "#475569", fontStyle: "italic", fontSize: 11 }}>
                      {g.remark || ""}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot>
              <tr style={{ background: "#eff6ff", borderTop: "2px solid #bfdbfe" }}>
                <td style={{ padding: "12px 10px", fontWeight: 800, color: "#1e40af" }}>Annual Average</td>
                <td colSpan={3} />
                <td style={{ padding: "12px 10px", textAlign: "center", fontWeight: 800, fontSize: 16, color: gradeCol }}>{avg}%</td>
                <td style={{ padding: "12px 10px", textAlign: "center" }}>
                  <span style={{
                    display: "inline-block", fontWeight: 900, fontSize: 14,
                    color: gradeCol, background: \`\${gradeCol}20\`,
                    border: \`2px solid \${gradeCol}\`,
                    borderRadius: 8, padding: "3px 12px"
                  }}>{report.overallGrade}</span>
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>

        {/* ── Footer ─────────────────────────────────────── */}
        <div style={{ padding: "24px 36px 36px", color: "#64748b", fontSize: 11 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
            <div>
              <p style={{ fontWeight: 600, color: "#475569", marginBottom: 4 }}>Grading Scale:</p>
              <div style={{ display: "flex", gap: 12 }}>
                <span><strong style={{ color: "#16a34a" }}>A:</strong> 90-100%</span>
                <span><strong style={{ color: "#2563eb" }}>B:</strong> 80-89%</span>
                <span><strong style={{ color: "#d97706" }}>C:</strong> 70-79%</span>
                <span><strong style={{ color: "#ea580c" }}>D:</strong> 60-69%</span>
                <span><strong style={{ color: "#dc2626" }}>F:</strong> 0-59%</span>
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ width: 140, height: 1, background: "#cbd5e1", margin: "0 0 8px auto" }} />
              <p style={{ fontWeight: 600 }}>Principal's Signature</p>
            </div>
          </div>
          <div style={{ marginTop: 24, textAlign: "center", paddingTop: 16, borderTop: "1px dashed #e2e8f0" }}>
            <p>Generated by EduNexus School Management System</p>
          </div>
        </div>
      </div>
    </div>
  );
};
