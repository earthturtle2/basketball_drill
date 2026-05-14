import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api, ApiError } from "../api";
import { useAuth } from "../auth";
import { useT } from "../i18n";
import { TEMPLATES } from "../tactic/templates";
import { displayTacticCategory } from "../tactic/categories";

type PlayListItem = {
  id: string;
  name: string;
  category?: string;
  teamId: string | null;
  teamIds: string[];
  updatedAt: string;
};

type Team = {
  id: string;
  name: string;
  color: string;
};

type PrepListItem = {
  id: string;
  title: string;
  opponent: string | null;
  gameDate: string | null;
  teamId: string | null;
  entryCount: number;
  categories: string[];
  updatedAt: string;
};

type ListResponse<T> = {
  items: T[];
  total?: number;
};

function formatShortDate(value: string | null) {
  if (!value) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year!, month! - 1, day!).toLocaleDateString();
  }
  return new Date(value).toLocaleDateString();
}

function GuestHome() {
  const { t } = useT();
  const flow = [
    { title: t("home.guestFlow1Title"), text: t("home.guestFlow1Text") },
    { title: t("home.guestFlow2Title"), text: t("home.guestFlow2Text") },
    { title: t("home.guestFlow3Title"), text: t("home.guestFlow3Text") },
  ];
  const points = [t("home.previewPoint1"), t("home.previewPoint2"), t("home.previewPoint3")];

  return (
    <div className="home-page home-page--guest">
      <section className="home-hero card">
        <div className="home-hero__copy">
          <p className="home-kicker">{t("home.guestKicker")}</p>
          <h1>{t("home.guestTitle")}</h1>
          <p className="home-hero__lead">{t("home.guestHint")}</p>
          <div className="row-actions">
            <Link to="/login" className="btn btn-primary">
              {t("home.guestPrimary")}
            </Link>
            <Link to="/register" className="btn btn-ghost">
              {t("home.guestSecondary")}
            </Link>
          </div>
        </div>
        <div className="home-court-card" aria-label={t("home.previewTitle")}>
          <div className="home-court-card__header">
            <span>{t("home.previewTitle")}</span>
            <strong>{t("home.previewMeta")}</strong>
          </div>
          <div className="home-court-mini" aria-hidden="true">
            <span className="home-court-mini__line home-court-mini__line--paint" />
            <span className="home-court-mini__line home-court-mini__line--arc" />
            <span className="home-court-mini__player home-court-mini__player--one">1</span>
            <span className="home-court-mini__player home-court-mini__player--two">5</span>
            <span className="home-court-mini__player home-court-mini__player--three">2</span>
            <span className="home-court-mini__player home-court-mini__player--defense">D</span>
            <span className="home-court-mini__path home-court-mini__path--roll" />
            <span className="home-court-mini__path home-court-mini__path--pass" />
          </div>
          <div className="home-preview-points">
            {points.map((point, index) => (
              <span key={point}>
                <strong>{index + 1}</strong>
                {point}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="home-flow">
        <div>
          <p className="home-kicker">{t("home.guestFlowTitle")}</p>
          <h2>{t("home.guestFlowHeading")}</h2>
        </div>
        <div className="home-flow__grid">
          {flow.map((item, index) => (
            <article className="home-flow-card" key={item.title}>
              <span className="home-flow-card__num">{String(index + 1).padStart(2, "0")}</span>
              <h3>{item.title}</h3>
              <p className="muted">{item.text}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function CoachDashboard() {
  const { user } = useAuth();
  const { t } = useT();
  const [plays, setPlays] = useState<PlayListItem[]>([]);
  const [playTotal, setPlayTotal] = useState(0);
  const [teams, setTeams] = useState<Team[]>([]);
  const [preps, setPreps] = useState<PrepListItem[]>([]);
  const [prepTotal, setPrepTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setErr(null);
      try {
        const [playRes, teamRes, prepRes] = await Promise.all([
          api<ListResponse<PlayListItem>>("/api/v1/plays?pageSize=6"),
          api<Team[]>("/api/v1/teams"),
          api<ListResponse<PrepListItem>>("/api/v1/match-preps?pageSize=6"),
        ]);
        if (cancelled) return;
        setPlays(playRes.items);
        setPlayTotal(playRes.total ?? playRes.items.length);
        setTeams(teamRes);
        setPreps(prepRes.items);
        setPrepTotal(prepRes.total ?? prepRes.items.length);
      } catch (e) {
        if (!cancelled) setErr(e instanceof ApiError ? e.message : t("home.loadFailed"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [t]);

  const nextPrep = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dated = preps
      .filter((prep) => prep.gameDate)
      .sort((a, b) => new Date(a.gameDate!).getTime() - new Date(b.gameDate!).getTime());
    return dated.find((prep) => new Date(prep.gameDate!).getTime() >= today.getTime()) ?? preps[0] ?? null;
  }, [preps]);

  const readiness = [
    {
      done: teams.length > 0,
      title: t("home.readinessTeam"),
      text: teams.length > 0 ? t("home.readinessTeamDone") : t("home.readinessTeamTodo"),
      to: "/teams",
    },
    {
      done: playTotal > 0,
      title: t("home.readinessPlay"),
      text: playTotal > 0 ? t("home.readinessPlayDone") : t("home.readinessPlayTodo"),
      to: playTotal > 0 ? "/library" : "/plays",
    },
    {
      done: prepTotal > 0,
      title: t("home.readinessPrep"),
      text: prepTotal > 0 ? t("home.readinessPrepDone") : t("home.readinessPrepTodo"),
      to: "/match-preps",
    },
  ];
  const readyCount = readiness.filter((step) => step.done).length;
  const nextAction = !teams.length
    ? { to: "/teams", label: t("home.actionCreateTeam") }
    : playTotal === 0
      ? { to: "/plays?quickStart=1", label: t("home.actionUseTemplate") }
      : prepTotal === 0
        ? { to: "/match-preps", label: t("home.actionBuildPrep") }
        : { to: "/match-preps", label: t("home.actionOpenPrep") };

  return (
    <div className="home-page">
      <section className="home-dashboard-hero card">
        <div>
          <p className="home-kicker">{t("home.coachKicker")}</p>
          <h1>
            {t("home.coachTitle").replace("{name}", user?.name?.trim() || user?.email || t("app.account"))}
          </h1>
          <p className="home-hero__lead">{t("home.coachHint")}</p>
        </div>
        <div className="home-dashboard-hero__actions">
          <Link to={nextAction.to} className="btn btn-primary">
            {nextAction.label}
          </Link>
          <Link to="/plays" className="btn btn-ghost">
            {t("home.actionPlays")}
          </Link>
        </div>
      </section>

      {err ? <p className="error">{err}</p> : null}
      {loading ? <p className="hint">{t("home.loading")}</p> : null}

      <section className="home-stat-grid" aria-label={t("home.statsLabel")}>
        <Link to="/plays" className="home-stat-card">
          <span>{t("home.statPlays")}</span>
          <strong>{playTotal}</strong>
        </Link>
        <Link to="/teams" className="home-stat-card">
          <span>{t("home.statTeams")}</span>
          <strong>{teams.length}</strong>
        </Link>
        <Link to="/match-preps" className="home-stat-card">
          <span>{t("home.statPreps")}</span>
          <strong>{prepTotal}</strong>
        </Link>
        <Link to="/library" className="home-stat-card">
          <span>{t("home.statTemplates")}</span>
          <strong>{TEMPLATES.length}</strong>
        </Link>
      </section>

      <section className="home-dashboard-grid">
        <article className="card home-readiness">
          <div className="home-section-heading">
            <div>
              <p className="home-kicker">{t("home.readinessKicker")}</p>
              <h2>{t("home.readinessTitle")}</h2>
            </div>
            <span className="status-pill">
              {readyCount}/3
            </span>
          </div>
          <p className="muted">{t("home.readinessHint")}</p>
          <div className="home-readiness__steps">
            {readiness.map((step, index) => (
              <Link
                key={step.title}
                to={step.to}
                className={`home-readiness-step${step.done ? " home-readiness-step--done" : ""}`}
              >
                <span>{step.done ? "✓" : index + 1}</span>
                <div>
                  <strong>{step.title}</strong>
                  <p>{step.text}</p>
                </div>
              </Link>
            ))}
          </div>
        </article>

        <article className="card home-next-prep">
          <div className="home-section-heading">
            <div>
              <p className="home-kicker">{t("home.nextPrepKicker")}</p>
              <h2>{t("home.nextPrepTitle")}</h2>
            </div>
            <Link to="/match-preps" className="btn btn-sm btn-ghost">
              {t("home.open")}
            </Link>
          </div>
          {nextPrep ? (
            <Link to={`/match-preps/${nextPrep.id}`} className="home-next-prep__card">
              <strong>{nextPrep.title}</strong>
              <p className="muted">
                {nextPrep.opponent ? `${t("home.vs")} ${nextPrep.opponent} · ` : ""}
                {nextPrep.gameDate ? `${formatShortDate(nextPrep.gameDate)} · ` : ""}
                {t("home.entries").replace("{count}", String(nextPrep.entryCount))}
              </p>
              <div className="row-actions">
                {nextPrep.categories.slice(0, 3).map((category) => (
                  <span className="status-pill" key={category}>
                    {displayTacticCategory(category, t)}
                  </span>
                ))}
              </div>
            </Link>
          ) : (
            <div className="home-empty-state">
              <p className="muted">{t("home.nextPrepEmpty")}</p>
              <Link to="/match-preps" className="btn btn-primary">
                {t("home.actionBuildPrep")}
              </Link>
            </div>
          )}
        </article>
      </section>

      <section className="home-dashboard-grid home-dashboard-grid--wide">
        <article className="card">
          <div className="home-section-heading">
            <div>
              <p className="home-kicker">{t("home.recentKicker")}</p>
              <h2>{t("home.recentTitle")}</h2>
            </div>
            <Link to="/plays" className="btn btn-sm btn-ghost">
              {t("home.open")}
            </Link>
          </div>
          <div className="home-recent-list">
            {plays.length > 0 ? (
              plays.slice(0, 4).map((play) => (
                <Link to={`/plays/${play.id}`} className="home-recent-play" key={play.id}>
                  <div>
                    <strong>{play.name}</strong>
                    <p className="muted">
                      {play.category ? `${displayTacticCategory(play.category, t)} · ` : ""}
                      {t("home.updatedAt")} {formatShortDate(play.updatedAt)}
                    </p>
                  </div>
                  <span aria-hidden="true">→</span>
                </Link>
              ))
            ) : (
              <div className="home-empty-state">
                <p className="muted">{t("home.recentEmpty")}</p>
                <Link to="/plays?quickStart=1" className="btn btn-primary">
                  {t("home.actionUseTemplate")}
                </Link>
              </div>
            )}
          </div>
        </article>

        <article className="card home-professional-card">
          <p className="home-kicker">{t("home.professionalKicker")}</p>
          <h2>{t("home.professionalTitle")}</h2>
          <p className="muted">{t("home.professionalHint")}</p>
          <div className="home-professional-list">
            {[1, 2, 3, 4].map((step) => (
              <span key={step}>
                <strong>{step}</strong>
                {t(`home.professional${step}`)}
              </span>
            ))}
          </div>
        </article>
      </section>
    </div>
  );
}

export function HomePage() {
  const { user, loading } = useAuth();
  const { t } = useT();

  if (loading) return <p className="hint">{t("view.loading")}</p>;
  return user ? <CoachDashboard /> : <GuestHome />;
}
