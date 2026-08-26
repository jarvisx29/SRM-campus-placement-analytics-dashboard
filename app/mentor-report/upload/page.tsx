"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import SrmHeader from "@/components/SrmHeader";

const initialForm = {
  mentorName: "",
  facultyId: "",
  meetingDate: "",
  meetingLink: "",
  minutes: "",
  presentRegNos: "",
  absentRegNos: "",
  reportLink: "",
};

const inputClass =
  "border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none bg-gray-50 focus:border-[#1565c0] w-full";
const labelClass = "text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block";

export default function MentorUploadPage() {
  const [mentors, setMentors] = useState<string[]>([]);
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetch("/api/mentor-portal")
      .then((r) => r.json())
      .then((d) => setMentors(d.mentors ?? []))
      .catch(() => setMessage({ type: "error", text: "Failed to load mentor list" }));
  }, []);

  const update = (key: keyof typeof initialForm, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/mentor-portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: "error", text: data.error || "Submission failed" });
      } else {
        setMessage({ type: "success", text: "Progress report submitted successfully." });
        setForm({ ...initialForm, mentorName: form.mentorName });
      }
    } catch {
      setMessage({ type: "error", text: "Could not reach the server. Please try again." });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-3 sm:p-6 flex flex-col gap-4 sm:gap-6">
      <SrmHeader subtitle="Mentor Progress Report" />

      <Link
        href="/mentor-report"
        className="text-xs font-semibold text-[#1565c0] hover:underline w-fit"
      >
        ← Back to Mentors
      </Link>

      <div className="w-full max-w-xl mx-auto bg-white rounded-xl shadow-sm border border-gray-100 p-6 sm:p-8 flex flex-col gap-4">
        <h2 className="text-sm font-black text-[#1a237e] uppercase tracking-widest text-center">
          Progress Report Upload
        </h2>
        <p className="text-xs text-gray-500 text-center">
          Log your weekly/regular meeting with your allocated students.
        </p>

        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <div>
            <label className={labelClass}>Mentor Name</label>
            <select
              required
              value={form.mentorName}
              onChange={(e) => update("mentorName", e.target.value)}
              className={inputClass}
            >
              <option value="">Select your name</option>
              {mentors.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>Faculty ID (Password)</label>
            <input
              required
              type="password"
              value={form.facultyId}
              onChange={(e) => update("facultyId", e.target.value)}
              className={inputClass}
              placeholder="e.g. TET285"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Meeting Date</label>
              <input
                required
                type="date"
                value={form.meetingDate}
                onChange={(e) => update("meetingDate", e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Meeting Link</label>
              <input
                required
                type="url"
                value={form.meetingLink}
                onChange={(e) => update("meetingLink", e.target.value)}
                className={inputClass}
                placeholder="https://meet.google.com/..."
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>Minutes</label>
            <textarea
              value={form.minutes}
              onChange={(e) => update("minutes", e.target.value)}
              className={inputClass}
              rows={3}
              placeholder="Meeting minutes / notes, or a link to the minutes document"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Present Reg. No</label>
              <textarea
                value={form.presentRegNos}
                onChange={(e) => update("presentRegNos", e.target.value)}
                className={inputClass}
                rows={3}
                placeholder="Comma-separated register numbers"
              />
            </div>
            <div>
              <label className={labelClass}>Absent Reg. No</label>
              <textarea
                value={form.absentRegNos}
                onChange={(e) => update("absentRegNos", e.target.value)}
                className={inputClass}
                rows={3}
                placeholder="Comma-separated register numbers"
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>Report Link</label>
            <input
              required
              type="url"
              value={form.reportLink}
              onChange={(e) => update("reportLink", e.target.value)}
              className={inputClass}
              placeholder="Link to the uploaded report document"
            />
          </div>

          {message && (
            <div
              className={`text-xs rounded-lg px-3 py-2 text-center border ${
                message.type === "success"
                  ? "bg-green-50 border-green-200 text-green-700"
                  : "bg-red-50 border-red-200 text-red-700"
              }`}
            >
              {message.text}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-[#1565c0] hover:bg-[#1255a5] disabled:opacity-50 text-white font-bold py-2.5 rounded-xl text-sm uppercase tracking-widest transition-colors"
          >
            {submitting ? "Submitting…" : "Generate Report"}
          </button>
        </form>
      </div>
    </div>
  );
}
