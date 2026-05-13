import type { BookWithQuotes } from "./types";

export const sampleBooks: BookWithQuotes[] = [
  {
    id: "sample-1",
    title: "The Midnight Library",
    author: "Matt Haig",
    cover_url:
      "https://covers.openlibrary.org/b/isbn/9780525559474-L.jpg?default=false",
    description:
      "A luminous novel about the choices that make a life feel lived.",
    published_year: "2020",
    created_at: "2026-01-05T10:00:00.000Z",
    updated_at: "2026-01-05T10:00:00.000Z",
    quotes: [
      {
        id: "quote-1",
        book_id: "sample-1",
        text: "Between life and death there is a library, and within that library, the shelves go on forever.",
        tags: ["life", "choice"],
        is_favorite: true,
        is_pinned: true,
        created_at: "2026-01-05T10:10:00.000Z",
        updated_at: "2026-01-05T10:10:00.000Z",
      },
      {
        id: "quote-2",
        book_id: "sample-1",
        text: "Never underestimate the big importance of small things.",
        tags: ["gentle", "perspective"],
        is_favorite: false,
        is_pinned: false,
        created_at: "2026-01-06T10:10:00.000Z",
        updated_at: "2026-01-06T10:10:00.000Z",
      },
    ],
  },
  {
    id: "sample-2",
    title: "Before the Coffee Gets Cold",
    author: "Toshikazu Kawaguchi",
    cover_url:
      "https://covers.openlibrary.org/b/isbn/9781529029581-L.jpg?default=false",
    description:
      "A tender story about memory, regret, and the quiet bravery of returning.",
    published_year: "2015",
    created_at: "2026-01-08T10:00:00.000Z",
    updated_at: "2026-01-08T10:00:00.000Z",
    quotes: [
      {
        id: "quote-3",
        book_id: "sample-2",
        text: "At the end of the day, whether one returns to the past or travels to the future, the present does not change.",
        tags: ["time", "healing"],
        is_favorite: true,
        is_pinned: false,
        created_at: "2026-01-08T10:20:00.000Z",
        updated_at: "2026-01-08T10:20:00.000Z",
      },
    ],
  },
  {
    id: "sample-3",
    title: "The Alchemist",
    author: "Paulo Coelho",
    cover_url:
      "https://covers.openlibrary.org/b/isbn/9780062315007-L.jpg?default=false",
    description:
      "A fable about desire, omens, and listening closely to your own life.",
    published_year: "1988",
    created_at: "2026-01-11T10:00:00.000Z",
    updated_at: "2026-01-11T10:00:00.000Z",
    quotes: [
      {
        id: "quote-4",
        book_id: "sample-3",
        text: "And, when you want something, all the universe conspires in helping you to achieve it.",
        tags: ["dreams", "faith"],
        is_favorite: false,
        is_pinned: true,
        created_at: "2026-01-11T11:00:00.000Z",
        updated_at: "2026-01-11T11:00:00.000Z",
      },
    ],
  },
];
