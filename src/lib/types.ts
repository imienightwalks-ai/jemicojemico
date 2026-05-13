export type Book = {
  id: string;
  title: string;
  author: string;
  cover_url: string | null;
  description: string | null;
  published_year: string | null;
  created_at: string;
  updated_at: string;
};

export type Quote = {
  id: string;
  book_id: string;
  text: string;
  tags: string[];
  is_favorite: boolean;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
};

export type BookWithQuotes = Book & {
  quotes: Quote[];
};

export type BookMetadata = {
  title: string;
  author: string;
  coverUrl: string | null;
  description: string | null;
  publishedYear: string | null;
};
