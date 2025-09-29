import { html, render, useState } from 'https://esm.sh/htm/preact/standalone'

function roundRectPath({x, y, width, height, rx, ry}) {
  return [
      `M ${x + rx},${y}`,
      `h ${width - 2*rx}`,
      `c ${rx/2},0 ${rx},${ry/2} ${rx},${ry}`,
      `v ${height - 2*ry}`,
      `c 0,${rx/2} ${-rx/2},${ry} ${-rx},${ry}`,
      `h ${-(width - 2*rx)}`,
      `c ${-rx/2},0 ${-rx},${-ry/2} ${-rx},${-ry}`,
      `v ${-(height - 2*ry)}`,
      `c 0,${-ry/2} ${rx/2},${-ry} ${rx},${-ry}`,
      `Z`,
  ].join(' ');
}

function downloadSVG() {
  const svgEl = document.querySelector('svg');
  const blob = new Blob([svgEl.outerHTML], {type: 'image/svg+xml'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.setAttribute('href', url);
  a.setAttribute('download', svgEl.querySelector('title').textContent || 'download');
  a.click();
};

function Sieve (props) {
  const defaultProps = {
    nRows: 20,
    nCols: 12,
    marginWidth: 4,
    cellWidth: 72,
    cellHeight: 72,
    layerSpecs: [
      {factor: 1,  fill: 'white', showOutlines: true},  // layer 1 is white with engraved labels
      {factor: 2,  fill: 'rgba(255, 0,   0,   1.0)'},  // layer 2 is translucent red with cutouts for non-multiples of 2
      {factor: 3,  fill: 'rgba(224, 224, 0,   1.0)'},  // layer 3 is translucent yellow with cutouts for non-multiples of 3
      {factor: 5,  fill: 'rgba(0,   0,   255, 1.0)'},  // layer 5 is translucent blue with cutouts for non-multiples of 5
      {factor: 7,  fill: 'rgba(0,   255, 0,   1.0)'},  // layer 7 is translucent green with cutouts for non-multiples of 7
      {factor: 11, fill: 'rgba(255, 0,   255, 1.0)'},  // layer 11 is translucent purple with cutouts for non-multiples of 11
      // {factor: 13, fill: 'rgba(0,   255, 255, 1.0)'},  // layer 13 is translucent orange with cutouts for non-multiples of 13
      // {factor: 17, fill: 'rgba(0,   127, 255, 0.25)'},  // layer 13 is translucent orange with cutouts for non-multiples of 13
    ]
  };
  const {nRows, nCols, marginWidth, cellWidth, cellHeight, layerSpecs} = Object.assign({}, defaultProps, props);
  const [confirmGeneration, setConfirmGeneration] = useState(false);
  if ((nRows * nCols > 1024) && (confirmGeneration == false)) {
    return html`<p>
      ${nCols} × ${nRows} table will take some time to generate. <button onClick=${()=>setConfirmGeneration(true)}>Proceed</button>
    </p>`;
  }

  const layers = [];
  for (const layerSpec of layerSpecs) {
    const {factor} = layerSpec;
    // solid frame
    const cutOutPaths = [
      roundRectPath({
        x: 0, y: 0,
        width: nCols*cellWidth + 2*marginWidth, 
        height: nRows*cellHeight + 2*marginWidth,
        rx: 4*marginWidth, ry: 4*marginWidth
      })
    ];
    // etched outlines
    const outlinePaths = [];

    for (let row = 0; row < nRows; row++) {
      for (let col = 0; col < nCols; col++) {
        const cellNum = (row * nCols) + col + 1;

        const cellPath = roundRectPath({
          x: col*cellWidth + 2*marginWidth,
          y: row*cellHeight + 2*marginWidth,
          width: cellWidth - 2*marginWidth,
          height: cellHeight - 2*marginWidth,
          rx: 3*marginWidth,
          ry: 3*marginWidth
        });
        const insetCellPath = roundRectPath({
          x: col*cellWidth + 4*marginWidth,
          y: row*cellHeight + 4*marginWidth,
          width: cellWidth - 6*marginWidth,
          height: cellHeight - 6*marginWidth,
          rx: 2*marginWidth,
          ry: 2*marginWidth
        });

        if (cellNum == factor && factor != 1) {
          // base factor has a smaller cutout
          cutOutPaths.push(insetCellPath);
        }
        else if (cellNum % factor != 0) {
          // non-multiples are fully cut out
          cutOutPaths.push(cellPath);
        }
        else {
          // multiples have etched outlines
          outlinePaths.push(cellPath);
        }

        // if (layerSpec.showOutlines) {
        //   outlinePaths.push(cellPath);
        // }
      }
    }

    const cutOut = html`<path d=${cutOutPaths.join(' ')} fill-rule="evenodd" fill=${layerSpec.fill} opacity=${factor == 1 ? 1 : 0.25} style="mix-blend-mode:darken;" />`;
    const outline = layerSpec.showOutlines ? html`<path d=${outlinePaths.join(' ')} fill="rgba(255,255,255,0)" />` : null; // stroke=${layerSpec.fill}
    layers.push(html`<g class="factor-layer" id=${'factor-'+layerSpec.factor}>
      ${cutOut}
      ${outline}
    </g>`);
  }
  // engraved numbers
  const textEls = [];
  for (let row = 0; row < nRows; row++) {
    for (let col = 0; col < nCols; col++) {
      const cellNum = (row * nCols) + col + 1;
        textEls.push(html`<text
          x=${(col+0.5)*cellWidth + marginWidth}
          y=${(row+0.5)*cellHeight + marginWidth}
          dominant-baseline="central" text-anchor="middle"
        >${cellNum}</text>`);
    }
  }
  layers.push(html`<g class="legend-layer" id="legend"
      fill="#444"
      style="font-size: ${cellHeight/3}px; font-weight: bold; font-family: sans-serif;"
    >
    ${textEls}
  </g>`);
  return html`
    <svg xmlns="http://www.w3.org/2000/svg" version="1.1"
      viewbox="0 0 ${nCols*cellWidth + 2*marginWidth} ${nRows*cellHeight + 2*marginWidth}"
      width=${nCols*cellWidth + 2*marginWidth} height=${nRows*cellHeight + 2*marginWidth}
    >
      <title>Sieve ${nCols}x${nRows} ${cellWidth}+${marginWidth}pt</title>
      ${layers}
    </svg>
  `;
}


function App (props = {}) {
  const [nRows, setNRows] = useState(12);
  const [nCols, setNCols] = useState(12);
  const [gridSize, setGridSize] = useState(80);
  const [marginWidth, setMarginWidth] = useState(5);
  return html`
    <h1>Sieve of Eratosthenes</h1>
    <p>
      Table Size:${" "}
      <input type="number" size="3" name="nCols" value=${nCols} onChange=${function(event){setNCols(event.target.valueAsNumber)}} />
      ${" × "}
      <input type="number" size="3" name="nRows" value=${nRows} onChange=${function(event){setNRows(event.target.valueAsNumber)}} />
      ${" "}
      <label>Grid Size (pt): <input type="number" size="3" name="gridSize" value=${gridSize} onChange=${function(event){setGridSize(event.target.valueAsNumber)}} /></label>
      ${" "}
      ${" "}
      <label>Margin (pt): <input type="number" size="3" name="marginWidth" value=${marginWidth} onChange=${function(event){setMarginWidth(event.target.valueAsNumber)}} /></label>
      ${" "}
      <button onClick=${downloadSVG}>Download SVG</button>
    </p>
    <${Sieve} nRows=${nRows} nCols=${nCols} marginWidth=${marginWidth} cellWidth=${gridSize} cellHeight=${gridSize} />
  `;
}

render(html`<${App} />`, document.body);
