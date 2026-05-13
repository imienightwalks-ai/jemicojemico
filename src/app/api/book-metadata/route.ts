import { NextResponse } from "next/server";
import type { BookMetadata } from "@/lib/types";

type OpenLibraryDoc = {
  title?: string;
  author_name?: string[];
  cover_i?: number;
  first_publish_year?: number;
  isbn?: string[];
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get("title")?.trim();
  const author = searchParams.get("author")?.trim();

  if (!title) {
    return NextResponse.json({ error: "Book title is required." }, { status: 400 });
  }

  const query = new URLSearchParams({
    title,
    limit: "1",
  });

  if (author) query.set("author", author);

  const response = await fetch(
    `https://openlibrary.org/search.json?${query.toString()}`,
    { next: { revalidate: 60 * 60 * 24 } },
  );

  if (!response.ok) {
    return NextResponse.json(
      { error: "Could not fetch book metadata." },
      { status: 502 },
    );
  }

  const data = (await response.json()) as { docs?: OpenLibraryDoc[] };
  const doc = data.docs?.[0];

  if (!doc) {
    const fallback: BookMetadata = {
      title,
      author: author ?? "",
      coverUrl: null,
      description: null,
      publishedYear: null,
    };

    return NextResponse.json(fallback);
  }

  const isbnCover = doc.isbn?.[0]
    ? `https://covers.openlibrary.org/b/isbn/${doc.isbn[0]}-L.jpg`
    : null;
  const idCover = doc.cover_i
    ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`
    : null;

  const metadata: BookMetadata = {
    title: doc.title ?? title,
    author: doc.author_name?.[0] ?? author ?? "",
    coverUrl: idCover ?? isbnCover,
    description: null,
    publishedYear: doc.first_publish_year
      ? String(doc.first_publish_year)
      : null,
  };

  return NextResponse.json(metadata);
}
