import { html, render, useState } from 'https://esm.sh/htm/preact/standalone'

// Bezier curve helper functions
// see https://math.stackexchange.com/questions/873224/calculate-control-points-of-cubic-bezier-curve-approximating-a-part-of-a-circle
const α = (Math.sqrt(2)-1)*4/3; // about 0.552

// corner with horizontal first
function cornerPathH(rx, ry) {
  return `c ${α*rx},0 ${rx},${(1-α)*ry} ${rx},${ry}`;
}

// corner with vertical first
function cornerPathV(rx, ry) {
  return `c 0,${α*ry} ${(1-α)*rx},${ry} ${rx},${ry}`;
}

// corner clockwise
function cornerPathCW(rx, ry) {
  return `a ${rx},${ry} 90 0 1 ${rx},${ry}`;
}

// corner counterclockwise
function cornerPathCCW(rx, ry) {
  return `a ${rx},${ry} 90 0 0 ${rx},${ry}`;
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
    cornerPathCW(rx, ry),
    `v ${height - 2*ry}`,
    cornerPathCW(-rx, ry),
    `h ${-(width - 2*rx)}`,
    cornerPathCW(-rx, -ry),
    `v ${-(height - 2*ry)}`,
    cornerPathCW(rx, -ry),
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
    cornerPathCCW(rx, -ry),
    `v ${-(height - 2*ry)}`,
    cornerPathCW(rx, -ry),
    `h ${width - 2*ry}`,
    cornerPathCW(rx, ry),
    `v ${height - 2*ry}`,
    cornerPathCCW(rx, ry),
  ].join(' ');
}

/**
 * Generate bezier curve for a cicrle.
 * @returns pathData
 */
function circlePath({cx, cy, rx, ry}) {
  return [
    `M ${cx},${cy-ry}`,
    cornerPathCW( rx,  ry),
    cornerPathCW(-rx,  ry),
    cornerPathCW(-rx, -ry),
    cornerPathCW( rx, -ry),
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
    marginSize: 5.66, // 1.5 mm
    cellWidth: 84, // 7/8 inch
    cellHeight: 84,
    nHolePunch: 3,
    holePunchSize: 32, // 1/3 inch
    holePunchSpacing: 4.25*96, // US Letter 3-ring binder spacing is 4.25 inches
                               // 8 * 96/2.54 // Euro A4 binder spacing is 8 cm
    makeBeads: true,
  };
  props = Object.assign({}, defaultProps, props);
  const {nRows, nCols, marginSize, cellWidth, cellHeight, nHolePunch, holePunchSize} = props;

  const [confirmGeneration, setConfirmGeneration] = useState(false);
  if ((nRows * nCols > 1024) && (confirmGeneration == false)) {
    return html`<p>
      ${nCols} × ${nRows} table will take some time to generate. <button onClick=${()=>setConfirmGeneration(true)}>Proceed</button>
    </p>`;
  }

  const totalWidth = nCols*cellWidth + 2*marginSize;
  const totalHeight = (nRows+0.5)*cellHeight + 3*marginSize + (nHolePunch > 0)*(holePunchSize + 4*marginSize);
  const title = [
    `Sieve ${nCols}x${nRows} ${cellWidth}+${marginSize}px`,
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
      ${layerSpecs.map((layerSpec)=>SieveLayer({makeBeads: true, ...props, ...layerSpec}))}
    </svg>
  `;
}

function SieveLayer({nRows, nCols, marginSize, cellWidth, cellHeight, nHolePunch, holePunchSize, holePunchSpacing, factor, fill, showOutlines, showNumbers, makeBeads}) {
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
  const beadEls = [];

  for (let row = 0; row < nRows; row++) {
    for (let col = 0; col < nCols; col++) {
      const cellNum = (row * nCols) + col + 1;

      const cellPath = roundRectPath({
        x: col*cellWidth + marginSize,
        y: row*cellHeight + marginSize,
        width: cellWidth - 2*marginSize,
        height: cellHeight - 2*marginSize,
        rx: 3*marginSize,
        ry: 3*marginSize
      });

      if (cellNum == factor && factor != 1) {
        // base factor has a smaller cutout
        const insetCellPath = roundRectPath({
          x: col*cellWidth + 3*marginSize,
          y: row*cellHeight + 3*marginSize,
          width: cellWidth - 6*marginSize,
          height: cellHeight - 6*marginSize,
          rx: 2*marginSize,
          ry: 2*marginSize
        });
        cutOutPaths.push(insetCellPath);
      }
      else if (cellNum % factor != 0) {
        // non-multiples are fully cut out
        cutOutPaths.push(cellPath);
        beadEls.push(html`<circle
          cx=${col*cellWidth + 5*marginSize}
          cy=${row*cellHeight + 5*marginSize}
          r=${2*marginSize}
        />`);
      }
      else {
        // multiples have etched outlines, optionally
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

  const footerHeight = (nHolePunch > 0) ? holePunchSize + 4*marginSize : 0;
  if (nHolePunch > 0) {
    const startX = (nCols/2)*cellWidth - holePunchSpacing * (nHolePunch-1)/2;
    for (let i = 0; i < nHolePunch; i++) {
      cutOutPaths.push(circlePath({
        cx: startX + i*holePunchSpacing,
        cy: (nRows*cellHeight) + 2*marginSize + holePunchSize/2,
        rx: holePunchSize/2, ry: holePunchSize/2
      }));
    }
  }

  const outerFrame = roundRectPath({
    x: -marginSize, y: -marginSize,
    width: nCols*cellWidth + 2*marginSize, 
    height: nRows*cellHeight + 2*marginSize + footerHeight,
    rx: 4*marginSize, ry: 4*marginSize
  });

  if (factor > 1 && factor <= nCols) {
    if (factor == nCols) {
      // slightly wider tab in the rightmost position
      cutOutPaths.push(tabPath({
        x: (factor-1)*cellWidth - 3*marginSize,
        y: -marginSize,
        width: cellWidth + marginSize,
        height: cellHeight/2 + marginSize,
        rx: 3*marginSize,
        ry: 3*marginSize
      }).replace(/[ac][^ac]*$/i, '') + outerFrame.replace(/.*?v/, `v ${7*marginSize} v`));
    }
    else {
      // standard tab is exactly as wide as the grid
      cutOutPaths.push(tabPath({
        x: (factor-1)*cellWidth - 3*marginSize,
        y: -marginSize,
        width: cellWidth,
        height: cellHeight/2 + marginSize,
        rx: 3*marginSize,
        ry: 3*marginSize
      }) + outerFrame.replace('M', ' L'));
    }
    textEls.push(html`<text
      x=${(factor-0.5)*cellWidth}
      y=${-cellHeight/6 - marginSize}
      text-anchor="middle"
    >${factor}</text>`);
  }
  else {
    cutOutPaths.push(outerFrame);
  }

  return html`<g id=${'factor-'+factor}
    transform=${`translate(${marginSize},${cellHeight/2 + 2*marginSize})`}
    style="mix-blend-mode: darken;"
  >
    <path id="cutout-path"
      d=${cutOutPaths.join(' ')}
      fill-rule="evenodd"
      fill=${fill}
      opacity=${factor == 1 ? 1 : 1/3}
    />
    <path id="etch-path"
      d=${outlinePaths.join(' ')}
      fill="rgba(255,255,255,0)"
      stroke=${showOutlines ? fill : ''}
    />
    <g id="bead-threads" fill="transparent">
      ${beadEls}
    </g>
    <g id="legend-text"
      fill="#444"
      style="font-size: ${cellHeight/3}px; font-weight: bold; font-family: sans-serif;"
    >
      ${textEls}
    </g>
  </g>`;
}

function NumberInput({label, name, value, setValue, unit}) {
  let unitLabel = null;
  if (unit == 'px') {
    const unitTitle = `1 px = 1/96 inch\n${value} px = ${(value/96).toFixed(3)} inch\n${value} px = ${(value*2.54/96).toFixed(3)} cm`;
    unitLabel = html`${" "}<abbr title=${unitTitle}>(px)</abbr>`;
  }
  const inputEl = html`<input type="number" style="width:3.5em;" name=${name} value=${value} onChange=${function(event){setValue(event.target.valueAsNumber)}} />`;
  if (label) {
    return (html`
      <label>
        ${label}${unitLabel}: ${inputEl}
      </label>
    `)
  }
  else {
    return inputEl;
  }
}

function App() {
  const [nRows, setNRows] = useState(12);
  const [nCols, setNCols] = useState(12);
  const [gridSize, setGridSize] = useState(80);
  const [marginSize, setMarginSize] = useState(5);
  const [nHolePunch, setNHolePunch] = useState(3);
  const [holePunchSize, setHolePunchSize] = useState(32);
  const [holePunchSpacing, setHolePunchSpacing] = useState(4.25*96);
  return html`
    <h1>
      <a href="https://en.wikipedia.org/wiki/Sieve_of_Eratosthenes">Sieve of Eratosthenes</a> Cutout Pattern Generator
    </h1>
    <div style="position: fixed; bottom: 1em; right: 1em;">
      <a href="https://github.com/jjclark1982/primes" title="Feedback">π</a>
    </div>
    <fieldset style="border: 0; margin: -1em 0 1em 0;">
      <${NumberInput} name="nCols" label="Table Size" value=${nCols} setValue=${setNCols} />
      ${" × "}
      <${NumberInput} name="nRows" value=${nRows} setValue=${setNRows} />
      ${" "}
      <${NumberInput} name="gridSize" label="Grid Size" unit="px" value=${gridSize} setValue=${setGridSize} />
      ${" "}
      <${NumberInput} name="marginSize" label="Margin Size" unit="px" value=${marginSize} setValue=${setMarginSize} />
      <br />
      <${NumberInput} name="nHolePunch" label="Hole Punch" value=${nHolePunch} setValue=${setNHolePunch} />
      ${" "}
      <${NumberInput} name="holePunchSize" label="Size" unit="px" value=${holePunchSize} setValue=${setHolePunchSize} />
      ${" "}
      <${NumberInput} name="holePunchSpacing" label="Spacing" unit="px" value=${holePunchSpacing} setValue=${setHolePunchSpacing} />
      ${" "}
      <button onClick=${downloadSVG}>Download SVG</button>
    </fieldset>
    <${Sieve}
      nRows=${nRows} nCols=${nCols}
      marginSize=${marginSize} cellWidth=${gridSize} cellHeight=${gridSize}
      nHolePunch=${nHolePunch} holePunchSize=${holePunchSize} holePunchSpacing=${holePunchSpacing}
    />
  `;
}

render(html`<${App} />`, document.body);
