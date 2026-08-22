import {
  ArrowDownRight,
  Check,
  ChevronDown,
  Clock3,
  Droplets,
  Leaf,
  MessageCircle,
  Minus,
  Phone,
  Plus,
  ShieldCheck,
  Sparkles,
  TestTube2,
  Wind,
} from "lucide-react";
import { useMemo, useState } from "react";

const PHONE = "+7 (922) 453-91-45";
const PHONE_HREF = "tel:+79224539145";
const WHATSAPP_BASE = "https://wa.me/79224539145";

const SERVICES = [
  { id: "sofa", name: "Диван стандарт", short: "Диван стандарт", price: 3500, note: "сиденье, спинка и подлокотники", unit: "шт." },
  { id: "corner", name: "Диван угловой", short: "Угловой диван", price: 4900, note: "включая угловую секцию", unit: "шт." },
  { id: "sofa3", name: "Диван трёхместный", short: "Трёхместный диван", price: 6500, note: "полная чистка обивки", unit: "шт." },
  { id: "mattress1", name: "Матрас односпальный, 1 сторона", short: "Односпальный матрас", price: 1500, note: "чистка одной стороны", unit: "шт." },
  { id: "mattress2", name: "Матрас двухспальный, 1 сторона", short: "Двухспальный матрас", price: 2600, note: "чистка одной стороны", unit: "шт." },
  { id: "headboard", name: "Кровать — изголовье", short: "Изголовье кровати", price: 1500, note: "без разборки кровати", unit: "шт." },
  { id: "bedside", name: "Кровать — тканевый борт", short: "Тканевый борт", price: 1500, note: "мягкая часть каркаса", unit: "шт." },
  { id: "pillow", name: "Подушка", short: "Подушка", price: 500, note: "декоративная или диванная", unit: "шт." },
  { id: "armchair", name: "Кресло", short: "Кресло", price: 1500, note: "мягкое кресло целиком", unit: "шт." },
  { id: "bench", name: "Банкетка", short: "Банкетка", price: 1200, note: "сиденье и мягкие элементы", unit: "шт." },
  { id: "pouf", name: "Пуфик", short: "Пуфик", price: 550, note: "чистка со всех сторон", unit: "шт." },
  { id: "chair", name: "Стул", short: "Стул", price: 500, note: "сиденье и мягкая спинка", unit: "шт." },
  { id: "rug", name: "Ковёр", short: "Ковёр", price: 600, note: "стоимость за 1 м²", unit: "м²" },
  { id: "carpet", name: "Ковролин", short: "Ковролин", price: 550, note: "стоимость за 1 м²", unit: "м²" },
];

const PROCESS = [
  { n: "01", icon: TestTube2, title: "Смотрим ткань", text: "Проверяем маркировку, состояние обивки и устойчивость цвета на незаметном участке." },
  { n: "02", icon: Droplets, title: "Работаем с пятнами", text: "Подбираем состав под кофе, жир, следы животных и другие загрязнения." },
  { n: "03", icon: Sparkles, title: "Чистим в глубину", text: "Экстрактор промывает обивку и сразу собирает растворённую грязь вместе с влагой." },
  { n: "04", icon: Wind, title: "Оставляем сохнуть", text: "Проверяем результат, поднимаем ворс. Обычно мебель высыхает за 3–6 часов." },
];

const FAQS = [
  { q: "Сколько сохнет диван?", a: "Обычно 3–6 часов при нормальном проветривании. Время зависит от ткани, наполнителя и влажности в помещении. Мастер подскажет точнее после чистки." },
  { q: "Цена на сайте окончательная?", a: "Это честный предварительный расчёт по базовому прайсу. До выезда просим фото мебели, оцениваем материал и загрязнения, после чего фиксируем стоимость в переписке." },
  { q: "Уйдёт запах от животных?", a: "Поверхностные запахи обычно убираются вместе с загрязнением. Если жидкость глубоко попала в наполнитель, может потребоваться дополнительная обработка — скажем об этом заранее." },
  { q: "Безопасно для детей и животных?", a: "Подбираем профессиональные составы по типу ткани и тщательно промываем обивку экстрактором. Пользоваться мебелью можно после полного высыхания." },
  { q: "Нужно куда-то вывозить мебель?", a: "Нет, всё делаем у вас дома. Мастеру нужен доступ к мебели, воде и обычной розетке. Оборудование и составы привозим с собой." },
  { q: "По каким районам выезжаете?", a: "Работаем по Сочи и ближайшим районам. Стоимость дальнего выезда уточним по адресу до оформления заказа." },
];

const money = (value: number) => `${value.toLocaleString("ru-RU")} ₽`;

function Logo() {
  return (
    <a href="#top" className="brand" aria-label="Чисто — на главную">
      Чисто<span>.</span>
    </a>
  );
}

function WhatsappIcon() {
  return <MessageCircle aria-hidden="true" size={18} />;
}

export default function App() {
  const [counts, setCounts] = useState<Record<string, number>>({ sofa: 1 });
  const [openFaq, setOpenFaq] = useState(0);

  const subtotal = useMemo(
    () => SERVICES.reduce((sum, item) => sum + (counts[item.id] || 0) * item.price, 0),
    [counts],
  );
  const total = subtotal;
  const selected = SERVICES.filter((item) => counts[item.id] > 0)
    .map((item) => `${item.name}: ${counts[item.id]} ${item.unit}`)
    .join(", ");
  const whatsapp = `${WHATSAPP_BASE}?text=${encodeURIComponent(
    `Здравствуйте! Хочу заказать химчистку. Выбрано: ${selected || "пока не выбрано"}. Предварительно: ${money(total)}.`,
  )}`;

  const updateCount = (id: string, delta: number) => {
    setCounts((current) => ({ ...current, [id]: Math.max(0, (current[id] || 0) + delta) }));
  };

  return (
    <div id="top" className="site-shell">
      <header className="topbar">
        <div className="container-x topbar-inner">
          <Logo />
          <nav className="hero-nav" aria-label="Основная навигация">
            <a href="#services">Что чистим</a>
            <a href="#calculator">Цена</a>
            <a href="#results">До и после</a>
            <a href="#faq">Вопросы</a>
          </nav>
          <div className="topbar-actions">
            <a className="phone-link" href={PHONE_HREF}>{PHONE}</a>
            <a className="mini-cta" href="#calculator">Рассчитать</a>
          </div>
        </div>
      </header>

      <main>
        <section className="hero" aria-labelledby="hero-title">
          <div className="hero-orb hero-orb-one" />
          <div className="hero-orb hero-orb-two" />
          <div className="container-x hero-grid">
            <div className="hero-copy">
              <div className="eyebrow"><span /> Химчистка мебели в Сочи на дому</div>
              <h1 id="hero-title">
                Снова<br />
                <em>Чисто<span>.</span></em>
              </h1>
              <p className="hero-lead">
                Возвращаем диванам, матрасам и креслам свежесть — без вывоза,
                резкого запаха и сюрпризов в цене.
              </p>
              <div className="hero-buttons">
                <a className="primary-cta" href={`${WHATSAPP_BASE}?text=${encodeURIComponent("Здравствуйте! Хочу узнать цену химчистки по фото.")}`} target="_blank" rel="noreferrer">
                  <WhatsappIcon /> Узнать цену по фото
                  <ArrowDownRight size={18} />
                </a>
                <a className="secondary-cta" href={PHONE_HREF}>
                  <Phone size={17} /> Позвонить
                </a>
              </div>
              <ul className="hero-proof" aria-label="Преимущества">
                <li><Check size={16} /> Сушка 3–6 часов</li>
                <li><Check size={16} /> Состав подбираем под ткань</li>
                <li><Check size={16} /> Работаем по всему Сочи</li>
              </ul>
            </div>

            <div className="hero-visual">
              <div className="photo-frame">
                <img src="/images/hero.jpg" alt="Чистый светлый диван после химчистки" />
                <div className="photo-badge">
                  <span className="status-dot" />
                  <div><strong>Можно сегодня</strong><small>ответим за 5 минут</small></div>
                </div>
              </div>
              <div className="fabric-card">
                <span>01</span>
                <strong>Сначала — тест ткани</strong>
                <p>Подбираем состав под материал и пятна.</p>
              </div>
            </div>
          </div>
        </section>

        <div className="object-strip" aria-label="Объекты химчистки">
          <div className="container-x object-strip-inner">
            {['Диваны', 'Матрасы', 'Кресла', 'Стулья', 'Ковры', 'Автокресла'].map((item) => (
              <span key={item}>{item}<i /></span>
            ))}
          </div>
        </div>

        <section className="belief section-space">
          <div className="container-x belief-grid">
            <div>
              <div className="section-kicker">Не просто освежить</div>
              <h2>Чистота, которую<br />видно <em>и чувствуешь</em></h2>
            </div>
            <div className="belief-copy">
              <p>Мягкая мебель собирает пыль, крошки и запахи глубже, чем достаёт обычный пылесос. Мы промываем обивку экстрактором и забираем загрязнение вместе с влагой.</p>
              <div className="belief-facts">
                <div><strong>01</strong><span>Фиксируем цену по фото до выезда</span></div>
                <div><strong>02</strong><span>Не маскируем запах отдушкой</span></div>
                <div><strong>03</strong><span>Показываем собранную грязь</span></div>
              </div>
            </div>
          </div>
        </section>

        <section id="services" className="services section-space">
          <div className="container-x">
            <div className="section-heading">
              <div>
                <div className="section-kicker">Что чистим</div>
                <h2>Прайс без мелкого шрифта<span>.</span></h2>
              </div>
              <p>Базовая стоимость. Отправьте фото — подтвердим цену с учётом ткани и загрязнений.</p>
            </div>
            <div className="service-grid">
              {SERVICES.slice(0, 6).map((item, index) => (
                <article className={`service-card service-card-${index + 1}`} key={item.id}>
                  <span className="service-number">0{index + 1}</span>
                  <div>
                    <h3>{item.short}</h3>
                    <p>{item.note}</p>
                  </div>
                  <div className="service-price"><strong>{money(item.price)}</strong> / {item.unit}</div>
                  <button type="button" onClick={() => { updateCount(item.id, 1); document.getElementById('calculator')?.scrollIntoView(); }}>
                    Добавить в расчёт <Plus size={16} />
                  </button>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="calculator" className="calculator section-space">
          <div className="container-x calculator-wrap">
            <div className="calculator-head">
              <div className="section-kicker light">Калькулятор</div>
              <h2>Сколько будет стоить<br />снова <em>Чисто<span>.</span></em></h2>
              <p>Выберите мебель. Это предварительный расчёт — итог подтвердим по фото до выезда мастера.</p>
            </div>
            <div className="calculator-panel">
              <div className="calculator-list">
                {SERVICES.map((item) => {
                  const count = counts[item.id] || 0;
                  return (
                    <div className={`calc-row ${count > 0 ? "active" : ""}`} key={item.id}>
                      <div><strong>{item.name}</strong><small>{money(item.price)} / {item.unit}</small></div>
                      <div className="counter" aria-label={`Количество: ${item.name}`}>
                        <button type="button" onClick={() => updateCount(item.id, -1)} disabled={count === 0} aria-label={`Уменьшить: ${item.name}`}><Minus size={16} /></button>
                        <span>{count}</span>
                        <button type="button" onClick={() => updateCount(item.id, 1)} aria-label={`Добавить: ${item.name}`}><Plus size={16} /></button>
                      </div>
                    </div>
                  );
                })}
              </div>
              <aside className="calculator-total">
                <span>Предварительно</span>
                <strong>{money(total)}</strong>
                <p>{subtotal > 0 ? "Цена по выбранным позициям" : "Добавьте мебель или площадь"}</p>
                <a className={`calc-submit ${total === 0 ? "disabled" : ""}`} href={total === 0 ? undefined : whatsapp} target="_blank" rel="noreferrer" aria-disabled={total === 0}>
                  <WhatsappIcon /> Зафиксировать в WhatsApp
                </a>
                <small><ShieldCheck size={15} /> Сумму подтвердим до выезда</small>
              </aside>
            </div>
          </div>
        </section>

        <section id="results" className="results section-space">
          <div className="container-x">
            <div className="section-heading">
              <div>
                <div className="section-kicker">Результат</div>
                <h2>До. После. <em>Чисто<span>.</span></em></h2>
              </div>
              <p>Один и тот же интерьер до работы и после. Без фильтров, которые прячут пятна.</p>
            </div>
            <div className="result-grid">
              <figure className="result-card">
                <div className="result-images">
                  <div><img src="/images/case1-before.jpg" alt="Светлый диван до химчистки" loading="lazy" /><span>до</span></div>
                  <div><img src="/images/case1-after.jpg" alt="Светлый диван после химчистки" loading="lazy" /><span>после</span></div>
                </div>
                <figcaption><strong>Светлый угловой диван</strong><span>пятна, общий серый налёт, следы ежедневного использования</span></figcaption>
              </figure>
              <figure className="result-card">
                <div className="result-images">
                  <div><img src="/images/case3-before.jpg" alt="Диван в доме до химчистки" loading="lazy" /><span>до</span></div>
                  <div><img src="/images/case3-after.jpg" alt="Диван в доме после химчистки" loading="lazy" /><span>после</span></div>
                </div>
                <figcaption><strong>Большой диван в доме</strong><span>пыль, следы быта и запах в глубине обивки</span></figcaption>
              </figure>
            </div>
          </div>
        </section>

        <section className="process section-space">
          <div className="container-x">
            <div className="process-intro">
              <div>
                <div className="section-kicker light">Как всё проходит</div>
                <h2>Четыре шага.<br />И снова можно жить.</h2>
              </div>
              <div className="process-promise">
                <Clock3 size={23} />
                <div><strong>Обычно 1,5–3 часа</strong><span>на один диван, в зависимости от размера и состояния</span></div>
              </div>
            </div>
            <div className="process-grid">
              {PROCESS.map(({ n, icon: Icon, title, text }) => (
                <article key={n}>
                  <div className="process-icon"><Icon size={23} /></div>
                  <span>{n}</span>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="safe section-space">
          <div className="container-x safe-grid">
            <div className="safe-photo">
              <img src="/images/process-cleaning.webp" alt="Мастер чистит диван профессиональным экстрактором" loading="lazy" />
              <div><Leaf size={20} /><span>Подбираем состав<br />под материал</span></div>
            </div>
            <div className="safe-copy">
              <div className="section-kicker">Техника важнее обещаний</div>
              <h2>Бережно к ткани.<br />Настойчиво к грязи.</h2>
              <p>Начинаем с теста и не используем один состав «на все случаи». В работе важны материал обивки, тип пятна, стойкость красителя и состояние наполнителя.</p>
              <ul>
                <li><ShieldCheck size={19} /><span><strong>Проверяем цвет</strong>на незаметном участке</span></li>
                <li><Droplets size={19} /><span><strong>Промываем обивку,</strong>чтобы убрать остатки состава</span></li>
                <li><Wind size={19} /><span><strong>Объясняем сушку,</strong>чтобы результат сохранился</span></li>
              </ul>
            </div>
          </div>
        </section>

        <section className="business">
          <div className="container-x business-card">
            <div>
              <span>Для бизнеса</span>
              <h2>Диваны работают.<br />Мы держим их в форме.</h2>
            </div>
            <div>
              <p>Химчистка для отелей, апартаментов, ресторанов, офисов и салонов. Работаем партиями, подстраиваемся под загрузку объекта.</p>
              <a href={`${WHATSAPP_BASE}?text=${encodeURIComponent("Здравствуйте! Нужен расчёт химчистки для бизнеса.")}`} target="_blank" rel="noreferrer">Обсудить объём <ArrowDownRight size={17} /></a>
            </div>
          </div>
        </section>

        <section id="faq" className="faq section-space">
          <div className="container-x faq-grid">
            <div className="faq-heading">
              <div className="section-kicker">Вопросы</div>
              <h2>Коротко о важном<span>.</span></h2>
              <p>Не нашли свой вопрос? Пришлите фото в WhatsApp — посмотрим и ответим предметно.</p>
              <a href={`${WHATSAPP_BASE}?text=${encodeURIComponent("Здравствуйте! У меня вопрос по химчистке.")}`} target="_blank" rel="noreferrer"><WhatsappIcon /> Задать вопрос</a>
            </div>
            <div className="faq-list">
              {FAQS.map((item, index) => (
                <div className={`faq-item ${openFaq === index ? "open" : ""}`} key={item.q}>
                  <button type="button" onClick={() => setOpenFaq(openFaq === index ? -1 : index)} aria-expanded={openFaq === index}>
                    <span>{item.q}</span><ChevronDown size={20} />
                  </button>
                  <div className="faq-answer"><p>{item.a}</p></div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="final-cta">
          <div className="container-x final-cta-inner">
            <div className="section-kicker light">Оценим по фото</div>
            <h2>Покажите, что случилось.<br /><em>Сделаем Чисто<span>.</span></em></h2>
            <p>Пришлите 2–3 фото мебели и коротко опишите пятна. Ответим с ценой и ближайшим временем выезда.</p>
            <div>
              <a className="primary-cta inverse" href={`${WHATSAPP_BASE}?text=${encodeURIComponent("Здравствуйте! Хочу прислать фото мебели и узнать стоимость химчистки.")}`} target="_blank" rel="noreferrer"><WhatsappIcon /> Отправить фото</a>
              <a className="final-phone" href={PHONE_HREF}>{PHONE}</a>
            </div>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="container-x footer-grid">
          <div><Logo /><p>Химчистка мягкой мебели<br />в Сочи на дому.</p></div>
          <div><span>Навигация</span><a href="#services">Что чистим</a><a href="#calculator">Калькулятор</a><a href="#results">До и после</a><a href="#faq">Вопросы</a></div>
          <div><span>Связаться</span><a href={PHONE_HREF}>{PHONE}</a><a href={WHATSAPP_BASE} target="_blank" rel="noreferrer">WhatsApp</a></div>
          <div><span>Документы</span><a href="/privacy.html">Политика конфиденциальности</a><p>Сочи и ближайшие районы</p></div>
        </div>
        <div className="container-x footer-bottom"><span>© 2026 Чисто.</span><span>Чистота начинается с точки.</span></div>
      </footer>

      <div className="mobile-bar">
        <a href={PHONE_HREF}><Phone size={18} /> Позвонить</a>
        <a href={`${WHATSAPP_BASE}?text=${encodeURIComponent("Здравствуйте! Хочу узнать цену химчистки.")}`} target="_blank" rel="noreferrer"><WhatsappIcon /> WhatsApp</a>
      </div>
    </div>
  );
}
