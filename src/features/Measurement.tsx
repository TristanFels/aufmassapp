import { useState } from "react";
import { materials, measurements } from "../app/services";
import { MAX_QUANTITY, type MaterialTotal } from "../domain/material";
import { materialDescription, type Perform } from "./Catalog";
import { useMaterialData } from "./useMaterialData";
import { downloadFile } from "../platform/download";
import "./materials.css";

export function MaterialList({ totals }: { totals: MaterialTotal[] }) {
  return (
    <ul className="material-cards">
      {totals.map((row) => (
        <li className="material-card" key={row.articleId}>
          <h3>{row.snapshot.name}</h3>
          <p>{materialDescription(row.snapshot)}</p>
          <output aria-label={`Gesamtmenge ${row.snapshot.name}`}>
            {row.quantity}
          </output>{" "}
          Stück
        </li>
      ))}
    </ul>
  );
}

export function Measurement({
  projectId,
  measurementId,
  archived,
  busy,
  perform,
}: {
  projectId: string;
  measurementId: string;
  archived: boolean;
  busy: boolean;
  perform: Perform;
}) {
  const { data, error } = useMaterialData(projectId, measurementId);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [selected, setSelected] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [editing, setEditing] = useState<string>();
  const [totalValue, setTotalValue] = useState("");
  if (error)
    return (
      <p role="alert" className="notice error">
        {error}
      </p>
    );
  if (!data) return <p role="status">Aufmaß wird geladen …</p>;
  const active = data.articles.filter((a) => a.active);
  const filtered = active.filter(
    (a) =>
      (!category || a.category === category) &&
      `${a.name} ${a.category} ${materialDescription(a)}`
        .toLocaleLowerCase("de")
        .includes(query.trim().toLocaleLowerCase("de")),
  );
  const article = active.find((a) => a.id === selected);
  const amount = quantity === "" ? NaN : Number(quantity);
  const valid =
    Number.isSafeInteger(amount) && amount > 0 && amount <= MAX_QUANTITY;
  const editAmount = totalValue === "" ? NaN : Number(totalValue);
  return (
    <section
      className="individual-measurement"
      aria-label="Individuelles Aufmaß"
    >
      {archived && (
        <p className="notice">
          Dieses Projekt ist archiviert. Zum Bearbeiten bitte reaktivieren.
        </p>
      )}
      <section className="panel">
        <h2>Artikel zum Aufmaß hinzufügen</h2>
        <p>
          Artikel auswählen und eine zusätzliche Stückzahl eingeben. Wippen und
          Rahmen werden separat erfasst.
        </p>
        <label htmlFor="measurement-search">Aufmaßartikel suchen</label>
        <input
          id="measurement-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <label htmlFor="measurement-category">Artikelkategorie filtern</label>
        <select
          id="measurement-category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="">Alle Kategorien</option>
          {[...new Set(active.map((a) => a.category))].sort().map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <ul className="material-cards" aria-label="Aufmaßartikel">
          {filtered.map((a) => (
            <li key={a.id}>
              <button
                className="secondary"
                disabled={busy || archived}
                aria-pressed={selected === a.id}
                onClick={() => setSelected(a.id)}
              >
                {a.name} · {materialDescription(a)}
                {a.favorite ? " · Favorit" : ""}
              </button>
            </li>
          ))}
        </ul>
        {!filtered.length && <p>Keine passenden aktiven Artikel.</p>}
        <a href="#/articles">Eigenen Artikel im Katalog anlegen</a>
        {article && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!valid) return;
              void perform(async () => {
                await materials.addQuantity(measurementId, article.id, amount);
                setQuantity("1");
              });
            }}
          >
            <fieldset disabled={busy || archived}>
              <h3>Ausgewählt: {article.name}</h3>
              <label htmlFor="add-quantity">Weitere Stückzahl</label>
              <input
                id="add-quantity"
                type="number"
                inputMode="numeric"
                min="1"
                max={MAX_QUANTITY}
                step="1"
                required
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
              <button disabled={!valid}>Menge hinzufügen</button>
            </fieldset>
          </form>
        )}
      </section>
      <section className="panel" aria-label="Materialliste">
        <h2>Materialliste dieses Aufmaßes</h2>
        {!data.totals.length && <p>Noch kein Material erfasst.</p>}
        <ul className="material-cards">
          {data.totals.map((row) => (
            <li
              className="material-card"
              key={row.articleId}
              aria-label={row.snapshot.name}
            >
              <h3>{row.snapshot.name}</h3>
              <p>{materialDescription(row.snapshot)}</p>
              <output aria-label={`Gesamtmenge ${row.snapshot.name}`}>
                {row.quantity}
              </output>{" "}
              Stück
              <button
                className="secondary"
                disabled={busy || archived}
                onClick={() => {
                  setEditing(row.articleId);
                  setTotalValue(String(row.quantity));
                }}
              >
                Gesamtmenge bearbeiten: {row.snapshot.name}
              </button>
              {editing === row.articleId && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void perform(async () => {
                      await materials.setTotal(
                        measurementId,
                        row.articleId,
                        editAmount,
                      );
                      setEditing(undefined);
                    });
                  }}
                >
                  <fieldset disabled={busy || archived}>
                    <label htmlFor="edit-total">Neue Gesamtmenge</label>
                    <input
                      id="edit-total"
                      type="number"
                      inputMode="numeric"
                      min="0"
                      max={MAX_QUANTITY}
                      step="1"
                      value={totalValue}
                      required
                      onChange={(e) => setTotalValue(e.target.value)}
                    />
                    <p>
                      Ersetzt die Gesamtmenge in diesem Aufmaß. Es wird eine
                      Korrekturbuchung gespeichert.
                    </p>
                    <div className="actions">
                      <button
                        disabled={
                          !Number.isSafeInteger(editAmount) ||
                          editAmount < 0 ||
                          editAmount > MAX_QUANTITY
                        }
                      >
                        Gesamtmenge setzen
                      </button>
                      <button
                        type="button"
                        className="secondary"
                        onClick={() => setEditing(undefined)}
                      >
                        Abbrechen
                      </button>
                    </div>
                  </fieldset>
                </form>
              )}
            </li>
          ))}
        </ul>
        <button
          disabled={busy}
          onClick={() =>
            void perform(async () =>
              downloadFile(
                await measurements.exportCsv(measurementId),
                `aufmass-${measurementId}.csv`,
                "text/csv;charset=utf-8",
              ),
            )
          }
        >
          Aufmaß-CSV exportieren
        </button>
      </section>
    </section>
  );
}
