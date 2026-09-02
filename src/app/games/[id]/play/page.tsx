import { notFound } from "next/navigation";
import { GAMES } from "@/lib/data";
import { GamePlayer } from "@/components/game-player";

export default async function PlayPage({ params }: PageProps<"/games/[id]/play">) {
  const { id } = await params;
  const game = GAMES.find((g) => g.id === id);
  if (!game) notFound();

  return <GamePlayer game={game} />;
}
