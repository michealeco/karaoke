import { HomeActions } from "@/components/HomeActions";
import Link from "next/link";

export default function HomePage() {
  return (
    <main className="hero">
      <div className="hero-inner">
        <p className="hero-brand">Chorus</p>
        <h2>Party karaoke on your TV.</h2>
        <p className="hero-copy">
          Pick this device below, then start a room on the TV or join with the
          code on your phone. New here?{" "}
          <Link href="/how-to" className="inline-link">
            Read the how-to
          </Link>
          .
        </p>
        <HomeActions />
      </div>
    </main>
  );
}
