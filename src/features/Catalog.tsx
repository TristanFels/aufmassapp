import { useState, type FormEvent } from "react";
import { materials } from "../app/services";
import {
  MAX_ARTICLE_FIELD_LENGTH,
  MAX_ARTICLE_NAME_LENGTH,
  type Article,
  type ArticleInput,
  type ArticleSnapshot,
} from "../domain/material";
import { useMaterialData } from "./useMaterialData";
import "./materials.css";

export type Perform = (operation: () => Promise<void>) => Promise<void>;

export function materialDescription(article: ArticleSnapshot | Article) {
  return (
    [article.manufacturer, article.series, article.color]
      .filter(Boolean)
      .join(" · ") || "Ohne Herstellerzuordnung"
  );
}

export function Catalog({
  busy,
  perform,
}: {
  busy: boolean;
  perform: Perform;
}) {
  const { data, error } = useMaterialData();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [status, setStatus] = useState("active");
  const [editing, setEditing] = useState<Article | "new">();
  if (error)
    return (
      <p className="notice error" role="alert">
        {error}
      </p>
    );
  if (!data) return <p role="status">Artikel werden geladen …</p>;
  const categories = [
    ...new Set(data.articles.map((article) => article.category)),
  ].sort((a, b) => a.localeCompare(b, "de"));
  const normalizedQuery = query.trim().toLocaleLowerCase("de-DE");
  const filtered = data.articles.filter(
    (article) =>
      (status === "all" || article.active === (status === "active")) &&
      (!category || article.category === category) &&
      (!favoritesOnly || article.favorite) &&
      `${article.name} ${article.category} ${materialDescription(article)}`
        .toLocaleLowerCase("de-DE")
        .includes(normalizedQuery),
  );
  return (
    <>
      <section className="panel catalog-intro" aria-label="Katalogpflege">
        <h2>Dein Material. Direkt vor Ort.</h2>
        <p>
          Artikel ergänzen und bearbeiten – auch ohne Internet. Wippen,
          Abdeckungen und Rahmen werden in dieser Version einzeln erfasst.
        </p>
        <button disabled={busy} onClick={() => setEditing("new")}>
          Artikel anlegen
        </button>
      </section>
      {editing && (
        <ArticleForm
          key={editing === "new" ? "new" : editing.id}
          article={editing === "new" ? undefined : editing}
          categories={categories}
          busy={busy}
          perform={perform}
          close={() => setEditing(undefined)}
        />
      )}
      <section className="panel material-filters" aria-label="Katalogfilter">
        <label htmlFor="catalog-search">Artikel suchen</label>
        <input
          id="catalog-search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Name, Kategorie oder Ausführung"
        />
        <div className="filter-grid">
          <div>
            <label htmlFor="catalog-category">Kategorie filtern</label>
            <select
              id="catalog-category"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
            >
              <option value="">Alle Kategorien</option>
              {categories.map((name) => (
                <option key={name}>{name}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="catalog-status">Artikelstatus</label>
            <select
              id="catalog-status"
              value={status}
              onChange={(event) => setStatus(event.target.value)}
            >
              <option value="active">Aktive Artikel</option>
              <option value="inactive">Deaktivierte Artikel</option>
              <option value="all">Alle Artikel</option>
            </select>
          </div>
        </div>
        <label className="check-label">
          <input
            type="checkbox"
            checked={favoritesOnly}
            onChange={(event) => setFavoritesOnly(event.target.checked)}
          />
          Nur Favoriten
        </label>
      </section>
      <section className="section" aria-label="Katalogartikel">
        <h2>
          Artikel <span className="count">{filtered.length}</span>
        </h2>
        {filtered.length ? (
          <ul className="material-cards" aria-label="Artikelkatalog">
            {filtered.map((article) => (
              <li
                className="material-card"
                aria-label={article.name}
                key={article.id}
              >
                <div className="material-card-heading">
                  <div>
                    <h3>{article.name}</h3>
                    <p className="material-category">
                      {article.category} · {article.unit}
                      {!article.active && " · Deaktiviert"}
                    </p>
                  </div>
                  <button
                    className="favorite-button secondary"
                    aria-label={`Favorit: ${article.name}`}
                    aria-pressed={article.favorite}
                    disabled={busy}
                    onClick={() =>
                      void perform(async () => {
                        await materials.setFavorite(
                          article.id,
                          !article.favorite,
                        );
                      })
                    }
                  >
                    <span aria-hidden="true">
                      {article.favorite ? "★" : "☆"}
                    </span>
                  </button>
                </div>
                <p className="material-description">
                  {materialDescription(article)}
                </p>
                <div className="material-actions">
                  <button
                    className="secondary"
                    disabled={busy}
                    aria-label={`Artikel bearbeiten: ${article.name}`}
                    onClick={() => setEditing(article)}
                  >
                    Bearbeiten
                  </button>
                  <button
                    className="secondary"
                    disabled={busy}
                    aria-label={`Artikel ${article.active ? "deaktivieren" : "reaktivieren"}: ${article.name}`}
                    onClick={() =>
                      void perform(async () => {
                        await materials.setActive(article.id, !article.active);
                      })
                    }
                  >
                    {article.active ? "Deaktivieren" : "Reaktivieren"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="empty-state">
            Keine passenden Artikel. Ändere die Filter oder lege einen eigenen
            Artikel an.
          </p>
        )}
      </section>
    </>
  );
}

function ArticleForm({
  article,
  categories,
  busy,
  perform,
  close,
}: {
  article?: Article;
  categories: string[];
  busy: boolean;
  perform: Perform;
  close: () => void;
}) {
  const [fields, setFields] = useState<ArticleInput>(
    article
      ? {
          name: article.name,
          category: article.category,
          manufacturer: article.manufacturer,
          series: article.series,
          color: article.color,
        }
      : {
          name: "",
          category: "Sonstiges",
          manufacturer: "Gira",
          series: "System 55",
          color: "Reinweiß glänzend",
        },
  );
  function setField(field: keyof ArticleInput, value: string) {
    setFields((previous) => ({ ...previous, [field]: value }));
  }
  function submit(event: FormEvent) {
    event.preventDefault();
    void perform(async () => {
      if (article) await materials.updateArticle(article.id, fields);
      else await materials.createArticle(fields);
      close();
    });
  }
  return (
    <section
      className="panel"
      aria-label={article ? "Artikel bearbeiten" : "Neuer Artikel"}
    >
      <h2>{article ? "Artikel bearbeiten" : "Neuer Artikel"}</h2>
      <form onSubmit={submit}>
        <fieldset disabled={busy}>
          <label htmlFor="article-name">Artikelname</label>
          <input
            id="article-name"
            value={fields.name}
            onChange={(event) => setField("name", event.target.value)}
            maxLength={MAX_ARTICLE_NAME_LENGTH}
            autoFocus
            required
          />
          <label htmlFor="article-category">Kategorie</label>
          <input
            id="article-category"
            value={fields.category}
            onChange={(event) => setField("category", event.target.value)}
            list="article-categories"
            maxLength={MAX_ARTICLE_FIELD_LENGTH}
            required
          />
          <datalist id="article-categories">
            {categories.map((category) => (
              <option value={category} key={category} />
            ))}
          </datalist>
          <p className="field-help">
            Einheit: Stück. Die folgenden Angaben sind optional.
          </p>
          <label htmlFor="article-manufacturer">Hersteller</label>
          <input
            id="article-manufacturer"
            value={fields.manufacturer}
            onChange={(event) => setField("manufacturer", event.target.value)}
            maxLength={MAX_ARTICLE_FIELD_LENGTH}
          />
          <label htmlFor="article-series">Serie</label>
          <input
            id="article-series"
            value={fields.series}
            onChange={(event) => setField("series", event.target.value)}
            maxLength={MAX_ARTICLE_FIELD_LENGTH}
          />
          <label htmlFor="article-color">Farbe</label>
          <input
            id="article-color"
            value={fields.color}
            onChange={(event) => setField("color", event.target.value)}
            maxLength={MAX_ARTICLE_FIELD_LENGTH}
          />
          {article && (
            <p className="field-help">
              Bereits erfasste Materialien behalten ihre gespeicherte
              Bezeichnung und Ausführung. Für eine andere Serie, Farbe oder
              einen anderen Hersteller nach erfolgter Erfassung bitte einen
              neuen Artikel anlegen.
            </p>
          )}
          <div className="actions">
            <button
              type="submit"
              disabled={!fields.name.trim() || !fields.category.trim()}
            >
              Artikel speichern
            </button>
            <button type="button" className="secondary" onClick={close}>
              Abbrechen
            </button>
          </div>
        </fieldset>
      </form>
    </section>
  );
}
