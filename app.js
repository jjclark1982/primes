import { html, render, useState, Component } from 'https://esm.sh/htm/preact/standalone'

function Sieve (props) {
  const defaultProps = {
    nRows: 20,
    nCols: 12,
    marginWidth: 4,
    cellWidth: 72,
    cellHeight: 72
  };
  const {nRows, nCols, marginWidth, cellWidth, cellHeight} = Object.assign({}, defaultProps, props);
  const layerSpecs = [
    {factor: 1,  fill: 'white', stroke:'black', text: true},  // layer 1 is white with all numbers visible
    {factor: 2,  fill: 'rgba(255, 0,   0,   0.25)'},  // layer 2 is clear with translucent red circles for multiples of 2 ( or cat-eye shapes )
    {factor: 3,  fill: 'rgba(255, 255, 0,   0.33)'},  // layer 3 is clear with translucent yellow triangles for multiples of 3
    {factor: 5,  fill: 'rgba(0,   0,   255, 0.25)'},  // layer 5 is clear with translucent blue pentagons for multiples of 5
    {factor: 7,  fill: 'rgba(0,   255, 0,   0.25)'},  // layer 7 is clear with translucent green 7-stars for multiples of 7
    {factor: 11, fill: 'rgba(255, 0,   255, 0.25)'},  // layer 11 is clear with translucent purple 11-stars for multiples of 11
    {factor: 13, fill: 'rgba(0,   255, 255, 0.25)'},  // layer 13 is clear with translucent orange 13-stars for multiples of 13
  ];
  const layers = [];
  for (const layerSpec of layerSpecs) {
    const {factor} = layerSpec;
    const cellEls = [];
    const textEls = [];
    for (let row = 0; row < nRows; row++) {
      for (let col = 0; col < nCols; col++) {
        let cellNum = (row * nCols) + col + 1;
        if (cellNum % factor == 0) {
          if (cellNum == factor && factor != 1) {
            cellEls.push(html`<circle class="factor-base"
              cx=${(col+0.5)*cellWidth}
              cy=${(row+0.5)*cellHeight}
              r=${cellWidth / 4}
              opacity="0.5"
            />`);
          }
          else {
            cellEls.push(html`<rect class="factor-multiple"
              x=${col*cellWidth + marginWidth}
              y=${row*cellHeight + marginWidth}
              width=${cellWidth - 2*marginWidth}
              height=${cellHeight - 2*marginWidth}
              rx=${2*marginWidth}
              ry=${2*marginWidth}
              // stroke=${layerSpec.stroke || ''}
            />`);
          }
        }
        if (layerSpec.text) {
          textEls.push(html`<text class="cell-number"
            x=${(col+0.5)*cellWidth}
            y=${(row+0.5)*cellHeight}
            dominant-baseline="central"
            text-anchor="middle"
          >${cellNum}</text>`);
        }
      }
    }
    layers.push(html`<g class="factor-layer" id=${'factor-'+layerSpec.factor} fill=${layerSpec.fill}>
      ${cellEls}
      ${textEls}
    </g>`);
  }
  return html`
    <svg xmlns="http://www.w3.org/2000/svg" version="1.1"
      viewbox="0 0 ${nCols*cellWidth+2*marginWidth} ${nRows*cellHeight+2*marginWidth}"
      width=${nCols*cellWidth+2*marginWidth} height=${nRows*cellHeight+2*marginWidth}
    >
      <style>
        .factor-layer {
          mix-blend-mode: darken;
        }
        .cell-number {
          font: ${cellWidth/3}px sans-serif;
          font-weight: bold;
          fill: #444;
        }
      </style>
      <rect x=${0} y=${0} width=${nCols*cellWidth+2*marginWidth} height=${nRows*cellHeight+2*marginWidth} rx=${2*marginWidth} ry=${2*marginWidth} fill="#eee" />
      <g transform="translate(${marginWidth}, ${marginWidth})">
        ${layers}
      </g>
    </svg>
  `;
}

render(html`<${Sieve} nRows=${20} nCols=${12} />`, document.body);
