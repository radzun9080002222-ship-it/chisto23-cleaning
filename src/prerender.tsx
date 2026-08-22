import { renderToString } from "react-dom/server";
import App from "./App";

// Вызывается плагином vite-prerender-plugin на этапе сборки.
// Возвращает готовый HTML, который вшивается внутрь <div id="root"> в index.html,
// чтобы поисковики (в первую очередь Яндекс) видели контент без выполнения JS.
export async function prerender() {
  const html = renderToString(<App />);
  return { html };
}
