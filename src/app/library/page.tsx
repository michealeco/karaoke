import { SongLibrary } from "@/components/SongLibrary";

export default function LibraryPage() {
  return (
    <main className="page">
      <header className="page-header">
        <p className="eyebrow">Catalog</p>
        <h1>Song library</h1>
        <p className="panel-copy">
          Keep your karaoke MP4s here. Rooms pull from this shared catalog.
        </p>
      </header>
      <SongLibrary />
    </main>
  );
}
