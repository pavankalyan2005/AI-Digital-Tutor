
# AI Digital Tutor App

This is a full-stack application for the AI Digital Tutor. The project consists of a React-based frontend and an Express-based backend with SQLite.

## Project Structure

- `/src`: Frontend application (React + Vite)
- `/server`: Backend server (Node.js + Express + SQLite)

## Configuration

The application uses Google Gemini AI. Ensure you have a `.env` file in the root directory (and/or `server` directory) with your API key:

```env
GEMINI_API_KEY=your_gemini_api_key_here
```

## Running the App

Start both frontend and backend concurrently:

```bash
npm run dev:all
```

Individual components can also be started separately:

### 1. Setup Backend

Navigate to the `server` directory and install dependencies:

```bash
cd server
npm install
```

Start the backend server:

```bash
npm run dev
```

The backend will run on `http://localhost:5000`.

### 2. Setup Frontend

From the root directory, install dependencies:

```bash
npm install
```

Start the frontend development server:

```bash
npm run dev
```

The frontend will run on `http://localhost:5173`.

## Mobile App (Android)

This project is configured with Capacitor to run as a native Android app.

### **⚠️ Important Note on UI Changes**
Website changes (`/src`) require a **rebuild + sync + reinstall** to appear on a real device or emulator, unless you are using **Live-Reload dev mode**.

### Development (Live-Reload)
To see changes instantly on your device without rebuilding:
1.  Ensure your machine and mobile device are on the same Wi-Fi network.
2.  Run the live-reload script:
    ```bash
    npm run dev:android
    ```
3.  Select your local IP address when prompted. The app will now reload automatically whenever you save a file in `/src`.

### Production / Release Cycle
To create a final build and sync it to the Android project:
```bash
npm run release:android
```
Then, in **Android Studio**, click the **Run** button to install the updated app.

### Android Setup
...

### Mobile Backend Connection

When running on a physical Android device or emulator, `localhost` refers to the device itself. To connect to the backend running on your machine:

1.  Find your machine's local IP address (e.g., `192.168.x.x`).
2.  Update your `.env` file to include the base URL for the API:
    ```env
    VITE_API_BASE_URL=http://192.168.x.x:5000
    ```
3.  Rebuild the project and sync Capacitor.

## Features

- **Personalized Learning Paths:** AI-driven course recommendations.
- **AI Tutor Chat:** Real-time assistance and debugging help.
- **Coding Arena:** Interactive practice with real-time feedback.
- **Progress Tracking:** Gamified experience with points and levels.
- **Modern UI:** Built with Tailwind CSS and Radix UI components.
