"use client";

import { CheckCircle2, MessageSquareText, Send, X } from "lucide-react";
import { useEffect, useState } from "react";

export interface AskQuestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  productName: string;
  productId?: string;
  onSubmitQuestion?: (data: {
    name: string;
    email: string;
    question: string;
  }) => Promise<void>;
}

export function AskQuestionModal({
  isOpen,
  onClose,
  productName,
  productId,
  onSubmitQuestion,
}: AskQuestionModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [question, setQuestion] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !submitting) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener("keydown", handleEsc);
      document.body.style.overflow = "hidden";
    }
    return () => {
      window.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, submitting, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim() || !email.trim() || !question.trim()) {
      setError("Please fill out your name, email address, and question.");
      return;
    }

    setSubmitting(true);
    try {
      if (onSubmitQuestion) {
        await onSubmitQuestion({
          name: name.trim(),
          email: email.trim(),
          question: question.trim(),
        });
      } else if (productId) {
        const res = await fetch(
          `/api/v3/store/products/${encodeURIComponent(productId)}/reviews/ask_question`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              name: name.trim(),
              email: email.trim(),
              question: question.trim(),
            }),
          },
        );

        if (!res.ok) {
          const body = await res.json().catch(() => null);
          throw new Error(
            body?.error || "Failed to submit question. Please try again.",
          );
        }
      }

      setSubmitted(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "An unexpected error occurred. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetAndClose = () => {
    setName("");
    setEmail("");
    setQuestion("");
    setSubmitted(false);
    setError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 sm:p-6 overflow-y-auto">
      <div className="fixed inset-0" onClick={handleResetAndClose} />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="ask-question-title"
        className="relative z-10 w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden flex flex-col my-auto border border-neutral-100 animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/60">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-neutral-900 text-white">
              <MessageSquareText className="w-4 h-4" />
            </div>
            <div>
              <h3
                id="ask-question-title"
                className="text-base font-bold text-neutral-900 m-0"
              >
                Ask a Question
              </h3>
              <p className="text-xs text-neutral-500 m-0 line-clamp-1 max-w-[280px] sm:max-w-xs">
                {productName}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleResetAndClose}
            className="w-8 h-8 rounded-full hover:bg-neutral-200/70 flex items-center justify-center transition-colors text-neutral-500 hover:text-neutral-800 cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          {submitted ? (
            <div className="py-6 text-center space-y-4">
              <div className="w-14 h-14 mx-auto rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h4 className="text-lg font-bold text-neutral-900 m-0">
                  Question Submitted!
                </h4>
                <p className="text-sm text-neutral-600 max-w-sm mx-auto m-0">
                  Thank you! We have received your inquiry regarding{" "}
                  <strong>{productName}</strong>. Our support team will reply
                  directly to your email.
                </p>
              </div>
              <div className="pt-3">
                <button
                  type="button"
                  onClick={handleResetAndClose}
                  className="rounded-full bg-neutral-900 hover:bg-neutral-800 text-white font-medium px-6 py-2.5 text-sm transition cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 rounded-lg bg-red-50 text-red-700 text-xs border border-red-200">
                  {error}
                </div>
              )}

              <div>
                <label
                  htmlFor="question-name"
                  className="block text-xs font-semibold text-neutral-700 mb-1"
                >
                  Your Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="question-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="w-full px-3.5 py-2 text-sm rounded-lg border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent transition"
                />
              </div>

              <div>
                <label
                  htmlFor="question-email"
                  className="block text-xs font-semibold text-neutral-700 mb-1"
                >
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  id="question-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. john@example.com"
                  className="w-full px-3.5 py-2 text-sm rounded-lg border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent transition"
                />
                <p className="text-[11px] text-neutral-400 mt-1">
                  We will send our response to this email address.
                </p>
              </div>

              <div>
                <label
                  htmlFor="question-text"
                  className="block text-xs font-semibold text-neutral-700 mb-1"
                >
                  Your Question <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="question-text"
                  required
                  rows={4}
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="What would you like to know about this item (sizing, material, delivery, customisation)?"
                  className="w-full px-3.5 py-2 text-sm rounded-lg border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent transition resize-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={handleResetAndClose}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-neutral-600 hover:text-neutral-900 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 rounded-full bg-neutral-900 hover:bg-neutral-800 disabled:bg-neutral-400 text-white font-semibold px-6 py-2.5 text-sm transition shadow-xs cursor-pointer"
                >
                  {submitting ? (
                    "Sending..."
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      Submit Question
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
