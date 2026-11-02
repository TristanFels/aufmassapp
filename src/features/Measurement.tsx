import { useState, type FormEvent } from "react";
import { materials } from "../app/services";
import {
  MAX_QUANTITY,
  type Article,
  type ArticleSnapshot,
} from "../domain/material";
import { materialDescription, type Perform } from "./Catalog";
import { useMaterialData } from "./useMaterialData";
import "./materials.css";

export function Measurement({
  projectId,
  archived,
  busy,
  perform,
}: {
  projectId: string;
  archived: boolean;
  busy: boolean;
  perform: Perform;
}) {
  const { data, error } = useMaterialData(projectId);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [editing, setEditing] = useState<string>();
  if (error)
    return (
      <p className="notice error" role="alert">
        {error}
      </p>
    );
  if (!data) return <p role="status">Aufmaß wird geladen …</p>;
  const totals = new Map(data.totals.map((row) => [row.articleId, row]));
  const categories = [
    ...new Set(
      data.articles
        .filter((article) => article.active)
        .map((article) => article.category),
    ),
  ].sort((a, b) => a.localeCompare(b, "de"));
  const normalizedQuery = query.trim().toLocaleLowerCase("de-DE");
  const filtered = data.articles.filter(
    (article) =>
      article.active &&
      (!category || article.category === category) &&
      (!favoritesOnly || article.favorite) &&
      `${article.name} ${article.category} ${materialDescription(article)}`
        .toLocaleLowerCase("de-DE")
        .includes(normalizedQuery),
  );
  const editingArticle = data.articles.find(
    (article) => article.id === editing,
  );
  const editingTotal = editing ? totals.get(editing) : undefined;
  const pieceTotal = data.totals.reduce((sum, row) => sum + row.quantity, 0);
  return (
    <section className="section measurement" aria-label="Aufmaß">
      <div className="measurement-heading">
        <h2>Aufmaß</h2>
        <span>{pieceTotal.toLocaleString("de-DE")} Stück erfasst</span>
      </div>
      {archived && (
        <p className="notice">
          Dieses Projekt ist archiviert. Zum Ändern der Mengen bitte zuerst
          reaktivieren.
        </p>
      )}
      <details className="panel material-picker">
        <summary>
          Artikel erfassen<span aria-hidden="true">＋</span>
        </summary>
        <div className="picker-content">
          <p>
            Tippen auf +1 fügt ein Stück hinzu. Wippen und Rahmen werden separat
            gezählt.
          </p>
          <label htmlFor="measurement-search">Aufmaßartikel suchen</label>
          <input
            id="measurement-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Artikel oder Ausführung"
          />
          <label htmlFor="measurement-category">Aufmaßkategorie filtern</label>
          <select
            id="measurement-category"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
          >
            <option value="">Alle Kategorien</option>
            {categories.map((name) => (
              <option key={name}>{name}</option>
            ))}
          </select>
          <label className="check-label">
            <input
              type="checkbox"
              checked={favoritesOnly}
              onChange={(event) => setFavoritesOnly(event.target.checked)}
            />
            Nur Aufmaßfavoriten
          </label>
          {filtered.length ? (
            <ul className="material-cards" aria-label="Aufmaßartikel">
              {filtered.map((article) => {
                const quantity = totals.get(article.id)?.quantity ?? 0;
                return (
                  <li
                    className="material-card"
                    aria-label={article.name}
                    key={article.id}
                  >
                    <div className="material-card-heading">
                      <div>
                        <h3>{article.name}</h3>
                        <p className="material-category">
                          {article.category}
                          {article.favorite && " · Favorit"}
                        </p>
                      </div>
                      <span className="quantity-badge">{quantity}</span>
                    </div>
                    <p className="material-description">
                      {materialDescription(article)}
                    </p>
                    <div className="quantity-actions">
                      <button
                        className="secondary minus-button"
                        disabled={busy || archived || quantity === 0}
                        aria-label={`1 Stück ${article.name} abziehen`}
                        onClick={() =>
                          void perform(async () => {
                            await materials.decrement(projectId, article.id);
                          })
                        }
                      >
                        −1
                      </button>
                      <button
                        className="add-button"
                        disabled={busy || archived || quantity >= MAX_QUANTITY}
                        aria-label={`1 Stück ${article.name} hinzufügen`}
                        onClick={() =>
                          void perform(async () => {
                            await materials.addQuantity(
                              projectId,
                              article.id,
                              1,
                            );
                          })
                        }
                      >
                        +1 Stück
                      </button>
                      <button
                        className="secondary edit-quantity-button"
                        disabled={busy || archived}
                        aria-label={`Menge bearbeiten: ${article.name}`}
                        onClick={() => setEditing(article.id)}
                      >
                        Menge …
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="empty-state">
              Keine passenden aktiven Artikel. Favoriten legst du im
              Artikelkatalog fest.
            </p>
          )}
        </div>
      </details>
      {editingArticle && (
        <QuantityEditor
          key={editingArticle.id}
          article={editingArticle}
          snapshot={editingTotal?.snapshot ?? editingArticle}
          current={editingTotal?.quantity ?? 0}
          projectId={projectId}
          busy={busy || archived}
          perform={perform}
          close={() => setEditing(undefined)}
        />
      )}
      <section className="panel material-totals" aria-label="Materialliste">
        <h2>
          Materialliste{" "}
          <span className="count">
            {data.totals.filter((row) => row.quantity > 0).length}
          </span>
        </h2>
        {data.totals.length ? (
          <ul>
            {data.totals.map((row) => {
              const article = data.articles.find(
                (item) => item.id === row.articleId,
              );
              return (
                <li aria-label={row.snapshot.name} key={row.articleId}>
                  <div className="material-total-info">
                    <h3>{row.snapshot.name}</h3>
                    <p className="material-description">
                      {materialDescription(row.snapshot)}
                    </p>
                    {!article?.active && (
                      <span className="material-inactive">
                        Im Katalog deaktiviert
                      </span>
                    )}
                  </div>
                  <div className="material-total-quantity">
                    <output aria-label={`Gesamtmenge ${row.snapshot.name}`}>
                      {row.quantity}
                    </output>
                    <span>Stück</span>
                    <button
                      className="secondary"
                      disabled={busy || archived || !article}
                      aria-label={`Menge bearbeiten: ${row.snapshot.name}`}
                      onClick={() => setEditing(row.articleId)}
                    >
                      Ändern
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="empty-state">
            Noch kein Material erfasst. Öffne „Artikel erfassen“ und starte mit
            +1.
          </p>
        )}
        <p className="field-help">
          Mengen werden pro Artikelvariante zusammengefasst. Bereits erfasste
          Bezeichnungen und Ausführungen bleiben bei späteren Katalogänderungen
          erhalten.
        </p>
      </section>
    </section>
  );
}

function QuantityEditor({
  article,
  snapshot,
  current,
  projectId,
  busy,
  perform,
  close,
}: {
  article: Article;
  snapshot: ArticleSnapshot;
  current: number;
  projectId: string;
  busy: boolean;
  perform: Perform;
  close: () => void;
}) {
  const [value, setValue] = useState("1");
  const quantity = value === "" ? NaN : Number(value);
  const valid =
    Number.isSafeInteger(quantity) && quantity >= 0 && quantity <= MAX_QUANTITY;
  async function add(event: FormEvent) {
    event.preventDefault();
    if (!valid || quantity === 0 || !article.active) return;
    await perform(async () => {
      await materials.addQuantity(projectId, article.id, quantity);
      close();
    });
  }
  return (
    <section
      className="panel quantity-editor"
      aria-label={`Mengeneingabe: ${snapshot.name}`}
    >
      <h2>{snapshot.name}</h2>
      <p>
        Aktuelle Gesamtmenge: <strong>{current} Stück</strong>
      </p>
      {!article.active && (
        <p>
          Dieser Artikel ist deaktiviert. Du kannst bestehende Mengen
          reduzieren. Für zusätzliche Stücke den Artikel im Katalog
          reaktivieren.
        </p>
      )}
      <form onSubmit={(event) => void add(event)}>
        <fieldset disabled={busy}>
          <label htmlFor="quantity-value">Menge für {snapshot.name}</label>
          <input
            id="quantity-value"
            type="number"
            inputMode="numeric"
            min="0"
            max={MAX_QUANTITY}
            step="1"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            autoFocus
            required
          />
          <p className="field-help">
            „Menge hinzufügen“ zählt die Eingabe dazu. „Gesamtmenge setzen“
            ersetzt die Summe durch die Eingabe.
          </p>
          <div className="actions">
            <button
              type="submit"
              disabled={
                !valid ||
                quantity === 0 ||
                !article.active ||
                current + quantity > MAX_QUANTITY
              }
            >
              Menge hinzufügen
            </button>
            <button
              type="button"
              className="secondary"
              disabled={!valid || (!article.active && quantity > current)}
              onClick={() =>
                void perform(async () => {
                  await materials.setTotal(projectId, article.id, quantity);
                  close();
                })
              }
            >
              Gesamtmenge setzen
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
