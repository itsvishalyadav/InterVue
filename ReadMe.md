# InterVue: The Ultimate AI-Powered Mock Interview Platform 🚀

InterVue is an advanced, fully-featured AI mock interview platform that helps candidates prepare for their dream jobs. The platform provides a hyper-realistic interview environment complete with AI voice support, realtime proctoring, a built-in code execution sandbox, resume ATS scoring, and comprehensive feedback generation.

## 🌟 Key Features

*   **Resume ATS Scoring & Analysis**: Upload your PDF resume, specify a target role/job description, and get immediate ATS feedback (Keyword, Skills, Experience formatting) powered by AI.
*   **Hyper-Realistic AI Voice Interviews**: Supports interactive conversation allowing candidates to respond naturally, while the AI parses answers and asks follow-ups based on the role and experience level.
*   **Built-in Code Sandbox**: Fully integrated Monaco editor with a backend code runner, capable of compiling and running user solutions during technical interviews.
*   **Real-time AI Proctoring**: Face tracking technology utilizing Google's MediaPipe ensures candidates stay focused during the interview. Alerts are triggered for multiple faces or looking away.
*   **Deep Performance Analytics**: After the interview, users receive a detailed PDF-exportable report covering correctness, communication, and overall feedback for each question.
*   **Personalization & Adaptive AI**: Question sets are intelligently generated from user resumes (Projects & Experience) mixed with behavioral and technical role-based requirements utilizing models like Qwen 2.5 Coder via OpenRouter config.
*   **Payment & Tiered Credits System**: Razorpay is implemented out of the box to offer Starter (500 credits) and Pro packs (2000 credits).

---

## 🛠️ Tech Stack

### Frontend (Client)
*   **Framework**: [React 19](https://react.dev/) with [Vite](https://vitejs.dev/)
*   **Styling**: [Tailwind CSS v4](https://tailwindcss.com/) & [Framer Motion](https://www.framer.com/motion/) (For stunning, interactive UI)
*   **State Management**: [Redux Toolkit](https://redux-toolkit.js.org/)
*   **Code Editor**: [@monaco-editor/react](https://github.com/suren-atoyan/monaco-react)
*   **Webcam / AI Proctoring**: [@mediapipe/tasks-vision](https://developers.google.com/mediapipe)
*   **Authentication**: [Firebase](https://firebase.google.com/)
*   **PDF Generation & Parsing**: `jspdf`, `jspdf-autotable`

### Backend (Server)
*   **Framework**: [Express.js](https://expressjs.com/) (Node.js ecosystem)
*   **Database**: [MongoDB](https://www.mongodb.com/) via Mongoose
*   **AI Integration**: [OpenRouter API](https://openrouter.ai/) (Utilizes `qwen-2.5-coder-7b-instruct` for question generation, `gpt-4o-mini` for Resume & ATS analysis)
*   **Payments**: [Razorpay](https://razorpay.com/) SDK
*   **File Handling / ATS**: `multer` and `pdfjs-dist` to securely ingest and parse applicant resumes in-memory.

---

## 📂 Project Structure

```text
InterVue/
├── Client/                  # React + Vite Frontend
│   ├── src/
│   │   ├── components/      # UI components (Navbar, Step1SetUp, Proctoring, etc.)
│   │   ├── pages/           # High-level views (Home, Interview, Pricing, History)
│   │   ├── redux/           # Slice files & Redux store setup
│   │   └── App.jsx          # Route declarations
│   └── package.json
│
└── server/                  # Node + Express Backend
    ├── controllers/         # Request handling logically grouped (user, interview, auth)
    ├── models/              # Mongoose DB schema definitions
    ├── routes/              # Express API Routes
    ├── services/            # ATS / OpenRouter AI handling logic
    ├── index.js             # Root server initialization
    └── package.json
```

---

## 💻 Running Locally

### Prerequisites
Make sure you have [Node.js](https://nodejs.org/) installed along with MongoDB (local or Atlas) and API keys for Firebase, OpenRouter, and Razorpay.

### 1. Clone the repository

```bash
git clone https://github.com/itsvishalyadav/InterVue.git
cd InterVue
```

### 2. Setup the Backend Environment
Navigate to the `server/` directory and install dependencies:

```bash
cd server
npm install
```

Create a `.env` file in the `server` directory and configure the following variables:
```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_strong_secret
OPENROUTER_API_KEY=your_openrouter_api_key

# Razorpay Config (Required for the pricing page to work)
RAZORPAY_KEY_ID=your_razorpay_key
RAZORPAY_KEY_SECRET=your_razorpay_secret
```

Start the backend logic:
```bash
npm run dev
```

### 3. Setup the Frontend Environment
Open a new terminal window / tab, navigate to the `Client/` directory and install dependencies:

```bash
cd Client
npm install
```

Create a `.env` file in the `Client` directory for your frontend API keys:
```env
# InterVue Backend URL
VITE_SERVER_URL=http://localhost:5000

# Firebase Config
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id

# Razorpay Config (Used for frontend checkout instantiation)
VITE_RAZORPAY_KEY_ID=your_razorpay_key
```

Run the Vite development server:
```bash
npm run dev
```

### 4. Let's Go!
The frontend will likely run on `http://localhost:5173`. Open this URL in Chrome or Edge (recommended for best speech API & MediaPipe compatibility).

---

## 🚀 Deployment

**Backend**: Services like Render, Railway, or Heroku work flawlessly. Set the environment variables accordingly in their respective dashboards.
**Frontend**: Easily deployable to Vercel, Netlify, or Firebase Hosting. Ensure your built assets correctly know the production `VITE_SERVER_URL`.

**Important**: Because the interview process utilizes browser-native specific Speech Recognition (`webkitSpeechRecognition`), please ensure endpoints are served over `https://` in production, as Chrome refuses microphone access on non-secure origins!

---

## 🤝 Contributing

Contributions, issues, and feature requests are always welcome! Feel free to check the issues page or submit PRs directly.

## 📝 License
This project is open-sourced software licensed under the MIT License.
