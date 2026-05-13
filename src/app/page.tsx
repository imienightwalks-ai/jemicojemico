"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { isAdminEmail, isSupabaseConfigured, supabase } from "@/lib/supabase";
import { sampleBooks } from "@/lib/sample-data";
import type { BookMetadata, BookWithQuotes, Quote } from "@/lib/types";

type Filter = "all" | "favorites" | "pinned" | "recent";
type Sort = "recent" | "title" | "author" | "quotes";
type Toast = { id: number; message: string };
type CoverLookupStatus = "idle" | "searching" | "found" | "empty";

const icon = {
  plus: "M12 5v14M5 12h14",
  sun: "M12 4V2m0 20v-2m8-8h2M2 12h2m14.1-6.1 1.4-1.4M4.5 19.5l1.4-1.4m12.2 0 1.4 1.4M4.5 4.5l1.4 1.4M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z",
  moon: "M21 13.2A8.7 8.7 0 0 1 10.8 3 7 7 0 1 0 21 13.2Z",
  search: "m21 21-4.3-4.3M10.8 18a7.2 7.2 0 1 1 0-14.4 7.2 7.2 0 0 1 0 14.4Z",
  book: "M5 4.5A2.5 2.5 0 0 1 7.5 2H20v17H7.5A2.5 2.5 0 0 0 5 21.5v-17Zm0 0v17",
  heart: "M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z",
  pin: "M12 17v5M9 9l-4 4v2h14v-2l-4-4V3H9v6Z",
  copy: "M8 8h12v12H8zM4 4h12v12",
  share: "M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7M16 6l-4-4-4 4M12 2v13",
  edit: "M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z",
  trash: "M3 6h18M8 6V4h8v2M6 6l1 15h10l1-15",
  close: "M6 6l12 12M18 6 6 18",
  spark: "M12 2l1.9 6.1L20 10l-6.1 1.9L12 18l-1.9-6.1L4 10l6.1-1.9L12 2Z",
};

function Icon({
  name,
  className = "h-4 w-4",
  filled = false,
}: {
  name: keyof typeof icon;
  className?: string;
  filled?: boolean;
}) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
    >
      <path d={icon[name]} />
    </svg>
  );
}

const emptyBook = {
  title: "",
  author: "",
  cover_url: "",
  description: "",
  published_year: "",
};

const quoteTagRules: Array<[string, string[]]> = [
  ["love|heart|beloved|romance|affection", ["love", "heart"]],
  ["dream|hope|wish|future|possibil", ["dreams", "hope"]],
  ["life|living|alive|death|exist", ["life", "reflection"]],
  ["time|past|present|future|memory|moment", ["time", "memory"]],
  ["fear|brave|courage|risk|afraid", ["courage", "growth"]],
  ["pain|heal|grief|hurt|broken|loss", ["healing", "grief"]],
  ["choice|decide|path|journey|road", ["choices", "journey"]],
  ["truth|honest|real|secret", ["truth", "wisdom"]],
  ["alone|lonely|silence|quiet", ["solitude", "quiet"]],
  ["happy|joy|light|peace|soft", ["joy", "peace"]],
];

function suggestTags(text: string) {
  const lower = text.toLowerCase();
  const tags = new Set<string>();

  quoteTagRules.forEach(([pattern, matches]) => {
    if (new RegExp(pattern).test(lower)) {
      matches.forEach((tag) => tags.add(tag));
    }
  });

  if (text.length > 180) tags.add("long quote");
  if (tags.size === 0 && text.trim().length > 0) tags.add("reflection");

  return Array.from(tags).slice(0, 4);
}

function createCustomCover(title: string, author: string) {
  const cleanTitle = title.trim() || "Untitled";
  const cleanAuthor = author.trim() || "Unknown author";
  const initials = cleanTitle
    .split(/\s+/)
    .slice(0, 3)
    .map((word) => word[0]?.toUpperCase())
    .join("");
  const palette = [
    ["#2b1d16", "#b98958", "#f8dfb4"],
    ["#211918", "#8f6b67", "#f0d8ca"],
    ["#1d2118", "#7c876d", "#e6dcc5"],
    ["#241b2b", "#9c7aa8", "#f0d9f3"],
    ["#162226", "#6f9a9b", "#d4eeee"],
  ];
  const sum = cleanTitle.split("").reduce((total, char) => total + char.charCodeAt(0), 0);
  const [dark, accent, cream] = palette[sum % palette.length];
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="900" height="1350" viewBox="0 0 900 1350">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="${dark}"/>
          <stop offset="0.58" stop-color="${accent}"/>
          <stop offset="1" stop-color="${dark}"/>
        </linearGradient>
        <radialGradient id="glow" cx="70%" cy="18%" r="65%">
          <stop offset="0" stop-color="${cream}" stop-opacity="0.35"/>
          <stop offset="1" stop-color="${cream}" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <rect width="900" height="1350" rx="46" fill="url(#bg)"/>
      <rect x="48" y="48" width="804" height="1254" rx="34" fill="none" stroke="${cream}" stroke-opacity="0.28" stroke-width="3"/>
      <rect width="900" height="1350" fill="url(#glow)"/>
      <circle cx="730" cy="190" r="132" fill="${cream}" opacity="0.08"/>
      <text x="450" y="210" fill="${cream}" opacity="0.72" font-family="Georgia, serif" font-size="34" text-anchor="middle" letter-spacing="10">BOOK QUOTES</text>
      <text x="450" y="560" fill="${cream}" font-family="Georgia, serif" font-size="112" font-weight="700" text-anchor="middle">${escapeSvg(initials)}</text>
      <foreignObject x="105" y="650" width="690" height="320">
        <div xmlns="http://www.w3.org/1999/xhtml" style="color:${cream};font-family:Georgia,serif;font-size:76px;font-weight:700;line-height:0.95;text-align:center;word-break:break-word;">
          ${escapeSvg(cleanTitle)}
        </div>
      </foreignObject>
      <text x="450" y="1110" fill="${cream}" opacity="0.82" font-family="Arial, sans-serif" font-size="34" text-anchor="middle">${escapeSvg(cleanAuthor)}</text>
      <text x="450" y="1210" fill="${cream}" opacity="0.45" font-family="Arial, sans-serif" font-size="24" text-anchor="middle" letter-spacing="8">CURATED LIBRARY</text>
    </svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function escapeSvg(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export default function Home() {
  const [books, setBooks] = useState<BookWithQuotes[]>(sampleBooks);
  const [selectedBookId, setSelectedBookId] = useState(sampleBooks[0]?.id ?? "");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("recent");
  const [tagFilter, setTagFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [bookModal, setBookModal] = useState(false);
  const [quoteModal, setQuoteModal] = useState(false);
  const [editingBookId, setEditingBookId] = useState<string | null>(null);
  const [editingQuote, setEditingQuote] = useState<Quote | null>(null);
  const [bookForm, setBookForm] = useState(emptyBook);
  const [quoteForm, setQuoteForm] = useState({ text: "", tags: "" });
  const [toast, setToast] = useState<Toast | null>(null);
  const [authEmail, setAuthEmail] = useState("");
  const [isDark, setIsDark] = useState(false);
  const [coverLookupStatus, setCoverLookupStatus] = useState<CoverLookupStatus>("idle");
  const [tagsTouched, setTagsTouched] = useState(false);
  const toastCounter = useRef(0);
  const lastCoverLookup = useRef("");

  const isAdmin = isAdminEmail(sessionEmail);
  const selectedBook = books.find((book) => book.id === selectedBookId) ?? books[0];

  useEffect(() => {
    const stored = window.localStorage.getItem("jemico-theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    setIsDark(stored ? stored === "dark" : prefersDark);
  }, []);

  function toggleTheme() {
    setIsDark((current) => {
      const next = !current;
      window.localStorage.setItem("jemico-theme", next ? "dark" : "light");
      return next;
    });
  }

  const stats = useMemo(() => {
    const quotes = books.flatMap((book) => book.quotes);
    return {
      books: books.length,
      quotes: quotes.length,
      favorites: quotes.filter((quote) => quote.is_favorite).length,
      pinned: quotes.filter((quote) => quote.is_pinned).length,
    };
  }, [books]);

  const tags = useMemo(() => {
    const unique = new Set(books.flatMap((book) => book.quotes.flatMap((quote) => quote.tags)));
    return ["all", ...Array.from(unique).sort()];
  }, [books]);

  const visibleBooks = useMemo(() => {
    const text = query.toLowerCase().trim();
    return [...books]
      .filter((book) => {
        const bookText = `${book.title} ${book.author} ${book.description ?? ""}`.toLowerCase();
        const quoteText = book.quotes.map((quote) => `${quote.text} ${quote.tags.join(" ")}`).join(" ").toLowerCase();
        const matchesText = !text || bookText.includes(text) || quoteText.includes(text);
        const matchesTag = tagFilter === "all" || book.quotes.some((quote) => quote.tags.includes(tagFilter));
        const matchesFilter =
          filter === "all" ||
          (filter === "favorites" && book.quotes.some((quote) => quote.is_favorite)) ||
          (filter === "pinned" && book.quotes.some((quote) => quote.is_pinned)) ||
          (filter === "recent" && book.quotes.some((quote) => daysAgo(quote.created_at) <= 14));
        return matchesText && matchesTag && matchesFilter;
      })
      .sort((a, b) => {
        if (sort === "title") return a.title.localeCompare(b.title);
        if (sort === "author") return a.author.localeCompare(b.author);
        if (sort === "quotes") return b.quotes.length - a.quotes.length;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
  }, [books, filter, query, sort, tagFilter]);

  const visibleQuotes = useMemo(() => {
    if (!selectedBook) return [];
    const text = query.toLowerCase().trim();
    return selectedBook.quotes
      .filter((quote) => {
        const matchesText = !text || quote.text.toLowerCase().includes(text) || quote.tags.join(" ").toLowerCase().includes(text);
        const matchesTag = tagFilter === "all" || quote.tags.includes(tagFilter);
        const matchesFilter =
          filter === "all" ||
          (filter === "favorites" && quote.is_favorite) ||
          (filter === "pinned" && quote.is_pinned) ||
          (filter === "recent" && daysAgo(quote.created_at) <= 14);
        return matchesText && matchesTag && matchesFilter;
      })
      .sort((a, b) => {
        if (a.is_pinned !== b.is_pinned) return Number(b.is_pinned) - Number(a.is_pinned);
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
  }, [filter, query, selectedBook, tagFilter]);

  const notify = useCallback((message: string) => {
    toastCounter.current += 1;
    const item = { id: toastCounter.current, message };
    setToast(item);
    window.setTimeout(() => {
      setToast((current) => (current?.id === item.id ? null : current));
    }, 2600);
  }, []);

  const lookupBookMetadata = useCallback(
    async (title: string, author: string, options?: { quiet?: boolean }) => {
      if (!title.trim()) return;
      setCoverLookupStatus("searching");
      try {
        const response = await fetch(
          `/api/book-metadata?title=${encodeURIComponent(title)}&author=${encodeURIComponent(author)}`,
        );
        const data = (await response.json()) as BookMetadata;
        setBookForm((current) => ({
          title: data.title || current.title,
          author: data.author || current.author,
          cover_url: data.coverUrl || current.cover_url,
          description: data.description || current.description,
          published_year: data.publishedYear || current.published_year,
        }));
        setCoverLookupStatus(data.coverUrl ? "found" : "empty");
        if (!options?.quiet) notify(data.coverUrl ? "Cover added automatically." : "No cover found yet.");
      } catch {
        setCoverLookupStatus("empty");
        if (!options?.quiet) notify("Cover lookup is unavailable right now.");
      }
    },
    [notify],
  );

  const loadBooks = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("books")
      .select("*, quotes(*)")
      .order("created_at", { ascending: false });

    if (error) {
      notify("Could not load Supabase data. Showing demo library.");
    } else if (data) {
      const normalized = data.map((book) => ({
        ...book,
        quotes: [...(book.quotes ?? [])].sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        ),
      })) as BookWithQuotes[];
      setBooks(normalized);
      setSelectedBookId((current) => current || normalized[0]?.id || "");
    }
    setLoading(false);
  }, [notify]);

  useEffect(() => {
    let mounted = true;
    let channel: ReturnType<NonNullable<typeof supabase>["channel"]> | null = null;
    let authSubscription: { unsubscribe: () => void } | null = null;

    async function boot() {
      if (!supabase) {
        setLoading(false);
        return;
      }

      const { data: auth } = await supabase.auth.getUser();
      if (mounted) setSessionEmail(auth.user?.email ?? null);
      await loadBooks();

      channel = supabase
        .channel("library-live-sync")
        .on("postgres_changes", { event: "*", schema: "public", table: "books" }, loadBooks)
        .on("postgres_changes", { event: "*", schema: "public", table: "quotes" }, loadBooks)
        .subscribe();

      const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
        setSessionEmail(session?.user.email ?? null);
      });
      authSubscription = authListener.subscription;
    }

    boot();
    return () => {
      mounted = false;
      if (supabase && channel) supabase.removeChannel(channel);
      authSubscription?.unsubscribe();
    };
  }, [loadBooks]);

  useEffect(() => {
    if (!bookModal || editingBookId) return;
    const title = bookForm.title.trim();
    const author = bookForm.author.trim();
    const lookupKey = `${title.toLowerCase()}|${author.toLowerCase()}`;

    if (title.length < 2 || author.length < 2 || lookupKey === lastCoverLookup.current) return;

    const timer = window.setTimeout(() => {
      lastCoverLookup.current = lookupKey;
      lookupBookMetadata(title, author, { quiet: true });
    }, 850);

    return () => window.clearTimeout(timer);
  }, [bookForm.author, bookForm.title, bookModal, editingBookId, lookupBookMetadata]);

  async function signIn(event: FormEvent) {
    event.preventDefault();
    if (!supabase) {
      notify("Add Supabase env vars to enable admin login.");
      return;
    }
    const { error } = await supabase.auth.signInWithOtp({
      email: authEmail,
      options: { emailRedirectTo: window.location.origin },
    });
    notify(error ? error.message : "Magic link sent. Check your inbox.");
  }

  async function signOut() {
    await supabase?.auth.signOut();
    setSessionEmail(null);
  }

  async function fetchMetadata() {
    if (!bookForm.title.trim()) return;
    await lookupBookMetadata(bookForm.title, bookForm.author);
  }

  function generateCustomCover() {
    if (!bookForm.title.trim()) {
      notify("Add a title first.");
      return;
    }

    setBookForm((current) => ({
      ...current,
      cover_url: createCustomCover(current.title, current.author),
    }));
    setCoverLookupStatus("found");
    notify("Custom cover generated.");
  }

  function openBookForm(book?: BookWithQuotes) {
    setEditingBookId(book?.id ?? null);
    setCoverLookupStatus("idle");
    lastCoverLookup.current = book ? `${book.title.toLowerCase()}|${book.author.toLowerCase()}` : "";
    setBookForm(
      book
        ? {
            title: book.title,
            author: book.author,
            cover_url: book.cover_url ?? "",
            description: book.description ?? "",
            published_year: book.published_year ?? "",
          }
        : emptyBook,
    );
    setBookModal(true);
  }

  async function saveBook(event: FormEvent) {
    event.preventDefault();
    if (!isAdmin) return notify("Admin access is required.");
    let payload = {
      title: bookForm.title.trim(),
      author: bookForm.author.trim(),
      cover_url: bookForm.cover_url.trim() || null,
      description: bookForm.description.trim() || null,
      published_year: bookForm.published_year.trim() || null,
    };
    if (!payload.title || !payload.author) return notify("Title and author are required.");
    setSaving(true);

    if (!payload.cover_url) {
      try {
        const response = await fetch(
          `/api/book-metadata?title=${encodeURIComponent(payload.title)}&author=${encodeURIComponent(payload.author)}`,
        );
        const data = (await response.json()) as BookMetadata;
        payload = {
          ...payload,
          title: data.title || payload.title,
          author: data.author || payload.author,
          cover_url: data.coverUrl || payload.cover_url,
          description: data.description || payload.description,
          published_year: data.publishedYear || payload.published_year,
        };
      } catch {
        setCoverLookupStatus("empty");
      }
    }

    if (!payload.cover_url) {
      payload = {
        ...payload,
        cover_url: createCustomCover(payload.title, payload.author),
      };
    }

    if (supabase) {
      const request = editingBookId
        ? supabase.from("books").update(payload).eq("id", editingBookId).select("*, quotes(*)").single()
        : supabase.from("books").insert(payload).select("*, quotes(*)").single();
      const { data, error } = await request;
      if (error) notify(error.message);
      if (data) await loadBooks();
    } else {
      const now = new Date().toISOString();
      setBooks((current) =>
        editingBookId
          ? current.map((book) => (book.id === editingBookId ? { ...book, ...payload, updated_at: now } : book))
          : [{ ...payload, id: crypto.randomUUID(), created_at: now, updated_at: now, quotes: [] }, ...current],
      );
    }
    setSaving(false);
    setBookModal(false);
    notify(editingBookId ? "Book updated." : "Book added.");
  }

  async function deleteBook(bookId: string) {
    if (!isAdmin || !confirm("Delete this book and all quotes inside it?")) return;
    if (supabase) {
      const { error } = await supabase.from("books").delete().eq("id", bookId);
      if (error) return notify(error.message);
      await loadBooks();
    } else {
      setBooks((current) => current.filter((book) => book.id !== bookId));
    }
    setSelectedBookId((current) => (current === bookId ? books.find((book) => book.id !== bookId)?.id ?? "" : current));
    notify("Book deleted.");
  }

  function openQuoteForm(quote?: Quote) {
    if (!selectedBook) return;
    setEditingQuote(quote ?? null);
    setTagsTouched(Boolean(quote?.tags.length));
    setQuoteForm({ text: quote?.text ?? "", tags: quote?.tags.join(", ") ?? "" });
    setQuoteModal(true);
  }

  function handleQuoteTextChange(text: string) {
    setQuoteForm((current) => ({
      text,
      tags: tagsTouched ? current.tags : suggestTags(text).join(", "),
    }));
  }

  async function saveQuote(event: FormEvent) {
    event.preventDefault();
    if (!isAdmin || !selectedBook) return notify("Admin access is required.");
    const payload = {
      book_id: selectedBook.id,
      text: quoteForm.text.trim(),
      tags: quoteForm.tags.split(",").map((tag) => tag.trim()).filter(Boolean),
    };
    if (!payload.text) return notify("Quote text is required.");
    if (payload.tags.length === 0) payload.tags = suggestTags(payload.text);

    setSaving(true);
    if (supabase) {
      const request = editingQuote
        ? supabase.from("quotes").update(payload).eq("id", editingQuote.id)
        : supabase.from("quotes").insert(payload);
      const { error } = await request;
      if (error) notify(error.message);
      await loadBooks();
    } else {
      const now = new Date().toISOString();
      setBooks((current) =>
        current.map((book) =>
          book.id !== selectedBook.id
            ? book
            : {
                ...book,
                quotes: editingQuote
                  ? book.quotes.map((quote) => (quote.id === editingQuote.id ? { ...quote, ...payload, updated_at: now } : quote))
                  : [{ ...payload, id: crypto.randomUUID(), is_favorite: false, is_pinned: false, created_at: now, updated_at: now }, ...book.quotes],
              },
        ),
      );
    }
    setSaving(false);
    setQuoteModal(false);
    notify(editingQuote ? "Quote updated." : "Quote added.");
  }

  async function patchQuote(quote: Quote, patch: Partial<Quote>) {
    if (!isAdmin) return notify("Admin access is required.");
    setBooks((current) =>
      current.map((book) => ({
        ...book,
        quotes: book.quotes.map((item) => (item.id === quote.id ? { ...item, ...patch } : item)),
      })),
    );
    if (supabase) {
      const { error } = await supabase.from("quotes").update(patch).eq("id", quote.id);
      if (error) {
        notify(error.message);
        await loadBooks();
      }
    }
  }

  async function deleteQuote(quoteId: string) {
    if (!isAdmin || !confirm("Delete this quote?")) return;
    if (supabase) {
      const { error } = await supabase.from("quotes").delete().eq("id", quoteId);
      if (error) return notify(error.message);
      await loadBooks();
    } else {
      setBooks((current) =>
        current.map((book) => ({ ...book, quotes: book.quotes.filter((quote) => quote.id !== quoteId) })),
      );
    }
    notify("Quote deleted.");
  }

  async function copyQuote(quote: Quote) {
    await navigator.clipboard.writeText(quote.text);
    notify("Quote copied.");
  }

  async function shareQuote(quote: Quote) {
    const shareText = `${quote.text}\n\nFrom ${selectedBook?.title ?? "Jemico's Library"}`;
    if (navigator.share) {
      await navigator.share({ text: shareText, title: "Book quote" });
    } else {
      await navigator.clipboard.writeText(shareText);
      notify("Share text copied.");
    }
  }

  return (
    <main className={`library-shell ${isDark ? "theme-dark" : "theme-light"}`}>
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-4 sm:px-6 lg:px-8">
        <header className="glass sticky top-3 z-30 rounded-[2rem] px-4 py-3 sm:px-5">
          <div className="flex flex-wrap items-center gap-3">
            <button
              className="flex min-w-0 flex-1 items-center gap-3 text-left"
              onClick={() => setSelectedBookId(books[0]?.id ?? "")}
            >
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#35261b] text-[#fff7e9] shadow-lg shadow-[#8b6b45]/20">
                <Icon name="book" className="h-5 w-5" />
              </span>
              <span className="min-w-0">
                <span className="block truncate font-serif text-xl leading-tight text-[#2d2117] sm:text-2xl">
                  Jemico&apos;s Book Quotes Library
                </span>
                <span className="block truncate text-xs font-medium uppercase tracking-[0.24em] text-[#8a7662]">
                  Created by Jemico
                </span>
              </span>
            </button>

            <button
              aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
              className="theme-toggle grid h-11 w-11 place-items-center rounded-full transition hover:-translate-y-0.5"
              onClick={toggleTheme}
              title={isDark ? "Light mode" : "Dark mode"}
              type="button"
            >
              <Icon name={isDark ? "sun" : "moon"} className="h-5 w-5" />
            </button>

            <form onSubmit={signIn} className="hidden items-center gap-2 lg:flex">
              {isAdmin ? (
                <>
                  <span className="rounded-full border border-[#6d5030]/15 bg-white/50 px-3 py-2 text-xs font-semibold text-[#6a5846]">
                    Admin mode
                  </span>
                  <button className="rounded-full bg-[#35261b] px-4 py-2 text-sm font-semibold text-[#fff7e8]" onClick={signOut} type="button">
                    Sign out
                  </button>
                </>
              ) : (
                <>
                  <input
                    aria-label="Admin email"
                    className="w-52 rounded-full border border-[#8a6a45]/20 bg-white/60 px-4 py-2 text-sm outline-none transition focus:border-[#9d7140]"
                    onChange={(event) => setAuthEmail(event.target.value)}
                    placeholder="admin email"
                    type="email"
                    value={authEmail}
                  />
                  <button className="rounded-full bg-[#35261b] px-4 py-2 text-sm font-semibold text-[#fff7e8]">
                    Login
                  </button>
                </>
              )}
            </form>
          </div>
        </header>

        <section className="grid gap-4 lg:grid-cols-[1.08fr_0.92fr]">
          <div className="glass rise-in rounded-[2rem] p-5 sm:p-8">
            <div className="hero-signature mb-6 overflow-hidden rounded-[1.75rem] p-5 sm:p-7">
              <p className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/12 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.24em] text-[#ffe9c3]">
                <Icon name="spark" className="h-3.5 w-3.5" /> Private reading archive
              </p>
              <h1 className="mt-5 max-w-3xl font-serif text-5xl leading-[0.9] text-[#fff8ea] sm:text-7xl lg:text-8xl">
                Lines worth keeping.
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-8 text-[#f2ddbd] sm:text-lg">
                A soft cinematic shelf for book quotes, quiet thoughts, and favorite pages.
              </p>
              <div className="mt-7 flex flex-wrap items-end justify-between gap-4">
                <span className="font-display text-3xl leading-none text-[#f8dfb4] sm:text-4xl">Read. Save. Return.</span>
                <span className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.28em] text-[#f8dfb4]">
                  by Jemico
                </span>
              </div>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat label="Books" value={stats.books} />
              <Stat label="Quotes" value={stats.quotes} />
              <Stat label="Favorites" value={stats.favorites} />
              <Stat label="Pinned" value={stats.pinned} />
            </div>
          </div>

          <aside className="soft-card rise-in rounded-[2rem] p-5 sm:p-6" style={{ animationDelay: "80ms" }}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#9a7855]">Current shelf</p>
                <h2 className="mt-2 font-serif text-4xl leading-none text-[#2d2118]">
                  {selectedBook?.title ?? "No books yet"}
                </h2>
                <p className="mt-2 text-sm text-[#7b6a58]">{selectedBook?.author}</p>
              </div>
              {isAdmin && (
                <button
                  className="grid h-11 w-11 place-items-center rounded-full bg-[#35261b] text-[#fff6e8] shadow-lg shadow-[#5f4429]/20 transition hover:-translate-y-0.5"
                  onClick={() => openQuoteForm()}
                  title="Add quote"
                >
                  <Icon name="plus" />
                </button>
              )}
            </div>
            <div className="mt-5 flex gap-4 overflow-hidden rounded-[1.5rem] bg-[#332417] p-3 text-[#fff7e8]">
              {selectedBook?.cover_url ? (
                <Image
                  alt=""
                  className="aspect-[2/3] w-24 rounded-[1rem] object-cover shadow-2xl"
                  height={210}
                  src={selectedBook.cover_url}
                  width={140}
                />
              ) : (
                <div className="grid aspect-[2/3] w-24 place-items-center rounded-[1rem] bg-[#b89973]">
                  <Icon name="book" className="h-8 w-8" />
                </div>
              )}
              <div className="min-w-0 flex-1 py-1">
                <p className="line-clamp-4 text-sm leading-6 text-[#e8d9c5]">
                  {selectedBook?.description || "This shelf is ready for quotes, tags, favorites, and pinned passages."}
                </p>
                <div className="mt-4 flex flex-wrap gap-2 text-xs text-[#f3e3ca]">
                  <span className="rounded-full bg-white/10 px-3 py-1">{selectedBook?.quotes.length ?? 0} quotes</span>
                  {selectedBook?.published_year && <span className="rounded-full bg-white/10 px-3 py-1">{selectedBook.published_year}</span>}
                </div>
              </div>
            </div>
          </aside>
        </section>

        <section className="glass rounded-[1.75rem] p-3 sm:p-4">
          <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto_auto]">
            <label className="relative">
              <Icon name="search" className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#8f7b68]" />
              <input
                className="h-12 w-full rounded-full border border-[#7c6041]/15 bg-white/62 pl-12 pr-4 text-sm outline-none transition focus:border-[#a77943]"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search books, quotes, tags..."
                value={query}
              />
            </label>
            <select className="h-12 rounded-full border border-[#7c6041]/15 bg-white/62 px-4 text-sm outline-none" onChange={(event) => setFilter(event.target.value as Filter)} value={filter}>
              <option value="all">All quotes</option>
              <option value="favorites">Favorites</option>
              <option value="pinned">Pinned</option>
              <option value="recent">Recent</option>
            </select>
            <select className="h-12 rounded-full border border-[#7c6041]/15 bg-white/62 px-4 text-sm outline-none" onChange={(event) => setTagFilter(event.target.value)} value={tagFilter}>
              {tags.map((tag) => (
                <option key={tag} value={tag}>{tag === "all" ? "All tags" : tag}</option>
              ))}
            </select>
            <select className="h-12 rounded-full border border-[#7c6041]/15 bg-white/62 px-4 text-sm outline-none" onChange={(event) => setSort(event.target.value as Sort)} value={sort}>
              <option value="recent">Newest books</option>
              <option value="title">Title</option>
              <option value="author">Author</option>
              <option value="quotes">Most quotes</option>
            </select>
          </div>
        </section>

        {!isSupabaseConfigured && (
          <div className="rounded-[1.25rem] border border-[#a97e4a]/20 bg-[#fff7e9]/70 px-4 py-3 text-sm text-[#735d45]">
            Demo mode is active until Supabase environment variables are added. Public visitors still stay read-only; admin controls appear only after the configured admin signs in.
          </div>
        )}

        <section className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-serif text-3xl text-[#2d2117]">Books</h2>
              {isAdmin && (
                <button className="inline-flex items-center gap-2 rounded-full bg-[#35261b] px-4 py-2 text-sm font-semibold text-[#fff7e8]" onClick={() => openBookForm()}>
                  <Icon name="plus" /> Add book
                </button>
              )}
            </div>
            {loading ? <SkeletonGrid /> : (
              <div className="book-grid">
                {visibleBooks.map((book, index) => (
                  <BookCard
                    book={book}
                    isAdmin={isAdmin}
                    isSelected={book.id === selectedBook?.id}
                    key={book.id}
                    onDelete={() => deleteBook(book.id)}
                    onEdit={() => openBookForm(book)}
                    onSelect={() => setSelectedBookId(book.id)}
                    style={{ animationDelay: `${index * 45}ms` }}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="min-w-0">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-serif text-3xl text-[#2d2117]">Quotes</h2>
              <span className="rounded-full bg-[#fff8ed]/75 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-[#9a7855]">
                {visibleQuotes.length} visible
              </span>
            </div>
            <div className="grid gap-4">
              {visibleQuotes.length === 0 && (
                <EmptyState
                  action={isAdmin ? () => openQuoteForm() : undefined}
                  actionLabel="Add quote"
                  title="No quotes found"
                />
              )}
              {visibleQuotes.map((quote, index) => (
                <QuoteCard
                  isAdmin={isAdmin}
                  key={quote.id}
                  onCopy={() => copyQuote(quote)}
                  onDelete={() => deleteQuote(quote.id)}
                  onEdit={() => openQuoteForm(quote)}
                  onFavorite={() => patchQuote(quote, { is_favorite: !quote.is_favorite })}
                  onPin={() => patchQuote(quote, { is_pinned: !quote.is_pinned })}
                  onShare={() => shareQuote(quote)}
                  quote={quote}
                  style={{ animationDelay: `${index * 55}ms` }}
                />
              ))}
            </div>
          </div>
        </section>
      </div>

      <MobileAuth isAdmin={isAdmin} authEmail={authEmail} onEmail={setAuthEmail} onSignIn={signIn} onSignOut={signOut} />

      <AnimatePresence>
        {bookModal && (
          <Modal title={editingBookId ? "Edit book" : "Add book"} onClose={() => setBookModal(false)}>
            <form className="grid gap-3" onSubmit={saveBook}>
              <Input label="Title" onChange={(value) => setBookForm((form) => ({ ...form, title: value }))} value={bookForm.title} />
              <Input label="Author" onChange={(value) => setBookForm((form) => ({ ...form, author: value }))} value={bookForm.author} />
              <div className="rounded-[1.5rem] border border-[#7c6041]/15 bg-white/45 p-3">
                <div className="flex gap-3">
                  {bookForm.cover_url ? (
                    <Image
                      alt=""
                      className="aspect-[2/3] w-20 rounded-2xl object-cover shadow-lg"
                      height={180}
                      src={bookForm.cover_url}
                      width={120}
                    />
                  ) : (
                    <div className="grid aspect-[2/3] w-20 place-items-center rounded-2xl bg-[#d7c2a5] text-[#fff8ec]">
                      <Icon name="book" className="h-7 w-7" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1 py-1">
                    <p className="text-sm font-bold text-[#5c4936]">
                      {coverLookupStatus === "searching"
                        ? "Finding cover..."
                        : coverLookupStatus === "found"
                          ? "Cover added automatically"
                          : coverLookupStatus === "empty"
                            ? "No exact cover found yet"
                            : "Cover auto-fills after title and author"}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-[#7b6a58]">
                      You can still override the cover URL manually if the match is not right.
                    </p>
                    <button className="mt-3 rounded-full border border-[#7c6041]/15 bg-[#fff8ed] px-4 py-2 text-xs font-bold text-[#70543a]" disabled={coverLookupStatus === "searching"} onClick={fetchMetadata} type="button">
                      Search again
                    </button>
                    <button className="ml-2 mt-3 rounded-full border border-[#7c6041]/15 bg-[#fff8ed] px-4 py-2 text-xs font-bold text-[#70543a]" onClick={generateCustomCover} type="button">
                      Generate custom
                    </button>
                  </div>
                </div>
              </div>
              <Input label="Cover URL" onChange={(value) => setBookForm((form) => ({ ...form, cover_url: value }))} value={bookForm.cover_url} />
              <Input label="Published year" onChange={(value) => setBookForm((form) => ({ ...form, published_year: value }))} value={bookForm.published_year} />
              <label className="grid gap-1.5 text-sm font-semibold text-[#5c4936]">
                Description
                <textarea className="min-h-24 rounded-2xl border border-[#7c6041]/15 bg-white/70 px-4 py-3 outline-none focus:border-[#a77943]" onChange={(event) => setBookForm((form) => ({ ...form, description: event.target.value }))} value={bookForm.description} />
              </label>
              <button className="rounded-full bg-[#35261b] px-5 py-3 font-bold text-[#fff7e8]" disabled={saving}>
                {saving ? "Saving..." : "Save book"}
              </button>
            </form>
          </Modal>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {quoteModal && (
          <Modal title={editingQuote ? "Edit quote" : "Add quote"} onClose={() => setQuoteModal(false)}>
            <form className="grid gap-3" onSubmit={saveQuote}>
              <label className="grid gap-1.5 text-sm font-semibold text-[#5c4936]">
                Quote
                <textarea className="min-h-44 rounded-2xl border border-[#7c6041]/15 bg-white/70 px-4 py-3 text-base leading-7 outline-none focus:border-[#a77943]" onChange={(event) => handleQuoteTextChange(event.target.value)} value={quoteForm.text} />
              </label>
              <Input label="Auto tags, editable" onChange={(value) => {
                setTagsTouched(true);
                setQuoteForm((form) => ({ ...form, tags: value }));
              }} value={quoteForm.tags} />
              <p className="px-1 text-xs font-semibold text-[#8e7a65]">
                Tags are suggested from the quote text. Edit them anytime.
              </p>
              <button className="rounded-full bg-[#35261b] px-5 py-3 font-bold text-[#fff7e8]" disabled={saving}>
                {saving ? "Saving..." : "Save quote"}
              </button>
            </form>
          </Modal>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && (
          <motion.div
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="fixed bottom-5 left-1/2 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 rounded-full bg-[#35261b] px-5 py-3 text-center text-sm font-semibold text-[#fff7e8] shadow-2xl"
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
          >
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[1.25rem] border border-[#8a6640]/12 bg-white/42 p-4">
      <p className="font-serif text-3xl text-[#34261b]">{value}</p>
      <p className="mt-1 text-xs font-bold uppercase tracking-[0.18em] text-[#8e7a65]">{label}</p>
    </div>
  );
}

function BookCard({ book, isAdmin, isSelected, onDelete, onEdit, onSelect, style }: {
  book: BookWithQuotes;
  isAdmin: boolean;
  isSelected: boolean;
  onDelete: () => void;
  onEdit: () => void;
  onSelect: () => void;
  style: React.CSSProperties;
}) {
  return (
    <article className="masonry-item rise-in" style={style}>
      <button
        className={`soft-card group w-full overflow-hidden rounded-[1.75rem] p-3 text-left transition duration-300 hover:-translate-y-1 hover:shadow-2xl ${isSelected ? "ring-2 ring-[#9e7445]/35" : ""}`}
        onClick={onSelect}
      >
        <div className="relative overflow-hidden rounded-[1.25rem] bg-[#d7c2a5]">
          {book.cover_url ? (
            <Image alt="" className="h-auto w-full object-cover transition duration-500 group-hover:scale-[1.03]" height={660} src={book.cover_url} width={440} />
          ) : (
            <div className="grid aspect-[2/3] place-items-center bg-[#b89a75] text-[#fff8ec]">
              <Icon name="book" className="h-10 w-10" />
            </div>
          )}
        </div>
        <div className="p-2 pt-4">
          <h3 className="font-serif text-2xl leading-tight text-[#2d2118]">{book.title}</h3>
          <p className="mt-1 text-sm text-[#756554]">{book.author}</p>
          <div className="mt-4 flex items-center justify-between gap-2">
            <span className="rounded-full bg-[#f4eadb] px-3 py-1 text-xs font-bold text-[#85623e]">{book.quotes.length} quotes</span>
            {isAdmin && (
              <span className="flex gap-1" onClick={(event) => event.stopPropagation()}>
                <button className="grid h-9 w-9 place-items-center rounded-full bg-white/70 text-[#70553b]" onClick={onEdit} title="Edit book"><Icon name="edit" /></button>
                <button className="grid h-9 w-9 place-items-center rounded-full bg-white/70 text-[#9c5047]" onClick={onDelete} title="Delete book"><Icon name="trash" /></button>
              </span>
            )}
          </div>
        </div>
      </button>
    </article>
  );
}

function QuoteCard({ quote, isAdmin, onCopy, onDelete, onEdit, onFavorite, onPin, onShare, style }: {
  quote: Quote;
  isAdmin: boolean;
  onCopy: () => void;
  onDelete: () => void;
  onEdit: () => void;
  onFavorite: () => void;
  onPin: () => void;
  onShare: () => void;
  style: React.CSSProperties;
}) {
  return (
    <article className="soft-card rise-in rounded-[1.75rem] p-5 transition duration-300 hover:-translate-y-1 hover:shadow-2xl" style={style}>
      <div className="flex items-start justify-between gap-3">
        <span className="quote-mark text-6xl leading-none text-[#b08a5a]/60">&ldquo;</span>
        <div className="flex gap-1.5">
          <button className="grid h-9 w-9 place-items-center rounded-full bg-white/60 text-[#70553b]" onClick={onCopy} title="Copy quote"><Icon name="copy" /></button>
          <button className="grid h-9 w-9 place-items-center rounded-full bg-white/60 text-[#70553b]" onClick={onShare} title="Share quote"><Icon name="share" /></button>
          {isAdmin && (
            <>
              <button className={`grid h-9 w-9 place-items-center rounded-full bg-white/60 ${quote.is_favorite ? "text-[#a04750]" : "text-[#70553b]"}`} onClick={onFavorite} title="Favorite"><Icon filled={quote.is_favorite} name="heart" /></button>
              <button className={`grid h-9 w-9 place-items-center rounded-full bg-white/60 ${quote.is_pinned ? "text-[#9b713e]" : "text-[#70553b]"}`} onClick={onPin} title="Pin"><Icon filled={quote.is_pinned} name="pin" /></button>
              <button className="grid h-9 w-9 place-items-center rounded-full bg-white/60 text-[#70553b]" onClick={onEdit} title="Edit quote"><Icon name="edit" /></button>
              <button className="grid h-9 w-9 place-items-center rounded-full bg-white/60 text-[#9c5047]" onClick={onDelete} title="Delete quote"><Icon name="trash" /></button>
            </>
          )}
        </div>
      </div>
      <p className="mt-1 font-display text-2xl leading-9 text-[#33271e] sm:text-3xl sm:leading-10">{quote.text}</p>
      <div className="mt-5 flex flex-wrap items-center gap-2">
        {quote.is_pinned && <span className="rounded-full bg-[#ead8bc] px-3 py-1 text-xs font-bold text-[#7c5835]">Pinned</span>}
        {quote.is_favorite && <span className="rounded-full bg-[#f1d8d2] px-3 py-1 text-xs font-bold text-[#8d514b]">Favorite</span>}
        {quote.tags.map((tag) => (
          <span className="rounded-full bg-white/60 px-3 py-1 text-xs font-bold text-[#806a55]" key={tag}>{tag}</span>
        ))}
        <span className="ml-auto text-xs font-semibold text-[#9a8874]">{formatDate(quote.created_at)}</span>
      </div>
    </article>
  );
}

function EmptyState({ title, action, actionLabel }: { title: string; action?: () => void; actionLabel?: string }) {
  return (
    <div className="grid min-h-56 place-items-center rounded-[1.75rem] border border-dashed border-[#8a6640]/22 bg-[#fff8ed]/52 p-8 text-center">
      <div>
        <Icon name="book" className="mx-auto h-8 w-8 text-[#9a7855]" />
        <p className="mt-3 font-serif text-3xl text-[#34261b]">{title}</p>
        {action && <button className="mt-4 rounded-full bg-[#35261b] px-5 py-3 text-sm font-bold text-[#fff7e8]" onClick={action}>{actionLabel}</button>}
      </div>
    </div>
  );
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <motion.div
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-40 grid place-items-end bg-[#2d2117]/38 p-3 backdrop-blur-sm sm:place-items-center"
      exit={{ opacity: 0 }}
      initial={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <motion.section
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="glass max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-[2rem] p-5 sm:p-6"
        exit={{ opacity: 0, y: 18, scale: 0.98 }}
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        transition={{ duration: 0.28, ease: "easeOut" }}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-serif text-3xl text-[#2d2117]">{title}</h2>
          <button className="grid h-10 w-10 place-items-center rounded-full bg-white/60 text-[#6b523d]" onClick={onClose} title="Close"><Icon name="close" /></button>
        </div>
        {children}
      </motion.section>
    </motion.div>
  );
}

function Input({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="grid gap-1.5 text-sm font-semibold text-[#5c4936]">
      {label}
      <input className="h-12 rounded-full border border-[#7c6041]/15 bg-white/70 px-4 outline-none focus:border-[#a77943]" onChange={(event) => onChange(event.target.value)} value={value} />
    </label>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {[0, 1, 2, 3].map((item) => (
        <div className="h-80 animate-pulse rounded-[1.75rem] bg-white/45" key={item} />
      ))}
    </div>
  );
}

function MobileAuth({ isAdmin, authEmail, onEmail, onSignIn, onSignOut }: {
  isAdmin: boolean;
  authEmail: string;
  onEmail: (value: string) => void;
  onSignIn: (event: FormEvent) => void;
  onSignOut: () => void;
}) {
  return (
    <form className="glass fixed bottom-3 left-3 right-3 z-30 flex gap-2 rounded-full p-2 lg:hidden" onSubmit={onSignIn}>
      {isAdmin ? (
        <button className="h-11 flex-1 rounded-full bg-[#35261b] text-sm font-bold text-[#fff7e8]" onClick={onSignOut} type="button">Admin: sign out</button>
      ) : (
        <>
          <input className="min-w-0 flex-1 rounded-full border border-[#7c6041]/15 bg-white/70 px-4 text-sm outline-none" onChange={(event) => onEmail(event.target.value)} placeholder="admin email" type="email" value={authEmail} />
          <button className="rounded-full bg-[#35261b] px-4 text-sm font-bold text-[#fff7e8]">Login</button>
        </>
      )}
    </form>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

function daysAgo(value: string) {
  return (Date.now() - new Date(value).getTime()) / 86_400_000;
}
