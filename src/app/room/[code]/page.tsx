import { RoomClient } from "@/components/RoomClient";

type Props = {
  params: Promise<{ code: string }>;
};

export default async function RoomPage({ params }: Props) {
  const { code } = await params;
  return (
    <main>
      <RoomClient code={code.toUpperCase()} />
    </main>
  );
}
