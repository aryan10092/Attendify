# Mobile Classroom Assistant

A cross-platform mobile app built with Expo and React Native that provides student and teacher features such as class lists, attendance management, and an AI assistant chatbot.

## Demo Video

https://github.com/user-attachments/assets/1c913a47-3294-4adc-b45c-91cd76f3ffd2

## Features

- Student and teacher dashboards
- AI assistant chat (chatbot) integrated with the project's backend
- Class management and attendance marking/checking
- Local storage for user session data
- BLE utilities included for device interactions

## Tech Stack

- Expo (Managed + Dev Client)
- React Native
- TypeScript
- Supabase for backend data
- NativeWind / Tailwind CSS for styling
- Lottie for animations

## Prerequisites

- Node.js (LTS recommended)
- Yarn or npm
- Expo CLI (optional, recommended globally):

```bash
npm install -g expo-cli
```

- For iOS builds: Xcode (macOS only)
- For Android builds: Android Studio / SDK

## Setup

1. Install dependencies:

```bash
npm install
# or
# yarn install
```

2. Configure environment and backend keys:

- Create a `.env` or update your config with Supabase URL and anon key as used in `lib/supabase.tsx` or `utils/supabase.ts`.
- Ensure your Supabase project has `students` and other required tables.

## Run (Development)

Open the project root and run the development server (dev client):

```bash
npm run start
```

To run on a device or emulator:

```bash
npm run android
npm run ios
```

Run web version:

```bash
npm run web

```

## Project Structure (key files)

- `app/` - Expo Router pages and screens
  - `student/` - Student-facing screens (dashboard, AI, attendance)
  - `teacher/` - Teacher-facing screens and class management
- `lib/` and `utils/` - Supabase client and helper utilities
- `components/` - Reusable UI components
- `assets/` - Images and Lottie animations
- `store/` - Global state management

## Usage

- Launch the app and choose a role (student or teacher)
- Students can view classes, use the AI assistant, and check attendance
- Teachers can create classes, view present students, and mark attendance
- The AI assistant uses the student's profile (skills/interests) to provide context-aware responses
