import { ScrollViewStyleReset } from 'expo-router/html';

// This file is web-only and used to configure the root HTML for every
// web page during static rendering.
// The contents of this function only run in Node.js environments and
// do not have access to the DOM or browser APIs.
export default function Root({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />

        {/* 
          Disable body scrolling on web. This makes ScrollView components work closer to how they do on native. 
          However, body scrolling is often nice to have for mobile web. If you want to enable it, remove this line.
        */}
        <ScrollViewStyleReset />

        {/* Using raw CSS styles as an escape-hatch to ensure the background color never flickers in dark-mode. */}
        <style dangerouslySetInnerHTML={{ __html: responsiveBackground }} />
        {/* Add any additional <head> elements that you want globally available on web... */}
      </head>
      <body>{children}</body>
    </html>
  );
}

/* Совпадает с darkPalette.bg — без белой вспышки при загрузке web. */
const responsiveBackground = `
body {
  background-color: #07060B;
}
/* Страховка: иногда цепочка height:100% на web не даёт высоту корню RN. */
#root {
  min-height: 100vh;
  min-height: 100dvh;
}
/* RN-web: явный курсор на интерактивах (иначе «мёртвые» клики). */
#root [role="button"],
#root [data-focusable="true"],
#root a[href] {
  cursor: pointer;
}
`;
