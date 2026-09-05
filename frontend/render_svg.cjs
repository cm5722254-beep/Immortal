const fs = require('fs');
const path = require('path');
const { Resvg } = require('@resvg/resvg-js');

const svgPath = path.join(__dirname, 'public', 'favicon.svg');
const svg = fs.readFileSync(svgPath, 'utf8');

const resvg = new Resvg(svg, {
  fitTo: {
    mode: 'width',
    value: 1024,
  },
});

const pngData = resvg.render();
const pngBuffer = pngData.asPng();

fs.writeFileSync(path.join(__dirname, 'valknut_1024.png'), pngBuffer);
console.log('valknut_1024.png generated successfully');
