const PENDING = 'pending';
const FULFILLED = 'fulfilled';
const REJECTED = 'rejected';

class Bromise {
  constructor(fn) {
    this.state = PENDING;
    this.value = null;
    this.reason = null;
    this.onFulFilledCallbacks = [];
    this.onRejectedCallbacks = [];

    const resolve = (value) => {
      window.addEventListener('message', () => {
      // setTimeout(() => {
        if (this.state !== PENDING) {
          return;
        } else {
          this.state = FULFILLED;
          this.value = value;

          this.onFulFilledCallbacks.map(cb => {
            this.value = cb(this.value);
          });
        }
      });
      window.postMessage('');
    }

    const reject = (reason) => {
      window.addEventListener('message', () => {
      // setTimeout(() => {
        if (this.state !== PENDING) {
          return;
        } else {
          this.state = REJECTED;
          this.reason = reason;

          this.onRejectedCallbacks.map(cb => {
            this.reason = cb(this.reason);
          })
        }
      });
      window.postMessage('');
    }

    try {
      fn(resolve, reject);
    } catch(e) {
      reject(e);
    }
  }

  then(onFulfiled, onRejected) {
    let promise2;

    onFulfiled = typeof onFulfiled === 'function'
      ? onFulfiled : (value) => value;

    onRejected = typeof onRejected === 'function'
      ? onRejected : (reason) => { throw reason };

    if (this.state === FULFILLED) {
      return (promise2 = new Bromise((resolve, reject) => {
        window.addEventListener('message', () => {
          try {
            let x = onFulfiled(this.value);
            resolvePromise(promise2, x, resolve, reject);
          } catch(e) {
            reject(e);
          }
        });
        window.postMessage('');
      }));
    }

    if (this.state === REJECTED) {
      return (promise2 = new Bromise((resolve, reject) => {
        window.addEventListener('message', () => {
          try {
            let x = onRejected(this.reason);
            resolvePromise(promise2, x, resolve, reject);
          } catch(e) {
            reject(e);
          }
        });
        window.postMessage('');
      }))
    }

    if (this.state === PENDING) {
      return (promise2 = new Bromise((resolve, reject) => {
        this.onFulFilledCallbacks.push((value) => {
          try {
            let x = onFulfiled(value);
            resolvePromise(promise2, x, resolve, reject);
          } catch(e) {
            reject(e);
          }
        });

        this.onRejectedCallbacks.push((reason) => {
          try {
            let x = onRejected(reason);
            resolvePromise(promise2, x, resolve, reject);
          } catch(e) {
            reject(e);
          }
        })
      }))
    }
  }

  catch(onRejected) {
    return this.then(null, onRejected);
  }
}

function resolvePromise(currPromise, x, resolve, reject) {
  if (x === currPromise) {
    reject(new TypeError('circular Reference'));
  }
  if (x instanceof Bromise) {
    if (x.state === PENDING) {
      x.then(
        y => {
          resolvePromise(currPromise, y, resolve, reject);
        },
        reason => {
          reject(reason);
        }
      )
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
            resolvePromise(currPromise, y, resolve, reject);
          },
          reason => {
            if (called) return;
            called = true;
            reject(reason);
          }
        )
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

Bromise.resolve = (args) => {
  if (args instanceof Bromise) {
    return args;
  }

  return new Bromise((resolve) => resolve(args));
}

Bromise.reject = (reason) => {
  return new Bromise((resolve, reject) => {
    reject(reason);
  })
}

Bromise.finally = (fn) => {
  return this.then((value) => {
    return new Bromise.resolve(fn()).then(() => value);
  }, (reason) => {
    return new Bromise.resolve(fn()).then(() => { throw reason });
  })
}

Bromise.all = (fns) => {
  return new Bromise((resolve, reject) => {
    let count = 0;
    let res = [];
    fns.forEach((fn, index) => {
      fn.then((val) => {
        count++;
        res[index] = val;
        if (count === fns.length) {
          resolve(res);
        }
      }, (reason) => {
        reject(reason);
      });
    });
  });
}

Bromise.race = (fns) => {
  return new Bromise((resolve, reject) => {
    fns.forEach((fn) => {
      fn.then(resolve, reject);
    })
  })
}

Bromise.allSettled = (promiseList) => {
  return new Bromise((resolve, reject) => {
    const len = promiseList.length;
    let count = 0;
    let result = [];

    if (len === 0) return resolve(result);

    promiseList.forEach((promise, index) => {
      promise.then((value) => {
        count++;
        result[index] = {
          status: 'fulfilled',
          value,
        };
        if (count === len) resolve(result);
      }, (reason) => {
        count++;
        result[index] = {
          status: 'rejected',
          reason,
        };
        if (count === len) resolve(result);
      })
    })
  })
}

Bromise.any = (promiseList) => {
  const len = promiseList.length;
  let rejectArr = [];

  return new Bromise((resolve, reject) => {
    promiseList.forEach((promise, index) => {
      promise.then((res) => {
        resolve(res);
      }).catch((err) => {
        rejectArr[index] = err;
        if (rejectArr.length === len) {
          reject(new Error(rejectArr));
        }
      });
    });
  });
}

export default Bromise;