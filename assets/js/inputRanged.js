function createBins(max) {
  const binContainer = document.getElementById("binContainer");
  for (let i = 0; i <= +max; i++) {
    const bin = document.createElement("div");
    bin.className = "bin";
    bin.textContent = i;
    binContainer.appendChild(bin);
  }
}

function updateBins(value) {
  const bins = binContainer.getElementsByClassName("bin");

  for (let i = 0; i < bins.length - 1; i++) {
    if (i <= value) {
      bins[i].style.color = "blue";
      bins[i].style.fontWeight = "bold";
    } else {
      bins[i].style.color = "black";
      bins[i].style.fontWeight = "normal";
    }
  }
}

export { createBins, updateBins };
