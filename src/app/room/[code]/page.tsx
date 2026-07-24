import { Suspense } from "react";
import { RoomClient } from "@/components/RoomClient";

type Props = {
  params: Promise<{ code: string }>;
};

export default async function RoomPage({ params }: Props) {
  const { code } = await params;
  return (
    <main className="room-main">
      <Suspense fallback={<p className="muted phone-pad">Loading room…</p>}>
        <RoomClient code={code.toUpperCase()} />
      </Suspense>
    </main>
  );
}
