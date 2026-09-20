// Renders tools/og.html to assets/og.png at 1200x630.
// Needs the site served locally, e.g. `npx http-server -p 5300`.
import captureWebsite from 'capture-website';

await captureWebsite.file('http://localhost:5300/tools/og.html', 'assets/og.png', {
  width: 1200,
  height: 630,
  scaleFactor: 2,       // 2400x1260, so it stays sharp on retina timelines
  overwrite: true,
  delay: 3,             // let the webfont land before the shot
});
console.log('wrote assets/og.png');
