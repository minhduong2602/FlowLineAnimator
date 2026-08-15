const { parseSVG } = require('svg-path-parser');
console.log(parseSVG('M 10 10 C 20 20, 40 20, 50 10 L 60 10 Z'));
