import { SongLibrary } from "@/components/SongLibrary";

export default function LibraryPage() {
  return (
    <main className="page">
      <header className="page-header">
        <p className="eyebrow">Catalog</p>
        <h1>Song library</h1>
        <p className="panel-copy">
          Upload karaoke MP4s to your Ubuntu media server. Rooms play from there.
        </p>
      </header>
      <SongLibrary />
    </main>
  );
}
