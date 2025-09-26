import { html, render, useState, Component } from 'https://esm.sh/htm/preact/standalone'



/*

layer 1 is white with all numbers visible
layer 2 is clear with translucent red circles for multiples of 2 ( or cat-eye shapes )
layer 3 is clear with translucent yellow triangles for multiples of 3
layer 5 is clear with translucent blue pentagons for multiples of 5
layer 7 is clear with translucent green 7-stars for multiples of 7
layer 11 is clear with translucent orange 11-stars for multiples of 11
layer 13 is clear with translucent purple 13-stars for multiples of 13

*/



function Sieve (props) {
  const defaultProps = {
    nRows: 20,
    nCols: 12,
    marginWidth: 4,
    cellWidth: 72,
    cellHeight: 72
  };
  const {nRows, nCols, marginWidth, cellWidth, cellHeight} = Object.assign({}, defaultProps, props);
  const cellEls = [];
  const textEls = [];
  for (let row = 0; row < nRows; row++) {
    for (let col = 0; col < nCols; col++) {
      let cellNum = (row * cols) + col + 1;
      cellEls.push(html`<rect
        x=${col*cellWidth + marginWidth}
        y=${row*cellHeight + marginWidth}
        width=${cellWidth - 2*marginWidth}
        height=${cellHeight - 2*marginWidth}
        rx=${2*marginWidth}
        ry=${2*marginWidth}
        fill="gray"
      />`);
      textEls.push(html`<text
        x=${(col+0.5)*cellWidth}
        y=${(row+0.5)*cellHeight}
        dominant-baseline="central"
        text-anchor="middle"
      >${cellNum}</text>`);
    }
  }
  return html`
    <svg xmlns="http://www.w3.org/2000/svg" version="1.1"
        width=${nCols*cellWidth} height=${nRows*cellHeight}>
      ${layers}
      <g id="cells">${cellEls}</g>
      <g id="texts">${textEls}</g>
    </svg>
  `;
}


render(html`<${Sieve} nRows=${20} nCols=${12} />`, document.body);
