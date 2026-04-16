# GIKI Course Hub

A playful and colorful academic resource web application built with React, Vite, and Tailwind CSS.

## Features

- 📚 **Organized Resources**: Browse resources by Semester → Course → Instructor → Category
- 🔍 **Global Search**: Search across semesters, courses, instructors, and files
- ⭐ **Ratings**: View and rate resources
- 💾 **Save Favorites**: Bookmark your favorite resources
- 📝 **Contribute**: Share your own notes and resources
- 🎨 **Playful Design**: Vibrant gradients and colorful UI
- 📱 **Responsive**: Works on all devices

## Tech Stack

- **React** with TypeScript
- **Vite** for fast development
- **Tailwind CSS** for styling
- **React Router DOM** for routing
- **Lucide React** for icons
- **Context API** for state management

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Open your browser and navigate to `http://localhost:5173`

### Build for Production

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## Project Structure

```
src/
├── components/       # Reusable components
│   ├── layout/      # Layout components (Sidebar, TopBar)
│   ├── navigation/  # Navigation components
│   ├── course/      # Course-related components
│   ├── resource/    # Resource components
│   └── contribution/ # Contribution form
├── pages/           # Page components
├── context/         # Context providers
├── data/           # Mock data
├── types/          # TypeScript types
└── utils/          # Utility functions
```

## Navigation Flow

```
Home → Semesters → Courses → Instructors → Resource Dashboard → File List
```

## Features in Detail

### Global Search
Search across all semesters, courses, instructors, and files. Results appear in a dropdown with categorized results.

### Quote of the Day
Each course page displays an inspirational quote that rotates daily based on the course subject.

### Contribution
Users can contribute resources by selecting semester, course, and instructor (or adding a new one), then uploading a file.

### Saved Items
Bookmark your favorite resources for quick access later. Saved items persist in localStorage.

## Mock Data

The application uses mock data located in `src/data/mockData.ts`. This includes:
- 8 semesters
- Multiple courses per semester
- Multiple instructors per course
- Resource categories (Quizzes, Assignments, Books, Notes, Past Papers)
- File metadata with ratings

## Color Scheme

The app uses a vibrant, playful color palette:
- Purple-Pink gradients
- Cyan-Blue gradients
- Orange-Yellow gradients
- Green-Emerald gradients
- Rainbow gradients for special elements

## License

This project is created for educational purposes.
