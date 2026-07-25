import Link from "next/link";

export default function HowToPage() {
  return (
    <main className="page howto-page">
      <header className="page-header">
        <p className="eyebrow">Tutorial</p>
        <h1>How to run Chorus</h1>
        <p className="panel-copy">
          Follow these steps in order. One TV shows the stage; phones add songs
          and control the night.
        </p>
      </header>

      <section className="panel howto-section">
        <h2>What you need</h2>
        <ol className="howto-list">
          <li>
            <strong>A smart TV browser</strong> — open this same Chorus website
            on the TV.
          </li>
          <li>
            <strong>At least one phone</strong> — guests use phones to search and
            queue songs.
          </li>
          <li>
            <strong>Karaoke MP4 files</strong> — videos with lyrics already burned
            into the picture (only the library owner uploads these in Library).
          </li>
        </ol>
      </section>

      <section className="panel howto-section">
        <h2>Step 1 — Add songs (library owner only)</h2>
        <ol className="howto-list">
          <li>
            Open <Link href="/library">Library</Link> in the top menu. Guests can
            browse the list but cannot upload.
          </li>
          <li>
            If you are the owner, enter your <strong>owner password</strong> and
            tap <strong>Unlock uploads</strong>.
          </li>
          <li>
            Type the <strong>song title</strong> and optional artist.
          </li>
          <li>
            Choose an <strong>.mp4</strong> file that already has lyrics on
            screen.
          </li>
          <li>
            Tap <strong>Add to library</strong> and wait until upload finishes.
          </li>
        </ol>
        <p className="panel-copy howto-note">
          Do this before the party (or anytime). Rooms can only play songs that
          are already in the library. Guests queue songs from rooms — they never
          upload files.
        </p>
      </section>

      <section className="panel howto-section">
        <h2>Step 2 — Start the room on the TV</h2>
        <ol className="howto-list">
          <li>
            On the TV, open Chorus and choose <strong>Smart TV</strong>.
          </li>
          <li>
            Tap <strong>Start a room</strong>. You become the host for this room.
          </li>
          <li>
            Leave that page open — a big <strong>room code</strong> appears for
            phones to join.
          </li>
        </ol>
        <p className="panel-copy howto-note">
          Tip: point the remote at a button and press OK, or use ↑ ↓ ← → then OK.
        </p>
      </section>

      <section className="panel howto-section">
        <h2>Step 3 — Join from phones</h2>
        <ol className="howto-list">
          <li>
            On each phone, open the same Chorus website.
          </li>
          <li>
            Choose <strong>Phone</strong>.
          </li>
          <li>
            Type your name (optional), enter the <strong>room code</strong> from
            the TV, then tap <strong>Join</strong>.
          </li>
        </ol>
      </section>

      <section className="panel howto-section">
        <h2>Step 4 — Queue and sing</h2>
        <ol className="howto-list">
          <li>
            On a phone, open the <strong>Add song</strong> tab.
          </li>
          <li>
            Search, then tap <strong>Add to queue</strong>.
          </li>
          <li>
            On the TV (host), press <strong>Play</strong> when ready. Use{" "}
            <strong>Skip</strong> / <strong>Prev</strong> as needed.
          </li>
          <li>
            Guests keep adding songs; the TV shows what’s up next.
          </li>
        </ol>
      </section>

      <section className="panel howto-section">
        <h2>Smart TV remote</h2>
        <ul className="howto-bullets">
          <li>
            <strong>Cursor remote:</strong> move the pointer onto a button, press
            OK.
          </li>
          <li>
            <strong>D-pad remote:</strong> use arrows to highlight a button, press
            OK.
          </li>
          <li>
            <strong>Back:</strong> leaves the current page (browser back).
          </li>
        </ul>
      </section>

      <section className="panel howto-section">
        <h2>If something doesn’t work</h2>
        <ul className="howto-bullets">
          <li>
            <strong>Room not found</strong> — check the 6-letter code on the TV
            and that you’re on the same website.
          </li>
          <li>
            <strong>No songs</strong> — ask the owner to unlock Library and upload
            MP4s first.
          </li>
          <li>
            <strong>TV looks like a phone</strong> — on the home screen, tap{" "}
            <strong>Smart TV</strong>, then start or join again.
          </li>
          <li>
            <strong>Video won’t play</strong> — start the room from the TV (host),
            then press Play after a song is queued.
          </li>
          <li>
            <strong>Upload fails / Unlock fails</strong> — set{" "}
            <code>LIBRARY_ADMIN_SECRET</code> on Vercel (and redeploy). Use that
            same password on the Library page. The media server must also be
            online.
          </li>
        </ul>
      </section>

      <div className="howto-actions">
        <Link href="/library" className="btn btn-ghost" data-tv-focus tabIndex={0}>
          Go to Library
        </Link>
        <Link href="/" className="btn btn-primary" data-tv-focus tabIndex={0}>
          Start or join a room
        </Link>
      </div>
    </main>
  );
}
