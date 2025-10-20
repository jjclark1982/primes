import { html, render, useState, useEffect } from 'https://esm.sh/htm/preact/standalone'

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
function tabPath({x, y, width, height, rx, ry, curvedStart=true, curvedEnd=true}) {
  const rx1 = curvedStart ? rx : 0;
  const rx4 = curvedEnd ? rx : 0;
  return [
    `M ${x - rx1},${y}`,
    cornerPathH(rx, -ry),
    `v ${-(height - 2*ry)}`,
    cornerPathV(rx, -ry),
    `h ${width - 2*rx}`,
    cornerPathH(rx, ry),
    `v ${height - 2*ry}`,
    cornerPathV(rx4, ry),
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

const layerDefs = [
  {factor: 1,  fill: 'white', drawOutlines: true, showNumbers: true},  // layer 1 is white with engraved labels
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
  props = Object.assign({}, defaultParams, props);
  const {nRows, nCols, marginSize, gridSize, sharpness, nHolePunch, holePunchSize} = props;
  const cellWidth = gridSize;
  const cellHeight = gridSize;
  const rx = cellWidth/((sharpness/4)+2);
  const ry = cellHeight/((sharpness/4)+2);

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
    `Total Size`,
    `${totalWidth} × ${totalHeight} px`,
    `${(totalWidth/96).toFixed(2)} × ${(totalHeight/96).toFixed(2)} in`,
    `${(totalWidth/96*2.54).toFixed(2)} × ${(totalHeight/96*2.54).toFixed(2)} cm`,
    '',
    `Cell Cutout Width`,
    `${cellWidth - 2*marginSize} px`,
    `${((cellWidth - 2*marginSize)/96).toFixed(2)} in`,
    `${((cellWidth - 2*marginSize)/96*2.54).toFixed(2)} cm`,
  ].join('\n');

  return html`
    <svg xmlns="http://www.w3.org/2000/svg" version="1.1"
      viewbox="0 0 ${totalWidth} ${totalHeight}"
      width=${totalWidth} height=${totalHeight}
    >
      <title>${title}</title>
      ${layerDefs.map((layerDef)=>SieveLayer({...props, cellWidth, cellHeight, rx, ry, layerDef}))}
    </svg>
  `;
}

function SieveLayer({nRows, nCols, marginSize, cellWidth, cellHeight, rx, ry, nHolePunch, holePunchSize, holePunchSpacing, layerDef}) {
  const { factor, fill, drawOutlines, showNumbers } = layerDef;
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
        rx: rx - 1*marginSize,
        ry: ry - 1*marginSize
      });

      if (cellNum == factor && factor != 1) {
        // base factor has a smaller cutout
        const insetCellPath = roundRectPath({
          x: col*cellWidth + 3*marginSize,
          y: row*cellHeight + 3*marginSize,
          width: cellWidth - 6*marginSize,
          height: cellHeight - 6*marginSize,
          rx: Math.max(0, rx - 3*marginSize),
          ry: Math.max(0, ry - 3*marginSize),
        });
        cutOutPaths.push(insetCellPath);
      }
      else if (cellNum % factor != 0) {
        // non-multiples are fully cut out
        cutOutPaths.push(cellPath);
        // fully cut out cells can be perforated to make beads (optionally)
        beadEls.push(html`<circle
          cx=${col*cellWidth + 5*marginSize}
          cy=${row*cellHeight + 5*marginSize}
          r=${2*marginSize}
        />`);
      }
      else {
        // multiples have etched outlines (optionally)
        outlinePaths.push(cellPath);
        // non-cutout cells have engraved numbers (optionally)
        if (showNumbers) {
          textEls.push(html`<text class="legend-text"
            x=${(col+0.5)*cellWidth}
            y=${(row+0.5)*cellHeight + cellHeight/9}
            text-anchor="middle"
          >${cellNum}</text>`);
        }
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
    rx: rx + 1*marginSize,
    ry: ry + 1*marginSize
  });

  if (factor > 1 && factor <= nCols) {
    const tabPathParams = {
      x: (factor-1)*cellWidth,
      y: -marginSize,
      width: cellWidth,
      height: cellHeight/2 + marginSize,
      rx: cellWidth/4,
      ry: cellHeight/4
    };
    if (factor == nCols) {
      // slightly wider tab in the rightmost position
      tabPathParams.width += marginSize;
      tabPathParams.curvedEnd = false;
      cutOutPaths.push(tabPath(tabPathParams) +
        outerFrame.replace(/.*?v/, `v ${marginSize + ry} v`)
      );
    }
    else {
      // standard tab is exactly as wide as the grid
      cutOutPaths.push(tabPath(tabPathParams) + outerFrame.replace('M', ' L'));
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
      stroke=${drawOutlines ? fill : ''}
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

function encodeQueryString(obj) {
  const kvPairs = [];
  for (const [key, value] of Object.entries(obj)) {
    kvPairs.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
  }
  return '?'+kvPairs.join('&');
}

function decodeQueryString(qs) {
  const obj = {};
  for (const kvString of qs.substr(1).split('&')) {
    const kvArray = kvString.split('=');
    const key = decodeURIComponent(kvArray[0]);
    const value = decodeURIComponent(kvArray[1]);
    const valueNum = parseFloat(value);
    obj[key] = valueNum == value ? valueNum : value;
  }
  return obj;
}

function App(initialValues) {
  const [nCols, setNCols] = useState(initialValues.nCols);
  const [nRows, setNRows] = useState(initialValues.nRows);
  const [gridSize, setGridSize] = useState(initialValues.gridSize);
  const [marginSize, setMarginSize] = useState(initialValues.marginSize);
  const [sharpness, setSharpness] = useState(initialValues.sharpness);
  const [nHolePunch, setNHolePunch] = useState(initialValues.nHolePunch);
  const [holePunchSize, setHolePunchSize] = useState(initialValues.holePunchSize);
  const [holePunchSpacing, setHolePunchSpacing] = useState(initialValues.holePunchSpacing);
  const sieveParams = {nCols, nRows, gridSize, marginSize, sharpness, nHolePunch, holePunchSize, holePunchSpacing};
  const permalink = encodeQueryString(sieveParams);
  if (document.location.search) {
    useEffect(()=>{
      history.replaceState(sieveParams, null, permalink);
    }, [permalink]);
  }
  const handleReset = ()=>{
    document.location.replace('.');
  };
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
      ${" "}
      <${NumberInput} name="sharpness" label="Corner Sharpness" value=${sharpness} setValue=${setSharpness} />
      <br />
      <${NumberInput} name="nHolePunch" label="Hole Punch" value=${nHolePunch} setValue=${setNHolePunch} />
      ${" "}
      <${NumberInput} name="holePunchSize" label="Size" unit="px" value=${holePunchSize} setValue=${setHolePunchSize} />
      ${" "}
      <${NumberInput} name="holePunchSpacing" label="Spacing" unit="px" value=${holePunchSpacing} setValue=${setHolePunchSpacing} />
      <br />
      <button onClick=${handleReset}>Reset</button>
      ${" "}
      <a href=${permalink} title="Link to the current configuration">Permalink</a>
      ${" "}
      <button onClick=${downloadSVG}>Download SVG</button>
    </fieldset>
    <${Sieve} ...${sieveParams} />
  `;
}

const defaultParams = {
  nCols: 12,
  nRows: 12,
  gridSize: 86, // fit in 10.9-inch cuttable area
  // gridSize: 84, // 84px = 7/8 inch
  marginSize: 5.5,
  // marginSize: 5.66, // 5.66px = 1.5mm, good for 3mm thick material
  sharpness: 4,
  nHolePunch: 3,
  holePunchSize: 32, // 1/3 inch
  holePunchSpacing: 4.25*96 // US Letter 3-ring binder spacing is 4.25 inches
  // holePunchSpacing: 8 * 96/2.54, // Euro A4 binder spacing is 8 cm
};

const initialValues = Object.assign({}, defaultParams, decodeQueryString(document.location.search));

render(html`<${App} ...${initialValues}/>`, document.body);
