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
    number: 0,
    title: "Welcome & Course Overview",
    category: "Start Here",
    description:
      "Introduction to the Facial Volume Harmony system and how to work through the lessons.",
    blocks: [
      {
        type: "html",
        title: "Course overview",
        materialId: "fvh-welcome",
      },
    ],
  },
  {
    slug: "lesson-1",
    number: 1,
    title: "Lesson 1",
    category: "Foundations",
    description: "Lesson material for the first part of the Facial Volume Harmony course.",
    blocks: [
      {
        type: "html",
        title: "Lesson 1 material",
        materialId: "lesson-1",
      },
    ],
  },
  {
    slug: "lesson-2",
    number: 2,
    title: "Lesson 2",
    category: "Foundations",
    description: "Technical guidelines and preparation before the practical lessons.",
    blocks: [
      {
        type: "html",
        title: "Lesson 2 material",
        materialId: "lesson-2",
      },
    ],
  },
  {
    slug: "lesson-3",
    number: 3,
    title: "Lesson 3",
    category: "Practice",
    description: "Guided practice video and supporting lesson material.",
    blocks: [
      {
        type: "video",
        title: "Lesson 3 video",
        videoId: "29eed2baa8606bef777ad88be72319c7",
      },
      {
        type: "html",
        title: "Lesson 3 material",
        materialId: "lesson-3",
      },
    ],
  },
  {
    slug: "lesson-4",
    number: 4,
    title: "Lesson 4",
    category: "Practice",
    description: "Guided practice video and supporting lesson material.",
    blocks: [
      {
        type: "video",
        title: "Lesson 4 video",
        videoId: "42842ef8c20f6f84ff19fac1c1073b5f",
      },
      {
        type: "html",
        title: "Lesson 4 material",
        materialId: "lesson-4",
      },
    ],
  },
  {
    slug: "lesson-5",
    number: 5,
    title: "Lesson 5",
    category: "Practice",
    description: "Guided practice video and supporting lesson material.",
    blocks: [
      {
        type: "video",
        title: "Lesson 5 video",
        videoId: "b233d34c997199a73bfb0654cde07467",
      },
      {
        type: "html",
        title: "Lesson 5 material",
        materialId: "lesson-5",
      },
    ],
  },
  {
    slug: "lesson-6",
    number: 6,
    title: "Lesson 6",
    category: "Practice",
    description: "Two guided practice videos and supporting lesson material.",
    blocks: [
      {
        type: "video",
        title: "Lesson 6 video — Part 1",
        videoId: "439667c8a2ba073f18f624fd87e53f35",
      },
      {
        type: "video",
        title: "Lesson 6 video — Part 2",
        videoId: "7ae541eb31ce3ca73048a8d60894d947",
      },
      {
        type: "html",
        title: "Lesson 6 material",
        materialId: "lesson-6",
      },
    ],
  },
  {
    slug: "lesson-7",
    number: 7,
    title: "Lesson 7",
    category: "Practice",
    description: "Supporting lesson material for this step of the course.",
    blocks: [
      {
        type: "html",
        title: "Lesson 7 material",
        materialId: "lesson-7",
      },
    ],
  },
  {
    slug: "lesson-8",
    number: 8,
    title: "Lesson 8",
    category: "Practice",
    description: "Supporting lesson material for this step of the course.",
    blocks: [
      {
        type: "html",
        title: "Lesson 8 material",
        materialId: "lesson-8",
      },
    ],
  },
  {
    slug: "lesson-9",
    number: 9,
    title: "Lesson 9",
    category: "Practice",
    description: "Two guided practice videos and supporting lesson material.",
    blocks: [
      {
        type: "video",
        title: "Lesson 9 video — Part 1",
        videoId: "90a487ffb7db6c1fdc7bba5abfa54e44",
      },
      {
        type: "video",
        title: "Lesson 9 video — Part 2",
        videoId: "e3bbbbdbe9c1aa901ebc4ec90547e7e1",
      },
      {
        type: "html",
        title: "Lesson 9 material",
        materialId: "lesson-9",
      },
    ],
  },
  {
    slug: "lesson-10",
    number: 10,
    title: "Lesson 10",
    category: "Practice",
    description: "Guided practice video and supporting lesson material.",
    blocks: [
      {
        type: "video",
        title: "Lesson 10 video",
        videoId: "22f4f6187d41d4d230564c63f79cc03b",
      },
      {
        type: "html",
        title: "Lesson 10 material",
        materialId: "lesson-10",
      },
    ],
  },
  {
    slug: "lesson-11",
    number: 11,
    title: "Lesson 11",
    category: "Practice",
    description: "Two guided practice videos and supporting lesson material.",
    blocks: [
      {
        type: "video",
        title: "Lesson 11 video — Part 1",
        videoId: "ccef3b4429754f33ced92014e24f9fb0",
      },
      {
        type: "video",
        title: "Lesson 11 video — Part 2",
        videoId: "e5713736aeddbf434d88321d2788ae3c",
      },
      {
        type: "html",
        title: "Lesson 11 material",
        materialId: "lesson-11",
      },
    ],
  },
  {
    slug: "lesson-12",
    number: 12,
    title: "Lesson 12",
    category: "Practice",
    description: "Three guided practice videos and supporting lesson material.",
    blocks: [
      {
        type: "video",
        title: "Lesson 12 video — Part 1",
        videoId: "3835e0b646145d1e58df5a27169eed16",
      },
      {
        type: "video",
        title: "Lesson 12 video — Part 2",
        videoId: "36a0420de764b9a24c7905533481df3f",
      },
      {
        type: "video",
        title: "Lesson 12 video — Part 3",
        videoId: "945ae43cc097bc40b66d0b141f8657b7",
      },
      {
        type: "html",
        title: "Lesson 12 material",
        materialId: "lesson-12",
      },
    ],
  },
  {
    slug: "lesson-13",
    number: 13,
    title: "Lesson 13",
    category: "Practice",
    description: "Two guided practice videos and supporting lesson material.",
    blocks: [
      {
        type: "video",
        title: "Lesson 13 video — Part 1",
        videoId: "e788cbcdd17a518e24de8d31bb254a69",
      },
      {
        type: "video",
        title: "Lesson 13 video — Part 2",
        videoId: "f1b42ff658b2ebc620fbfe20cea9fee4",
      },
      {
        type: "html",
        title: "Lesson 13 material",
        materialId: "lesson-13",
      },
    ],
  },
  {
    slug: "lesson-14",
    number: 14,
    title: "Lesson 14",
    category: "Practice",
    description: "Guided practice video and supporting lesson material.",
    blocks: [
      {
        type: "video",
        title: "Lesson 14 video",
        videoId: "3060610739df87064ec8d5e349c4130c",
      },
      {
        type: "html",
        title: "Lesson 14 material",
        materialId: "lesson-14",
      },
    ],
  },
  {
    slug: "lesson-15",
    number: 15,
    title: "Lesson 15",
    category: "Practice",
    description: "Two guided practice videos and supporting lesson material.",
    blocks: [
      {
        type: "video",
        title: "Lesson 15 video — Part 1",
        videoId: "2191c44a53d42cabd84430beb3b58061",
      },
      {
        type: "video",
        title: "Lesson 15 video — Part 2",
        videoId: "34a4f9592eaf75c866f51e294222386d",
      },
      {
        type: "html",
        title: "Lesson 15 material",
        materialId: "lesson-15",
      },
    ],
  },
  {
    slug: "closing",
    number: 16,
    title: "Closing",
    category: "Final Notes",
    description: "Final course notes and closing guidance.",
    blocks: [
      {
        type: "html",
        title: "Closing material",
        materialId: "fvh-closing",
      },
    ],
  },
];