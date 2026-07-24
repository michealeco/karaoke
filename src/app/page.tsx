import { HomeActions } from "@/components/HomeActions";

export default function HomePage() {
  return (
    <main className="hero">
      <div>
        <p className="hero-brand">Chorus</p>
        <h2>Party karaoke with a shared queue.</h2>
        <p className="hero-copy">
          Put the TV display on the big screen, then let everyone queue songs from
          their phones.
        </p>
        <HomeActions />
      </div>
    </main>
  );
}
