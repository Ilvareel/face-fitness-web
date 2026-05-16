export type LessonBlock =
  | {
      type: "video";
      title: string;
      videoId: string;
      duration?: string;
    }
  | {
      type: "html";
      title: string;
      materialId: string;
    };

export type CourseLesson = {
  slug: string;
  number: number;
  title: string;
  category: string;
  description: string;

  blocks: LessonBlock[];
};

export const courseLessons: CourseLesson[] = [
  {
    slug: "welcome-course-overview",
    number: 1,
    title: "Welcome & Course Overview",
    category: "Start Here",
    description:
      "Introduction to the Facial Volume Harmony system and how to work through the lessons.",

    blocks: [
      {
        type: "video",
        title: "Welcome introduction",
        videoId: "welcome-intro",
        duration: "6 min",
      },

      {
        type: "html",
        title: "Course overview",
        materialId: "fvh-welcome",
      },
    ],
  },

  {
    slug: "preparation-safety-principles",
    number: 2,
    title: "Preparation & Safety Principles",
    category: "Foundations",
    description:
      "Important preparation notes, safety guidance, and technical recommendations before beginning practical lessons.",

    blocks: [
      {
        type: "html",
        title: "Preparation & Safety Principles",
        materialId: "lesson-1",
      },
    ],
  },

  {
    slug: "foundation-practice",
    number: 3,
    title: "Foundation Practice",
    category: "Practice",
    description:
      "Core foundation massage and lifting techniques.",

    blocks: [
      {
        type: "video",
        title: "Foundation practice — Part 1",
        videoId: "foundation-01",
        duration: "12 min",
      },

      {
        type: "video",
        title: "Foundation practice — Part 2",
        videoId: "foundation-02",
        duration: "9 min",
      },

      {
        type: "html",
        title: "Practice notes",
        materialId: "lesson-2",
      },
    ],
  },
];