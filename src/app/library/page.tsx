import { SongLibrary } from "@/components/SongLibrary";
import Link from "next/link";

export default function LibraryPage() {
  return (
    <main className="page">
      <header className="page-header">
        <p className="eyebrow">Before the party</p>
        <h1>Song library</h1>
        <p className="panel-copy">
          Upload karaoke MP4s here first. Then start a room and queue these
          songs from any phone. Need the full walkthrough?{" "}
          <Link href="/how-to" className="inline-link">
            Open How to
          </Link>
          .
        </p>
      </header>
      <SongLibrary />
    </main>
  );
}
