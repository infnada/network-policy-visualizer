import React, { useState, useEffect } from "react";

/**
 * Theme toggle component that switches between light and dark (cyberpunk) themes
 *
 * @param {Object} props
 * @param {String} props.theme - Current theme ('light' or 'dark')
 * @param {Function} props.setTheme - Function to set the theme
 * @returns {JSX.Element}
 */
const ThemeToggle = ({ theme, setTheme }) => {
  // Animation state for smoother icon transitions
  const [isAnimating, setIsAnimating] = useState(false);

  // Toggle between light and dark themes
  const toggleTheme = () => {
    setIsAnimating(true);
    setTimeout(() => {
      setTheme(theme === "light" ? "dark" : "light");
      setIsAnimating(false);
    }, 300);
  };

  return (
    <div className="absolute top-4 right-20 z-10">
      <button
        onClick={toggleTheme}
        className={`flex items-center justify-center w-12 h-12 rounded-full shadow-lg transition-all duration-300 ${
          theme === "light"
            ? "bg-blue-100 hover:bg-blue-200 text-blue-600"
            : "bg-purple-900 hover:bg-purple-800 text-cyan-400 border border-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.6)]"
        }`}
        aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
      >
        <div
          className={`transition-transform duration-300 ${isAnimating ? "scale-0" : "scale-100"}`}
        >
          {theme === "light" ? (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
            </svg>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2" />
              <path d="M12 20v2" />
              <path d="m4.93 4.93 1.41 1.41" />
              <path d="m17.66 17.66 1.41 1.41" />
              <path d="M2 12h2" />
              <path d="M20 12h2" />
              <path d="m6.34 17.66-1.41 1.41" />
              <path d="m19.07 4.93-1.41 1.41" />
            </svg>
          )}
        </div>
      </button>
    </div>
  );
};

export default ThemeToggle;
