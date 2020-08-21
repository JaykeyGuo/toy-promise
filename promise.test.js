const ToyPromise = require('./toy-promise.js');

new ToyPromise((resolve, reject) => {
  setTimeout(() => {
    resolve(2);
  }, 2000);
}).then(res => {
  console.log(res);
  return res + 1;
}).then(res => {
  console.log(res);
});