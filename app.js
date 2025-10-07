import { html, render, useState } from 'https://esm.sh/htm/preact/standalone'

// Bezier curve helper functions
// see https://math.stackexchange.com/questions/873224/calculate-control-points-of-cubic-bezier-curve-approximating-a-part-of-a-circle
const α = (Math.sqrt(2)-1)*4/3; // about 0.552

function cornerPathH(rx, ry) {
  return `c ${α*rx},0 ${rx},${(1-α)*ry} ${rx},${ry}`;
}

function cornerPathV(rx, ry) {
  return `c 0,${α*ry} ${(1-α)*rx},${ry} ${rx},${ry}`;
}

/**
 * Generate bezier curve for a rounded rectangle.
 * (Same parameters as the <rect> element.)
 * Starts at the top right and ends at the top left, so it can be easily joined to tab paths.
 * @returns pathData
 */
function roundRectPath({x, y, width, height, rx, ry}) {
  return [
    `M ${x + width - rx},${y}`,
    cornerPathH(rx, ry),
    `v ${height - 2*ry}`,
    cornerPathV(-rx, ry),
    `h ${-(width - 2*rx)}`,
    cornerPathH(-rx, -ry),
    `v ${-(height - 2*ry)}`,
    cornerPathV(rx, -ry),
    `Z`,
  ].join(' ');
}

/**
 * Generate bezier curve for a rounded "tab" that can extend from the top of a rectangle.
 * @returns pathData
 */
function tabPath({x, y, width, height, rx, ry}) {
  return [
    `M ${x},${y}`,
    cornerPathH(rx, -ry),
    `v ${-(height - 2*ry)}`,
    cornerPathV(rx, -ry),
    `h ${width - 2*ry}`,
    cornerPathH(rx, ry),
    `v ${height - 2*ry}`,
    cornerPathV(rx, ry),
  ].join(' ');
}

/**
 * Generate bezier curve for a cicrle.
 * @returns pathData
 */
function circlePath({cx, cy, rx, ry}) {
  return [
    `M ${cx},${cy-ry}`,
    cornerPathH( rx,  ry),
    cornerPathV(-rx,  ry),
    cornerPathH(-rx, -ry),
    cornerPathV( rx, -ry),
    `Z`
  ].join(' ');
}

/**
 * Download the first <SVG> element on the page.
 */
function downloadSVG() {
  const svgEl = document.querySelector('svg');
  const filename = (svgEl.querySelector('title')?.textContent || 'download').split('\n')[0];
  const blob = new Blob([svgEl.outerHTML], {type: 'image/svg+xml'});
  const a = document.createElement('a');
  a.setAttribute('href', URL.createObjectURL(blob));
  a.setAttribute('download', filename);
  a.click();
};

const layerSpecs = [
  {factor: 1,  fill: 'white', showOutlines: true, showNumbers: true},  // layer 1 is white with engraved labels
  {factor: 2,  fill: 'rgba(0  , 255, 255, 0.75)'},  // layer 2 is translucent cyan with cutouts for non-multiples of 2
  {factor: 3,  fill: 'rgba(255, 0  , 255, 0.75)'},  // layer 3 is translucent magenta with cutouts for non-multiples of 3
  {factor: 5,  fill: 'rgb( 255, 255, 0        )'},  // layer 5 is translucent yellow with cutouts for non-multiples of 5
  {factor: 7,  fill: 'rgba(0  , 0  , 255, 0.75)'},  // layer 7 is translucent blue with cutouts for non-multiples of 7
  {factor: 11, fill: 'rgba(255, 0  , 0  , 0.75)'},  // layer 11 is translucent red with cutouts for non-multiples of 11
  {factor: 13, fill: 'rgba(0  , 255, 0  , 0.75)'},  // layer 13 is translucent green with cutouts for non-multiples of 13
  {factor: 17, fill: 'rgba(255, 0  , 127, 0.75)'},
  {factor: 23, fill: 'rgba(127, 255, 0  , 0.75)'},
  {factor: 19, fill: 'rgba(0  , 127, 255, 0.75)'},
  {factor: 29, fill: 'rgba(255, 127, 0  , 0.75)'},
  {factor: 31, fill: 'rgba(0  , 255, 127, 0.75)'},
  {factor: 37, fill: 'rgba(127, 0  , 255, 0.75)'},
];

function Sieve(props) {
  const defaultProps = {
    nRows: 12,
    nCols: 12,
    marginWidth: 6,
    cellWidth: 96,
    cellHeight: 96,
  };
  props = Object.assign({}, defaultProps, props);
  const {nRows, nCols, marginWidth, cellWidth, cellHeight} = props;

  const [confirmGeneration, setConfirmGeneration] = useState(false);
  if ((nRows * nCols > 1024) && (confirmGeneration == false)) {
    return html`<p>
      ${nCols} × ${nRows} table will take some time to generate. <button onClick=${()=>setConfirmGeneration(true)}>Proceed</button>
    </p>`;
  }

  const totalWidth = nCols*cellWidth + 2*marginWidth;
  const totalHeight = (nRows+0.5)*cellHeight + 3*marginWidth;
  const title = [
    `Sieve ${nCols}x${nRows} ${cellWidth}+${marginWidth}px`,
    '',
    `Total Size\n${totalWidth} × ${totalHeight} px`,
    `${(totalWidth/96).toFixed(2)} × ${(totalHeight/96).toFixed(2)} in`,
    `${(totalWidth/96*2.54).toFixed(2)} × ${(totalHeight/96*2.54).toFixed(2)} cm`,
  ].join('\n');

  return html`
    <svg xmlns="http://www.w3.org/2000/svg" version="1.1"
      viewbox="0 0 ${totalWidth} ${totalHeight}"
      width=${totalWidth} height=${totalHeight}
    >
      <title>${title}</title>
      ${layerSpecs.map((layerSpec)=>SieveLayer({...props, ...layerSpec}))}
    </svg>
  `;
}

function SieveLayer({nRows, nCols, marginWidth, cellWidth, cellHeight, factor, fill, showOutlines, showNumbers}) {
  if (factor > Math.sqrt(nCols * nRows)) {
    // skip redundant layers
    return null;
  }
  // solid frame
  const cutOutPaths = [];
  // etched outlines
  const outlinePaths = [];
  // engraved numbers
  const textEls = [];

  for (let row = 0; row < nRows; row++) {
    for (let col = 0; col < nCols; col++) {
      const cellNum = (row * nCols) + col + 1;

      const cellPath = roundRectPath({
        x: col*cellWidth + marginWidth,
        y: row*cellHeight + marginWidth,
        width: cellWidth - 2*marginWidth,
        height: cellHeight - 2*marginWidth,
        rx: 3*marginWidth,
        ry: 3*marginWidth
      });

      if (cellNum == factor && factor != 1) {
        // base factor has a smaller cutout
        const insetCellPath = roundRectPath({
          x: col*cellWidth + 3*marginWidth,
          y: row*cellHeight + 3*marginWidth,
          width: cellWidth - 6*marginWidth,
          height: cellHeight - 6*marginWidth,
          rx: 2*marginWidth,
          ry: 2*marginWidth
        });
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
      if (showNumbers) {
        textEls.push(html`<text class="legend-text"
          x=${(col+0.5)*cellWidth}
          y=${(row+0.5)*cellHeight + cellHeight/9}
          text-anchor="middle"
        >${cellNum}</text>`);
      }
    }
  }

  const outerFrame = roundRectPath({
    x: -marginWidth, y: -marginWidth,
    width: nCols*cellWidth + 2*marginWidth, 
    height: nRows*cellHeight + 2*marginWidth,
    rx: 4*marginWidth, ry: 4*marginWidth
  });

  if (factor > 1 && factor <= nCols) {
    cutOutPaths.push(tabPath({
      x: (factor-1)*cellWidth - 3*marginWidth,
      y: -marginWidth,
      width: cellWidth,
      height: cellHeight/2 + marginWidth,
      rx: 3*marginWidth,
      ry: 3*marginWidth
    }) + outerFrame.replace('M', ' L'));
    textEls.push(html`<text class="legend-text"
      x=${(factor-0.5)*cellWidth}
      y=${-cellHeight/6 - marginWidth}
      text-anchor="middle"
    >${factor}</text>`);
  }
  else {
    cutOutPaths.push(outerFrame);
  }

  return html`<g class="factor-layer" id=${'factor-'+factor}
    transform=${`translate(${marginWidth},${cellHeight/2 + 2*marginWidth})`}
    style="mix-blend-mode: darken;"
  >
    <path class="cutout-path"
      d=${cutOutPaths.join(' ')}
      fill-rule="evenodd"
      fill=${fill}
      opacity=${factor == 1 ? 1 : 1/3}
    />
    <path class="etch-path"
      d=${outlinePaths.join(' ')}
      fill="rgba(255,255,255,0)"
      stroke=${showOutlines ? fill : ''}
    />
    <g class="legend-text"
      fill="#444"
      style="font-size: ${cellHeight/3}px; font-weight: bold; font-family: sans-serif;"
    >
      ${textEls}
    </g>
  </g>`;
}

function App() {
  const [nRows, setNRows] = useState(12);
  const [nCols, setNCols] = useState(12);
  const [gridSize, setGridSize] = useState(80);
  const [marginWidth, setMarginWidth] = useState(5);
  return html`
    <h1>
      <a href="https://en.wikipedia.org/wiki/Sieve_of_Eratosthenes">Sieve of Eratosthenes</a> Cutout Pattern Generator
    </h1>
    <div style="position: fixed; bottom: 1em; right: 1em;">
      <a href="https://github.com/jjclark1982/primes" title="Feedback">π</a>
    </div>
    <fieldset style="border: 0; margin: -1em 0 1em 0;">
      <label>
        Table Size:
        ${" "}
        <input type="number" style="width:3.5em;" name="nCols" value=${nCols} onChange=${function(event){setNCols(event.target.valueAsNumber)}} />
        ${" × "}
        <input type="number" style="width:3.5em;" name="nRows" value=${nRows} onChange=${function(event){setNRows(event.target.valueAsNumber)}} />
      </label>
      ${" "}
      <label>
        Grid Size (px): <input type="number" style="width:3.5em;" name="gridSize" value=${gridSize} onChange=${function(event){setGridSize(event.target.valueAsNumber)}} />
      </label>
      ${" "}
      <label>
        Margin (px): <input type="number" style="width:3.5em;" name="marginWidth" value=${marginWidth} onChange=${function(event){setMarginWidth(event.target.valueAsNumber)}} />
      </label>
      ${" "}
      <button onClick=${downloadSVG}>Download SVG</button>
    </fieldset>
    <${Sieve} nRows=${nRows} nCols=${nCols} marginWidth=${marginWidth} cellWidth=${gridSize} cellHeight=${gridSize} />
  `;
}

render(html`<${App} />`, document.body);
