"use client";

import {
  MessageCircle,
  MessageSquareText,
  MessagesSquare,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";

export interface HelpCenterProps {
  title?: string;
  subtitle?: string;
  askButtonText?: string;
  whatsappUrl?: string;
  whatsappTitle?: string;
  whatsappSubtitle?: string;
  contactTitle?: string;
  contactSubtitle?: string;
  onContactClick?: () => void;
  className?: string;
}

export function HelpCenter({
  title = "Help Center?",
  subtitle = "Book an appointment with our design experts for customisation",
  askButtonText = "Ask a question",
  whatsappUrl = "https://wa.me/918976897691",
  whatsappTitle = "WhatsApp Chat",
  whatsappSubtitle = "Chat with an expert directly",
  contactTitle = "Contact Form",
  contactSubtitle = "Send us a detailed message",
  onContactClick,
  className = "",
}: HelpCenterProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsModalOpen(false);
    };
    if (isModalOpen) window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [isModalOpen]);

  const handleContactFormClick = () => {
    setIsModalOpen(false);
    if (onContactClick) {
      onContactClick();
      return;
    }
    // Dispatch event to switch reviews tab to Questions & Answers and scroll
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("spree:reviews:open-questions"));
      const tabsEl =
        document.getElementById("reviews-tabs") ||
        document.querySelector("[data-reviews-tabs]") ||
        document.getElementById("product-reviews-section") ||
        document.getElementById("reviews");
      if (tabsEl) {
        const y = tabsEl.getBoundingClientRect().top + window.scrollY - 80;
        window.scrollTo({ top: y, behavior: "smooth" });
      }
    }
  };

  return (
    <div className={`mt-8 pt-8 ${className}`}>
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 mt-0.5">
          <MessagesSquare className="w-6 h-6 text-gray-900" strokeWidth={1.5} />
        </div>
        <div>
          <h4 className="text-base font-medium text-gray-900 m-0 mb-1">
            {title}
          </h4>
          <p className="text-sm text-gray-500 m-0 mb-3">{subtitle}</p>
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="text-sm font-medium text-gray-900 underline underline-offset-4 hover:text-black transition-colors cursor-pointer"
          >
            {askButtonText}
          </button>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div
            className="absolute inset-0"
            onClick={() => setIsModalOpen(false)}
          />

          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md relative z-10 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-white">
              <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2 m-0">
                <MessageSquareText className="w-5 h-5" />
                {askButtonText}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors outline-none cursor-pointer"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6 bg-gray-50/50">
              <p className="text-gray-600 mb-6 mt-0 text-sm">
                Choose how you'd like to reach out to our team of experts. We
                typically respond within a few hours.
              </p>

              <div className="flex flex-col gap-3">
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-between p-4 bg-white border border-green-200 rounded-xl hover:border-green-400 hover:shadow-sm transition-all group no-underline"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center text-green-600 group-hover:bg-green-500 group-hover:text-white transition-colors">
                      <MessageCircle className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900 text-sm m-0">
                        {whatsappTitle}
                      </h4>
                      <p className="text-xs text-gray-500 m-0">
                        {whatsappSubtitle}
                      </p>
                    </div>
                  </div>
                  <span className="text-green-600 font-medium text-sm">
                    Open
                  </span>
                </a>

                <button
                  type="button"
                  onClick={handleContactFormClick}
                  className="w-full flex items-center justify-between p-4 bg-white border border-gray-200 rounded-xl hover:border-gray-400 hover:shadow-sm transition-all group cursor-pointer text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-600 group-hover:bg-gray-900 group-hover:text-white transition-colors">
                      <MessageSquareText className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900 text-sm m-0">
                        {contactTitle}
                      </h4>
                      <p className="text-xs text-gray-500 m-0">
                        {contactSubtitle}
                      </p>
                    </div>
                  </div>
                  <span className="text-gray-900 font-medium text-sm">Ask</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
