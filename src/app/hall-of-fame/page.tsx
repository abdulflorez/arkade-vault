import Link from "next/link";
import { GAMES } from "@/lib/data";
import { getLeaderboard, getUserBest, type LeaderboardRow } from "@/lib/scores";
import { createClient } from "@/lib/supabase/server";

const TOP = 12;

function PodiumSlot({
  row,
  place,
  className,
}: {
  row: LeaderboardRow | undefined;
  place: 1 | 2 | 3;
  className: string;
}) {
  const gold = place === 1;
  return (
    <div className={"podium-slot " + className}>
      {gold && (
        <div
          className="pixel"
          style={{ fontSize: 9, color: "var(--gold)", letterSpacing: "0.18em" }}
        >
          CAMPEÓN
        </div>
      )}
      <div className="rank-num" style={gold ? { fontSize: 36, marginTop: 4 } : undefined}>
        {String(place).padStart(2, "0")}
      </div>
      <div className="name">{row ? row.username : "---"}</div>
      <div className="score" style={gold ? { fontSize: 20 } : undefined}>
        {row ? row.score.toLocaleString("es-ES") : "---"}
      </div>
      <div className="date">{row?.date ?? ""}</div>
    </div>
  );
}

export default async function HallOfFamePage({ searchParams }: PageProps<"/hall-of-fame">) {
  const { game: gameParam } = await searchParams;
  const game = GAMES.find((g) => g.id === gameParam) ?? GAMES[0];

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [rows, you] = await Promise.all([
    getLeaderboard(game.id, TOP),
    user ? getUserBest(game.id, user.id) : Promise.resolve(null),
  ]);

  return (
    <div className="av-hall fade-in">
      <div className="hall-head">
        <h1>SALÓN DE LA FAMA</h1>
        <p className="pixel" style={{ fontSize: 10 }}>
          LOS NOMBRES QUE NUNCA SE BORRAN DE LA PANTALLA
        </p>
      </div>

      <div className="hall-tabs">
        {GAMES.map((g) => (
          <Link
            key={g.id}
            href={`/hall-of-fame?game=${g.id}`}
            className={"chip" + (game.id === g.id ? " active" : "")}
            scroll={false}
          >
            {g.title}
          </Link>
        ))}
      </div>

      <div className="podium">
        <PodiumSlot row={rows[1]} place={2} className="silver" />
        <PodiumSlot row={rows[0]} place={1} className="gold" />
        <PodiumSlot row={rows[2]} place={3} className="bronze" />
      </div>

      <div className="hall-table">
        <div className="th">
          <div>RANGO</div>
          <div>JUGADOR</div>
          <div>PUNTUACIÓN</div>
          <div>FECHA</div>
        </div>
        {rows.length === 0 && <div className="lb-empty">SIN MARCAS AÚN · SÉ EL PRIMERO</div>}
        {rows.map((r, i) => (
          <div
            key={r.userId}
            className={"tr" + (i === 0 ? " top1" : i === 1 ? " top2" : i === 2 ? " top3" : "")}
            style={{ animationDelay: `${i * 50}ms` }}
          >
            <div className="rk">#{String(r.rank).padStart(2, "0")}</div>
            <div className="pl">{r.username}</div>
            <div className="sc">{r.score.toLocaleString("es-ES")}</div>
            <div className="dt">{r.date}</div>
          </div>
        ))}
        {user && (
          <>
            <div className="tr you-label">▸ TU MEJOR MARCA EN {game.title}</div>
            {you ? (
              <div className="tr you" style={{ animationDelay: `${rows.length * 50 + 50}ms` }}>
                <div className="rk" style={{ color: "var(--yellow)" }}>
                  #{String(you.rank).padStart(2, "0")}
                </div>
                <div className="pl" style={{ color: "var(--yellow)" }}>
                  {you.username}
                </div>
                <div
                  className="sc"
                  style={{ color: "var(--yellow)", textShadow: "0 0 6px rgba(245,255,0,0.5)" }}
                >
                  {you.score.toLocaleString("es-ES")}
                </div>
                <div className="dt">{you.date}</div>
              </div>
            ) : (
              <Link href={`/games/${game.id}`} className="lb-empty" style={{ display: "block" }}>
                AÚN SIN MARCA · JUEGA AHORA
              </Link>
            )}
          </>
        )}
      </div>

      <div style={{ textAlign: "center", marginTop: 32 }}>
        <Link href="/games" className="btn lg">
          VOLVER A LA BIBLIOTECA
        </Link>
      </div>
    </div>
  );
}
