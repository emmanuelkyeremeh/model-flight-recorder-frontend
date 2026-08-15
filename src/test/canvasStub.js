function noop() {}

HTMLCanvasElement.prototype.getContext = function getContext() {
  return {
    canvas: this,
    fillStyle: "",
    strokeStyle: "",
    lineWidth: 1,
    font: "",
    clearRect: noop,
    fillRect: noop,
    stroke: noop,
    beginPath: noop,
    moveTo: noop,
    lineTo: noop,
    fillText: noop,
    arc: noop,
    fill: noop,
    setTransform: noop,
  };
};
