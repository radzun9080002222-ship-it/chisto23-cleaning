import { useEffect, useRef, useState } from "react";
import { LoaderCircle, X } from "lucide-react";
import { CITIES, PRICING_GROUPS, readPrice, setPrice, validatePricing, type CityId, type PricingConfig, type PricingSnapshot } from "../../supabase/functions/_shared/pricing";
import { loadPricingSettings, saveCityPricing } from "./managerApi";

const inputsFor = (pricing: PricingConfig) => Object.fromEntries(PRICING_GROUPS.flatMap((group) => group.fields.map((field) => [field.path.join("."), String(readPrice(pricing, field.path))])));
const errorText = (error: unknown) => error instanceof Error ? error.message : "Не удалось выполнить запрос";

export default function PricingSettings({ pin, initialCityId, onClose, onSaved }: {
  pin: string; initialCityId: CityId; onClose: () => void; onSaved: (cityId: CityId) => void;
}) {
  const [cityId, setCityId] = useState(initialCityId);
  const [sourceCity, setSourceCity] = useState<CityId>(initialCityId);
  const [targetCity, setTargetCity] = useState<CityId>(CITIES.find((city) => city.id !== initialCityId)!.id);
  const [snapshot, setSnapshot] = useState<PricingSnapshot | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [reload, setReload] = useState(0);
  const dialog = useRef<HTMLDivElement>(null);
  const dirty = snapshot !== null && JSON.stringify(values) !== JSON.stringify(inputsFor(snapshot.pricing));
  const closeRef = useRef<() => void>(() => {});
  closeRef.current = () => { if (!busy && (!dirty || window.confirm("Закрыть настройки без сохранения изменений?"))) onClose(); };

  useEffect(() => {
    const focused = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.current?.querySelector<HTMLButtonElement>("button")?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); closeRef.current(); }
      if (event.key !== "Tab") return;
      const elements = Array.from(dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), summary, [tabindex="0"]') || []).filter((element) => element.getClientRects().length);
      const first = elements[0], last = elements[elements.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener("keydown", keydown);
    return () => { document.body.style.overflow = overflow; document.removeEventListener("keydown", keydown); focused?.focus(); };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true); setSnapshot(null); setError(""); setMessage("");
    loadPricingSettings(pin, cityId).then((result) => {
      if (cancelled) return;
      setSnapshot(result); setValues(inputsFor(result.pricing));
    }).catch((failure) => { if (!cancelled) setError(errorText(failure)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [pin, cityId, reload]);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!snapshot || busy || loading) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const pricing = structuredClone(snapshot.pricing);
      for (const group of PRICING_GROUPS) for (const field of group.fields) {
        const value = values[field.path.join(".")];
        if (!value?.trim()) throw new Error(`Заполните цену: ${field.label}`);
        setPrice(pricing, field.path, Number(value));
      }
      const result = await saveCityPricing(pin, pin, cityId, validatePricing(pricing), snapshot.updatedAt);
      setSnapshot(result); setValues(inputsFor(result.pricing)); onSaved(cityId);
      setMessage(`Цены сохранены: ${CITIES.find((city) => city.id === cityId)!.label}`);
    } catch (failure) { setError(errorText(failure)); }
    finally { setBusy(false); }
  };

  const copy = async () => {
    if (busy || loading || sourceCity === targetCity) return;
    if (dirty && !window.confirm("Несохранённые изменения не участвуют в копировании. Продолжить?")) return;
    const sourceLabel = CITIES.find((city) => city.id === sourceCity)!.label;
    const targetLabel = CITIES.find((city) => city.id === targetCity)!.label;
    if (!window.confirm(`Заменить ВСЕ цены города «${targetLabel}» сохранёнными ценами города «${sourceLabel}»?`)) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const [source, target] = await Promise.all([loadPricingSettings(pin, sourceCity), loadPricingSettings(pin, targetCity)]);
      const result = await saveCityPricing(pin, pin, targetCity, source.pricing, target.updatedAt);
      if (cityId === targetCity) { setSnapshot(result); setValues(inputsFor(result.pricing)); }
      onSaved(targetCity); setMessage(`Цены скопированы: ${sourceLabel} → ${targetLabel}`);
    } catch (failure) { setError(errorText(failure)); }
    finally { setBusy(false); }
  };

  return <div className="manager-pricing-overlay">
    <div ref={dialog} className="manager-pricing-dialog" role="dialog" aria-modal="true" aria-labelledby="pricing-title">
      <div className="manager-pricing-head"><h2 id="pricing-title">Настройка цен</h2><button type="button" disabled={busy} aria-label="Закрыть настройки цен" onClick={() => closeRef.current()}><X size={22} /></button></div>
      <p className="manager-section-note">Постоянный прайс калькулятора хранится в Supabase отдельно для каждого города. Цены публичных сайтов не меняются.</p>
      <label className="manager-pricing-city"><span>Настраиваем цены города</span><select disabled={busy} value={cityId} onChange={(event) => {
        if (!dirty || window.confirm("Сменить город без сохранения изменений?")) setCityId(event.target.value as CityId);
      }}>{CITIES.map((city) => <option key={city.id} value={city.id}>{city.label}</option>)}</select></label>
      {loading && <p role="status"><LoaderCircle className="spin" size={18} /> Загрузка цен…</p>}
      {snapshot && !loading && <form noValidate onSubmit={save}>
        <p className="manager-section-note">{snapshot.inherited ? "Пока используется общий прайс. Сохранение создаст отдельные цены этого города." : "Используется сохранённый прайс этого города."}</p>
        <fieldset disabled={busy} className="manager-pricing-fields">
          {PRICING_GROUPS.map((group, index) => <details key={group.title} open={index === 0}><summary>{group.title}</summary><div className="manager-pricing-grid">{group.fields.map((field) => {
            const key = field.path.join(".");
            return <label key={key}><span>{field.label}</span><input aria-label={field.label} type="number" required min={0} max={10000000} step="0.01" value={values[key] ?? ""} onChange={(event) => setValues((current) => ({ ...current, [key]: event.target.value }))} /></label>;
          })}</div></details>)}
        </fieldset>
        <button type="submit" className="manager-primary" disabled={busy || !dirty && !snapshot.inherited}>{busy ? "Сохраняем…" : "Сохранить цены города"}</button>
      </form>}
      <div className="manager-pricing-copy"><h3>Скопировать цены между городами</h3><p className="manager-section-note">Копируется весь сохранённый прайс. Несохранённые правки не копируются.</p><div className="manager-pricing-grid">
        <label><span>Из города</span><select disabled={busy} value={sourceCity} onChange={(event) => setSourceCity(event.target.value as CityId)}>{CITIES.map((city) => <option key={city.id} value={city.id}>{city.label}</option>)}</select></label>
        <label><span>В город</span><select disabled={busy} value={targetCity} onChange={(event) => setTargetCity(event.target.value as CityId)}>{CITIES.map((city) => <option key={city.id} value={city.id}>{city.label}</option>)}</select></label>
      </div><button type="button" className="manager-secondary" disabled={busy || loading || sourceCity === targetCity} onClick={copy}>Скопировать</button></div>
      {error && <div role="alert" className="manager-form-error">{error}<button type="button" className="manager-secondary" disabled={busy} onClick={() => { if (!dirty || window.confirm("Загрузить свежие цены без сохранения изменений?")) setReload((value) => value + 1); }}>Загрузить свежие цены</button></div>}
      {message && <p role="status" className="manager-status ok">{message}</p>}
    </div>
  </div>;
}
