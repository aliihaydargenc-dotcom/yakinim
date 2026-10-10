function HTMLActuator() {
  this.tileContainer    = document.querySelector(".tile-container");
  this.scoreContainer   = document.querySelector(".score-container");
  this.bestContainer    = document.querySelector(".best-container");
  this.messageContainer = document.querySelector(".game-message");

  this.score = 0;
  this.nodes = Object.create(null);
  this.pendingFrame = 0;
}

HTMLActuator.prototype.actuate = function (grid, metadata) {
  var self = this;
  if (this.pendingFrame) window.cancelAnimationFrame(this.pendingFrame);
  this.pendingFrame = window.requestAnimationFrame(function () {
    self.pendingFrame = 0;
    var previous = self.nodes;
    var current = Object.create(null);
    var merged = Object.create(null);
    grid.cells.forEach(function (column) {
      column.forEach(function (tile) {
        if (!tile) return;
        if (tile.mergedFrom) {
          tile.mergedFrom.forEach(function (source) { merged[source.id] = tile; });
        }
        self.addTile(tile, previous, current);
      });
    });
    Object.keys(previous).forEach(function (id) {
      var node = previous[id];
      if (current[id]) return;
      if (merged[id]) {
        var target = merged[id];
        node.className = "tile tile-" + (Number(node.dataset.value) || target.value / 2) + " " + self.positionClass(target);
        window.setTimeout(function () { node.remove(); }, 110);
      } else {
        node.remove();
      }
    });
    self.nodes = current;
    self.updateScore(metadata.score);
    self.updateBestScore(metadata.bestScore);
    if (metadata.terminated) {
      if (metadata.over) self.message(false);
      else if (metadata.won) self.message(true);
    }
  });
};

// Continues the game (both restart and keep playing)
HTMLActuator.prototype.continueGame = function () {
  this.clearMessage();
};

HTMLActuator.prototype.clearContainer = function (container) {
  while (container.firstChild) {
    container.removeChild(container.firstChild);
  }
};

HTMLActuator.prototype.addTile = function (tile, previous, current) {
  var node = previous[tile.id];
  var reused = !!node;
  if (!node) {
    node = document.createElement("div");
    var inner = document.createElement("div");
    inner.className = "tile-inner";
    inner.textContent = tile.value;
    node.appendChild(inner);
    node.dataset.value = tile.value;
    node.className = "tile tile-" + tile.value + " " + this.positionClass(tile.previousPosition || tile);
    if (tile.mergedFrom) node.classList.add("tile-merged");
    else if (!tile.previousPosition) node.classList.add("tile-new");
    this.tileContainer.appendChild(node);
  }
  current[tile.id] = node;
  var finalClass = "tile tile-" + tile.value + " " + this.positionClass(tile);
  if (tile.value > 2048) finalClass += " tile-super";
  if (reused) {
    if (node.className !== finalClass) node.className = finalClass;
  } else if (tile.previousPosition) {
    window.requestAnimationFrame(function () { node.className = finalClass; });
  }
};

HTMLActuator.prototype.applyClasses = function (element, classes) {
  element.setAttribute("class", classes.join(" "));
};

HTMLActuator.prototype.normalizePosition = function (position) {
  return { x: position.x + 1, y: position.y + 1 };
};

HTMLActuator.prototype.positionClass = function (position) {
  position = this.normalizePosition(position);
  return "tile-position-" + position.x + "-" + position.y;
};

HTMLActuator.prototype.updateScore = function (score) {
  this.clearContainer(this.scoreContainer);

  var difference = score - this.score;
  this.score = score;

  this.scoreContainer.textContent = this.score;

  if (difference > 0) {
    var addition = document.createElement("div");
    addition.classList.add("score-addition");
    addition.textContent = "+" + difference;

    this.scoreContainer.appendChild(addition);
  }
};

HTMLActuator.prototype.updateBestScore = function (bestScore) {
  this.bestContainer.textContent = bestScore;
};

HTMLActuator.prototype.message = function (won) {
  var type    = won ? "game-won" : "game-over";
  var message = won ? "Kazandın!" : "Oyun bitti!";

  this.messageContainer.classList.add(type);
  this.messageContainer.getElementsByTagName("p")[0].textContent = message;
};

HTMLActuator.prototype.clearMessage = function () {
  // IE only takes one value to remove at a time.
  this.messageContainer.classList.remove("game-won");
  this.messageContainer.classList.remove("game-over");
};
