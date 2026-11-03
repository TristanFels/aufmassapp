import { useEffect, useState } from "react";
import { liveQuery } from "dexie";
import { materials } from "../app/services";
import type { Article, MaterialTotal } from "../domain/material";

export interface MaterialData {
  articles: Article[];
  totals: MaterialTotal[];
}

export function useMaterialData(projectId?: string, measurementId?: string) {
  const [data, setData] = useState<MaterialData>();
  const [error, setError] = useState("");
  useEffect(() => {
    setData(undefined);
    setError("");
    const subscription = liveQuery(async () => {
      const [articles, totals] = await Promise.all([
        materials.listArticles(),
        measurementId
          ? materials.getMeasurementTotals(measurementId)
          : projectId
            ? materials.getTotals(projectId)
            : Promise.resolve([]),
      ]);
      return { articles, totals };
    }).subscribe({
      next: setData,
      error: () =>
        setError(
          "Der lokale Artikelkatalog oder das Aufmaß konnte nicht geladen werden. Bitte erneut öffnen und freien Gerätespeicher prüfen. Keine Websitedaten ohne externe Sicherung löschen.",
        ),
    });
    return () => subscription.unsubscribe();
  }, [projectId, measurementId]);
  return { data, error };
}
