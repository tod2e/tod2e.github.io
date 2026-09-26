'use strict';
importScripts('engine.js');
self.onmessage = function (event) {
  const {id, board, difficulty} = event.data;
  const column = self.ConnectFour.chooseDifficultyMove(board, 2, difficulty);
  self.postMessage({id, column});
};
