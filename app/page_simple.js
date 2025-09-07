"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";

const API_BASE_URL = "http://localhost/Enguio_Project/Api/backend.php";

export default function LoginFormSimple() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showCaptcha, setShowCaptcha] = useState(false);
  const [captchaQuestion, setCaptchaQuestion] = useState("");
  const [captchaAnswer, setCaptchaAnswer] = useState("");
  const [captchaInput, setCaptchaInput] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Generate captcha when component mounts
  useEffect(() => {
    generateCaptcha();
  }, []);

  const generateCaptcha = async () => {
    try {
      const response = await axios.post(API_BASE_URL, {
        action: "generate_captcha"
      });
      
      if (response.data.success) {
        setCaptchaQuestion(response.data.question);
        setCaptchaAnswer(response.data.answer.toString());
        console.log("Generated captcha:", response.data.question, "Answer:", response.data.answer);
      }
    } catch (err) {
      console.error("Error generating captcha:", err);
      // Fallback captcha if API fails
      const num1 = Math.floor(Math.random() * 10) + 1;
      const num2 = Math.floor(Math.random() * 10) + 1;
      setCaptchaQuestion(`What is ${num1} + ${num2}?`);
      setCaptchaAnswer((num1 + num2).toString());
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // Client-side validation
    if (!username.trim() || !password.trim()) {
      setError("Both username and password are required");
      return;
    }

    // If this is the first login attempt, show captcha
    if (!showCaptcha) {
      setShowCaptcha(true);
      return;
    }

    // Validate captcha
    if (!captchaInput.trim()) {
      setError("Please complete the captcha");
      return;
    }

    setLoading(true);

    try {
      console.log("Sending login request with:", {
        username,
        password,
        captcha: captchaInput,
        captchaAnswer
      });

      const res = await axios.post(API_BASE_URL, {
        action: "login",
        username: username,
        password: password,
        captcha: captchaInput,
        captchaAnswer: captchaAnswer
      });

      console.log("Login response:", res.data);

      if (res.data.success) {
        const role = res.data.role;

        // Redirect based on role
        switch (role) {
          case "admin":
            router.push("/admin");
            break;
          case "cashier":
            router.push("/cashier");
            break;
          case "pharmacist":
            router.push("/pharmacist");
            break;
          case "inventory":
            router.push("/Inventory_Con");
            break;
          default:
            setError("Unauthorized role.");
        }
      } else {
        setError(res.data.message || "Invalid username or password.");
        setPassword(""); // Clear password field on error
        setCaptchaInput(""); // Clear captcha input
        generateCaptcha(); // Generate new captcha
      }
    } catch (err) {
      console.error("Login error:", err);
      setError("An unexpected error occurred. Please check your connection.");
      setPassword(""); // Clear password field on error
      setCaptchaInput(""); // Clear captcha input
      generateCaptcha(); // Generate new captcha
    } finally {
      setLoading(false);
    }
  };

  const handleTryAgain = () => {
    setShowCaptcha(false);
    setCaptchaInput("");
    setError("");
    generateCaptcha();
  };

  const handleBackToLogin = () => {
    setShowCaptcha(false);
    setCaptchaInput("");
    setError("");
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-teal-400 to-blue-500">
      <div className="w-full max-w-md">
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-xl shadow-2xl p-8 space-y-6"
        >
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-800 mb-2">Welcome Back</h2>
            <p className="text-gray-600">Please sign in to your account</p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-600 text-center text-sm">{error}</p>
            </div>
          )}

          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
              Username
            </label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              disabled={showCaptcha}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 transition-colors"
              placeholder="Enter your username"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={showCaptcha}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 transition-colors"
              placeholder="Enter your password"
            />
          </div>

          {showCaptcha && (
            <div className="p-6 bg-blue-50 rounded-lg border border-blue-200">
              <div className="text-center mb-4">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Security Verification</h3>
                <p className="text-sm text-gray-600">Please complete this security check</p>
              </div>
              
              <div className="bg-white p-4 rounded-lg border border-blue-300 mb-4">
                <p className="text-center text-lg font-medium text-gray-800">{captchaQuestion}</p>
                <p className="text-center text-xs text-gray-500 mt-1">Debug: Answer is {captchaAnswer}</p>
              </div>
              
              <input
                type="text"
                value={captchaInput}
                onChange={(e) => setCaptchaInput(e.target.value)}
                placeholder="Enter your answer"
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mb-3"
              />
              
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={handleTryAgain}
                  className="flex-1 px-4 py-2 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded-lg transition-colors"
                >
                  New Question
                </button>
                <button
                  type="button"
                  onClick={handleBackToLogin}
                  className="flex-1 px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Back
                </button>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-3 text-white bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-lg shadow-lg"
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Logging in...
              </div>
            ) : showCaptcha ? (
              "Verify & Sign In"
            ) : (
              "Continue"
            )}
          </button>

          <div className="text-center">
            <p className="text-xs text-gray-500">
              Secure login with captcha verification
            </p>
          </div>
        </form>
      </div>
    </div>
  );
} 