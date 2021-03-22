const PENDING = 'pending';
const FULFILLED = 'fulfilled';
const REJECTED = 'rejected';

class ToyPromise {
  constructor(fn) {
    this.state = PENDING;

    this.value = null;

    this.reason = null;

    this.onFulFilledCallbacks = [];

    this.onRejectedCallbacks = [];

    const resolve = value => {
      setTimeout(() => {
        if (this.state === PENDING) {
          this.state = FULFILLED;
          this.value = value;
          this.onFulFilledCallbacks.map(cb => {
            this.value = cb(this.value);
          });
        }
      });
    };

    const reject = reason => {
      setTimeout(() => {
        if (this.state === PENDING) {
          this.state = REJECTED;

          this.reason = reason;
          this.onRejectedCallbacks.map(cb => {
            this.reason = cb(this.reason);
          })
        }
      });
    };

    try {
      fn(resolve, reject);
    } catch(e) {
      reject(e);
    }

  }

  then(onFulfiled, onRejected) {
    let newPromise;

    onFulfiled = typeof onFulfiled === 'function' ? onFulfiled : value => value;
    onRejected = typeof onRejected === 'function' ? onRejected : reason => { throw reason };

    if (this.state === FULFILLED) {
      return (newPromise = new ToyPromise((resolve, reject) => {
        setTimeout(() => {
          try {
            let x = onFulfiled(this.value);
            resolvePromise(newPromise, x, resolve, reject);
          } catch(e) {
            reject(e);
          }
        });
      }))
    }

    if (this.state === REJECTED) {
      return (newPromise = new ToyPromise((resolve, reject) => {
        setTimeout(() => {
          try {
            let x = onRejected(this.reason);
            resolvePromise(newPromise, x, resolve, reject);
          } catch(e) {
            reject(e);
          }
        });
      }))
    }

    if (this.state === PENDING) {
      return (newPromise = new ToyPromise((resolve, reject) => {
        this.onFulFilledCallbacks.push(value => {
          try {
            let x = onFulfiled(value);
            resolvePromise(newPromise, x);
          } catch(e) {
            reject(e);
          }
        });

        this.onRejectedCallbacks.push(reason => {
          try {
            let x = onRejected(reason);
            resolvePromise(newPromise, x);
          } catch(e) {
            reject(e);
          }
        })
      }));
    }
  }

  catch(onRejected) {
    return this.then(null, onRejected);
  }
}

function gen(length, resolve) {
  let count = 0;
  let values = [];
  return (i, value) => {
    value[i] = value;
    if (++count === length) {
      console.log(values);
      resolve(values);
    }
  }
}

function resolvePromise(promise2, x, resolve, reject) {
  if (x === promise2) {
    reject(new TypeError('循环引用'));
  }
  if (x instanceof ToyPromise) {
    if (x.state === PENDING) {
      x.then(
        y => {
          resolvePromise(promise2, y, resolve, reject);
        },
        reason => {
          reject(reason);
        }
      );
    } else {
      x.then(resolve, reject);
    }
  } else if (x && (typeof x === 'function' || typeof x === 'object')) {
    let called = false;
    try {
      let then = x.then;
      if (typeof then === 'function') {
        then.call(x,
          y => {
            if (called) return;
            called = true;
            resolvePromise(promise2, y, resolve, reject);
          },
          r => {
            if (called) return;
            called = true;
            reject(r);
          }
        );
      } else {
        resolve(x);
      }
    } catch(e) {
      if (called) return;
      called = true;
      reject(e);
    }
  } else {
    resolve(x);
  }
}

ToyPromise.all = function(promises) {
  return new ToyPromise((resolve, reject) => {
    let done = gen(promises.length, resolve);
    promises.forEach((promise, index) => {
      promise.then((value) => {
        done(index, value);
      }, reject);
    })
  })
}

ToyPromise.race = function(promises) {
  return new ToyPromise((resovle, reject) => {
    promises.forEach((promise) => {
      promise.then(resovle, reject);
    })
  })
}

ToyPromise.deferred = function() {
  let defer = {};
  defer.promise = new ToyPromise((resolve, reject) => {
    defer.resolve = resolve;
    defer.reject = reject;
  });
  return defer;
};

export default ToyPromise;

// module.exports = ToyPromise;