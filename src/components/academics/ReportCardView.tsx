import React from "react";
import { format } from "date-fns";

interface ReportCardProps {
  report: any;
}

export const ReportCardView = ({ report }: ReportCardProps) => {
  return (
    <div className="bg-white text-black p-8 max-w-3xl mx-auto border shadow-sm print:shadow-none print:border-none print:p-0">
      {/* Header */}
      <div className="text-center border-b pb-6 mb-6">
        <h1 className="text-3xl font-bold uppercase tracking-wider">Edunexus High School</h1>
        <p className="text-sm mt-1 text-gray-500">Academic Report Card</p>
        <p className="text-sm font-semibold mt-2">{report.academicYear?.name} - {report.term}</p>
      </div>

      {/* Student Info */}
      <div className="flex justify-between items-end mb-6">
        <div>
          <p><span className="font-semibold">Student Name:</span> {report.student?.name}</p>
          <p><span className="font-semibold">Class:</span> {report.class?.name}</p>
        </div>
        <div className="text-right">
          <p><span className="font-semibold">Generated On:</span> {format(new Date(report.createdAt), "MMM dd, yyyy")}</p>
        </div>
      </div>

      {/* Grades Table */}
      <table className="w-full border-collapse border border-gray-300 mb-6">
        <thead>
          <tr className="bg-gray-100">
            <th className="border border-gray-300 p-2 text-left">Subject</th>
            <th className="border border-gray-300 p-2 text-center w-24">Score</th>
            <th className="border border-gray-300 p-2 text-center w-24">Grade</th>
          </tr>
        </thead>
        <tbody>
          {report.grades?.map((grade: any) => (
            <tr key={grade._id || grade.subject._id}>
              <td className="border border-gray-300 p-2">{grade.subject?.name}</td>
              <td className="border border-gray-300 p-2 text-center">{grade.score}</td>
              <td className="border border-gray-300 p-2 text-center font-semibold">{grade.grade}</td>
            </tr>
          ))}
          {report.grades?.length === 0 && (
            <tr>
              <td colSpan={3} className="border border-gray-300 p-4 text-center text-gray-500">
                No grades recorded for this term.
              </td>
            </tr>
          )}
        </tbody>
        <tfoot>
          <tr className="bg-gray-50">
            <td className="border border-gray-300 p-2 font-bold text-right">Overall Average:</td>
            <td className="border border-gray-300 p-2 text-center font-bold">{report.averageScore}</td>
            <td className="border border-gray-300 p-2 text-center font-bold text-lg">{report.overallGrade}</td>
          </tr>
        </tfoot>
      </table>

      {/* Footer / Signatures */}
      <div className="mt-12 flex justify-between pt-8 border-t border-gray-200">
        <div className="text-center w-48">
          <div className="border-b border-gray-400 h-8 mb-2"></div>
          <p className="text-sm text-gray-600">Class Teacher Signature</p>
        </div>
        <div className="text-center w-48">
          <div className="border-b border-gray-400 h-8 mb-2"></div>
          <p className="text-sm text-gray-600">Principal Signature</p>
        </div>
      </div>
    </div>
  );
};
