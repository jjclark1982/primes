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
    {factor: 3,  fill: 'rgba(255, 255, 0,   0.25)'},  // layer 3 is clear with translucent yellow triangles for multiples of 3
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
        if (factor == 1 || (cellNum % factor == 0 && cellNum > factor)) {
          cellEls.push(html`<rect
            x=${col*cellWidth + marginWidth}
            y=${row*cellHeight + marginWidth}
            width=${cellWidth - 2*marginWidth}
            height=${cellHeight - 2*marginWidth}
            rx=${2*marginWidth}
            ry=${2*marginWidth}
            fill=${layerSpec.fill}
            stroke=${layerSpec.stroke || ''}
          />`);
        }
        if (cellNum == factor) {
          cellEls.push(html`<circle
            cx=${(col+0.5)*cellWidth}
            cy=${(row+0.5)*cellHeight}
            r=${6*marginWidth}
            fill="transparent"
            stroke=${layerSpec.fill}
            stroke-width="${marginWidth}"
          />`);
        }
        if (layerSpec.text) {
          textEls.push(html`<text
            x=${(col+0.5)*cellWidth}
            y=${(row+0.5)*cellHeight}
            dominant-baseline="central"
            text-anchor="middle"
          >${cellNum}</text>`);
        }
      }
    }
    layers.push(html`<g id=${'factor-'+layerSpec.factor}>
      ${cellEls}
      ${textEls}
    </g>`);
  }
  return html`
    <svg xmlns="http://www.w3.org/2000/svg" version="1.1"
        width=${nCols*cellWidth} height=${nRows*cellHeight}>
      ${layers}
    </svg>
  `;
}

render(html`<${Sieve} nRows=${20} nCols=${12} />`, document.body);
