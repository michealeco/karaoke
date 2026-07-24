import { HomeActions } from "@/components/HomeActions";

export default function HomePage() {
  return (
    <main className="hero">
      <div>
        <p className="hero-brand">Chorus</p>
        <h2>Party karaoke with a shared queue.</h2>
        <p className="hero-copy">
          Upload MP4s to your library, open a room, and let everyone add the next
          song from their phone.
        </p>
        <HomeActions />
      </div>
    </main>
  );
}
