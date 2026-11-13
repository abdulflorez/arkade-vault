import { GamesBrowser } from "@/components/games-browser";
import { getGameStats } from "@/lib/scores";

export default async function GamesPage() {
  const stats = await getGameStats();
  const bests = Object.fromEntries(Object.entries(stats).map(([id, s]) => [id, s.best]));

  return (
    <div className="fade-in">
      <section className="av-hero">
        <h1 className="flicker">ARCADE VAULT</h1>
        <div className="sub">
          INSERTA UNA MONEDA PARA JUGAR <span className="blink">_</span>
        </div>
      </section>

      <GamesBrowser bests={bests} />
    </div>
  );
}
