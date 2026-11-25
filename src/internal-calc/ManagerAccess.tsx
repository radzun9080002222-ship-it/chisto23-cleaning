import { useState, type ReactNode } from "react";
import { LockKeyhole } from "lucide-react";

const ACCESS_KEY = "chisto23_calc_pin";
const CALC_PIN = import.meta.env.VITE_CALC_PIN || "3715";

function PinGate({ title, buttonLabel, onUnlock }: { title: string; buttonLabel: string; onUnlock: (pin: string) => void }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (pin !== CALC_PIN) {
      setPin("");
      setError(true);
      return;
    }
    try { sessionStorage.setItem(ACCESS_KEY, pin); } catch { /* Доступ действует до ухода со страницы. */ }
    onUnlock(pin);
  };

  return (
    <main className="manager-lock">
      <form onSubmit={submit} className="manager-lock-card">
        <div className="manager-lock-icon"><LockKeyhole size={28} /></div>
        <span className="manager-eyebrow">Закрытая страница</span>
        <h1>{title}</h1>
        <p>Введите четырёхзначный PIN-код</p>
        <label htmlFor="manager-pin">PIN-код</label>
        <input
          id="manager-pin"
          autoFocus
          type="password"
          inputMode="numeric"
          maxLength={4}
          value={pin}
          onChange={(event) => {
            setPin(event.target.value.replace(/\D/g, "").slice(0, 4));
            setError(false);
          }}
          aria-invalid={error}
        />
        {error && <div className="manager-form-error">Неверный PIN-код</div>}
        <button className="manager-primary" type="submit" disabled={pin.length !== 4}>{buttonLabel}</button>
      </form>
    </main>
  );
}

export default function ManagerAccess({ title, buttonLabel, children }: {
  title: string;
  buttonLabel: string;
  children: (pin: string) => ReactNode;
}) {
  const [pin, setPin] = useState(() => {
    try { return sessionStorage.getItem(ACCESS_KEY) || ""; }
    catch { return ""; }
  });
  return pin === CALC_PIN ? <>{children(pin)}</> : <PinGate title={title} buttonLabel={buttonLabel} onUnlock={setPin} />;
}
