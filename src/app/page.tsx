import { HomeActions } from "@/components/HomeActions";

export default function HomePage() {
  return (
    <main className="hero">
      <div className="hero-inner">
        <p className="hero-brand">Chorus</p>
        <h2>Karaoke for the TV and your phone.</h2>
        <p className="hero-copy">
          Smart TV shows the stage. Phones search, queue, and pass the mic.
        </p>
        <HomeActions />
      </div>
    </main>
  );
}
