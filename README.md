Code X-Ray 🩻
Turn code screenshots into interactive learning blueprints using Google's Gemini Vision AI.
Code X-Ray is a beginner-friendly React application that allows users to upload a screenshot of programming code and instantly receive a comprehensive, educational breakdown. It goes beyond simple OCR (Optical Character Recognition) by actively explaining how the code works, identifying syntax rules, and warning against common beginner mistakes.
🌟 Features
📷 Smart Code Extraction: Accurately reads code from uploaded screenshots (JPEG, PNG, WEBP) using advanced Vision AI.
🧠 Step-by-Step Execution: Breaks down the extracted code line-by-line, explaining what the computer is doing in plain English.
⚠️ Beginner Pitfalls: Identifies common mistakes beginners make with the specific code shown and provides actionable fixes.
🏗️ Syntax Blueprint: Maps out structural elements (whitespace, operators, variable definitions) just like an architectural blueprint.
📖 Formal Schema Glossary: Translates informal coding jargon (e.g., "quotes", "space") into formal programming terminology with beginner-friendly definitions.
📋 One-Click Copy: Easily copy the extracted code to your clipboard for testing.
🛠️ Tech Stack
Frontend: React.js
Styling: Tailwind CSS
Icons: Lucide-React
AI / LLM: Google Gemini API (gemini-2.5-flash-preview-09-2025 model)
🚀 Getting Started
Follow these instructions to get a copy of the project up and running on your local machine.
Prerequisites
You will need Node.js installed on your machine, along with a package manager like npm or yarn.
Installation
Clone the repository:
git clone https://github.com/your-username/code-x-ray.git
cd code-x-ray


Quick Setup (If you don't have a React environment ready):
We recommend using Vite to spin up a fast environment.
npm create vite@latest . -- --template react
npm install
npm install lucide-react tailwindcss

(Be sure to configure Tailwind in your tailwind.config.js and index.css as per their documentation).
Add the component:
Place the CodeXRay.jsx component into your src directory and render it in your main App.jsx file.
🔑 Setting up the Gemini API Key (Crucial Step)
This application relies on the Google Gemini API to analyze images. It will not work without an API key.
Go to Google AI Studio.
Create a new API key (it's free!).
Open your component file (CodeXRay.jsx) in your code editor.
Locate the analyzeCodeImage function (around line 72).
Paste your API key into the empty string:
const apiKey = "YOUR_ACTUAL_API_KEY_HERE"; 


Running the App
npm run dev
# or npm start if using Create React App


🔒 Security Note regarding API Keys
For educational and portfolio purposes, the API key in this project is handled directly on the frontend React component.
If you intend to deploy this application to a public production environment (like Vercel or Netlify) where real users will access it, do not commit your API key to GitHub. You should move the API call to a secure backend server (like Node/Express) or use secure Environment Variables (import.meta.env.VITE_GEMINI_API_KEY), otherwise, visitors can inspect the network tab and steal your API key.
🤝 Contributing
Contributions, issues, and feature requests are welcome! Feel free to check the issues page.
📝 License
This project is open source and available under the MIT License.

