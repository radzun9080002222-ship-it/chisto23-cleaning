import { useEffect, useRef, useState } from "react";
import { LoaderCircle, X } from "lucide-react";
import { FOLLOW_UP_STATUSES, followUpSlot, localCalendarTime, type FollowUpStatus } from "../../supabase/functions/_shared/followUp";

export type FollowUpDetails = { status: FollowUpStatus; date: string; time: string; comment: string };

export default function FollowUpDialog({ cityLabel, timeZone, onClose, onSend }: {
  cityLabel: string;
  timeZone: string;
  onClose: () => void;
  onSend: (details: FollowUpDetails) => Promise<void>;
}) {
  const initial = localCalendarTime(new Date(Math.ceil((Date.now() + 20 * 60_000) / 600_000) * 600_000), timeZone);
  const [details, setDetails] = useState<FollowUpDetails>({ status: "Ждём подтверждения", date: initial.slice(0, 10), time: initial.slice(11, 16), comment: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  const sending = useRef(false);
  const today = localCalendarTime(new Date(), timeZone).slice(0, 10);

  useEffect(() => {
    const focused = document.activeElement as HTMLElement | null;
    const element = dialog.current!;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    element.showModal();
    element.querySelector("select")?.focus();
    return () => { element.close(); document.body.style.overflow = overflow; focused?.focus(); };
  }, []);

  useEffect(() => { setError(""); }, [details]);

  const quickDate = (days: number) => {
    const value = new Date(`${today}T12:00:00Z`);
    value.setUTCDate(value.getUTCDate() + days);
    setDetails((current) => ({ ...current, date: value.toISOString().slice(0, 10) }));
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (sending.current) return;
    setError("");
    try {
      followUpSlot(`${details.date}T${details.time}:00`, timeZone);
      sending.current = true;
      setBusy(true);
      await onSend(details);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Не удалось добавить контакт");
    } finally { sending.current = false; setBusy(false); }
  };

  return <dialog ref={dialog} className="manager-pricing-dialog manager-follow-up-dialog" aria-labelledby="follow-up-title" aria-describedby="follow-up-note" onCancel={(event) => { event.preventDefault(); if (!sending.current) onClose(); }}>
    <div className="manager-pricing-head"><h2 id="follow-up-title">На подтверждение</h2><button type="button" aria-label="Закрыть следующий контакт" disabled={busy} onClick={onClose}><X size={22} /></button></div>
    <p id="follow-up-note" className="manager-section-note">{cityLabel} · Запланируйте связь с клиентом. Данные клиента и расчёт из калькулятора добавятся в описание, если заполнены.</p>
    <form onSubmit={submit}>
      <fieldset disabled={busy} className="manager-follow-up-fields">
        <label><span>Статус обращения</span><select autoFocus value={details.status} onChange={(event) => setDetails({ ...details, status: event.target.value as FollowUpStatus })}>{FOLLOW_UP_STATUSES.map((status) => <option key={status}>{status}</option>)}</select></label>
        <div className="manager-follow-up-quick"><button type="button" className="manager-secondary" onClick={() => quickDate(0)}>Сегодня</button><button type="button" className="manager-secondary" onClick={() => quickDate(1)}>Завтра</button></div>
        <div className="manager-pricing-grid">
          <label><span>Дата связи *</span><input type="date" required min={today} value={details.date} onChange={(event) => setDetails({ ...details, date: event.target.value })} /></label>
          <label><span>Время связи *</span><div className="manager-time-selects"><select aria-label="Часы связи" value={details.time.slice(0, 2)} onChange={(event) => setDetails({ ...details, time: `${event.target.value}:${details.time.slice(3)}` })}>{Array.from({ length: 24 }, (_, hour) => String(hour).padStart(2, "0")).map((hour) => <option key={hour}>{hour}</option>)}</select><select aria-label="Минуты связи" value={details.time.slice(3)} onChange={(event) => setDetails({ ...details, time: `${details.time.slice(0, 2)}:${event.target.value}` })}>{["00", "10", "20", "30", "40", "50"].map((minute) => <option key={minute}>{minute}</option>)}</select></div></label>
        </div>
        <p className="manager-section-note">Время города {cityLabel}. Это время звонка, а не начала уборки.</p>
        <label><span>Комментарий</span><textarea rows={3} maxLength={2000} placeholder="Например: согласует с мужем, позвонить после 18:00" value={details.comment} onChange={(event) => setDetails({ ...details, comment: event.target.value })} /></label>
      </fieldset>
      <p className="manager-section-note">Жёлтое событие на 15 минут · без напоминаний · занятость «Свободен».</p>
      {error && <p className="manager-form-error" role="alert">{error}</p>}
      <button type="submit" className="manager-primary" disabled={busy}>{busy && <LoaderCircle className="spin" size={18} />}{busy ? "Добавляем…" : "Добавить следующий контакт"}</button>
    </form>
  </dialog>;
}
