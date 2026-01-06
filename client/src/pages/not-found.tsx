import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Home, Search, ArrowLeft, BookOpen } from "lucide-react";
import { PageMeta } from "@/components/seo/PageMeta";
import { useEffect, useState } from "react";

export default function NotFound() {
  const [floatingBooks, setFloatingBooks] = useState<number[]>([]);

  useEffect(() => {
    // Generate random positions for floating books
    setFloatingBooks(Array.from({ length: 6 }, (_, i) => i));
  }, []);

  return (
    <>
      <PageMeta
        title="404 - Page Not Found"
        description="The page you're looking for doesn't exist."
      />
      <div className="relative min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-teal-50 via-white to-ochre-50 overflow-hidden">
        {/* Animated floating books in background */}
        {floatingBooks.map((book, index) => (
          <div
            key={book}
            className="absolute opacity-10 pointer-events-none"
            style={{
              left: `${10 + index * 15}%`,
              top: `${20 + (index % 3) * 25}%`,
              animation: `float ${3 + (index % 3)}s ease-in-out infinite`,
              animationDelay: `${index * 0.5}s`,
            }}
          >
            <BookOpen
              className="text-teal-600"
              size={40 + (index % 3) * 20}
            />
          </div>
        ))}

        {/* Main content */}
        <div className="relative z-10 w-full max-w-2xl mx-4 text-center px-4">
          {/* Animated 404 number */}
          <div className="mb-8">
            <h1
              className="text-9xl md:text-[12rem] font-bold text-transparent bg-clip-text bg-gradient-to-r from-teal-600 to-ochre-500 animate-pulse"
              style={{
                fontFamily: "'Outfit', sans-serif",
                animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite, fadeIn 0.5s ease-out",
              }}
            >
              404
            </h1>
          </div>

          {/* Animated book icon */}
          <div className="mb-6 flex justify-center">
            <div
              className="relative"
              style={{
                animation: "bounce 1s ease-in-out infinite",
              }}
            >
              <BookOpen className="w-20 h-20 text-teal-600" strokeWidth={1.5} />
              <div
                className="absolute inset-0 bg-teal-400 rounded-full blur-xl opacity-20"
                style={{
                  animation: "ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite",
                }}
              />
            </div>
          </div>

          {/* Message */}
          <div
            className="mb-8 space-y-4"
            style={{
              animation: "slideUp 0.6s ease-out 0.2s both",
            }}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
              Oops! This Page is Lost
            </h2>
            <p className="text-lg text-gray-600 max-w-md mx-auto">
              Looks like this book has been checked out or never existed in our library.
              Let's help you find your way back!
            </p>
          </div>

          {/* Action buttons */}
          <div
            className="flex flex-col sm:flex-row gap-4 justify-center items-center"
            style={{
              animation: "slideUp 0.6s ease-out 0.4s both",
            }}
          >
            <Link href="/">
              <Button
                size="lg"
                className="gap-2 bg-teal-600 hover:bg-teal-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
              >
                <Home className="w-5 h-5" />
                Back to Home
              </Button>
            </Link>

            <Link href="/marketplace">
              <Button
                size="lg"
                variant="outline"
                className="gap-2 border-2 border-teal-600 text-teal-600 hover:bg-teal-50 shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105"
              >
                <Search className="w-5 h-5" />
                Browse Books
              </Button>
            </Link>
          </div>

          {/* Additional help text */}
          <div
            className="mt-12"
            style={{
              animation: "fadeIn 0.6s ease-out 0.6s both",
            }}
          >
            <button
              onClick={() => window.history.back()}
              className="inline-flex items-center gap-2 text-gray-600 hover:text-teal-600 transition-colors duration-200 group"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform duration-200" />
              <span className="text-sm">Go back to previous page</span>
            </button>
          </div>
        </div>

        {/* Custom animations */}
        <style>{`
          @keyframes float {
            0%, 100% {
              transform: translateY(0) rotate(0deg);
            }
            50% {
              transform: translateY(-20px) rotate(5deg);
            }
          }

          @keyframes fadeIn {
            from {
              opacity: 0;
            }
            to {
              opacity: 1;
            }
          }

          @keyframes slideUp {
            from {
              opacity: 0;
              transform: translateY(30px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          @keyframes bounce {
            0%, 100% {
              transform: translateY(0);
            }
            50% {
              transform: translateY(-10px);
            }
          }

          @keyframes ping {
            75%, 100% {
              transform: scale(1.5);
              opacity: 0;
            }
          }
        `}</style>
      </div>
    </>
  );
}
