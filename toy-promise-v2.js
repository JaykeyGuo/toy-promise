

class ToyPromise {

  static PENDING = 'pending';
  static FULFILLED = 'fulfilled';
  static REJECTED = 'rejected';

  constructor(handler) {
    if (typeof handler !== 'function') {
      throw new TypeError('Promise resolver undefined is not a function');
    }

    this.resolvedQueues = [];
    this.rejectedQueues = [];

    this.status = ToyPromise.PENDING;
    this.value;

    handler(this._resolve.bind(this), this._reject.bind(this));
  }

  _resolve(val) {
    console.log(this)
    window.addEventListener('message', () => {
      console.log(this)
      if (this.status !== ToyPromise.PENDING) return;
      this.status = ToyPromise.FULFILLED;
      this.value = val;

      let handler;
      while(handler = this.resolvedQueues.shift()) {
        handler(this.value);
      }
    });
    window.postMessage('');
  }

  _reject() {
    window.addEventListener('message', () => {
      if (this.status !== ToyPromise.PENDING) return;
      this.status = ToyPromise.REJECTED;

      let handler;
      while(handler = this.rejectedQueues.shift()) {
        handler();
      }
    });
    window.postMessage('');
  }

  then(resolveHandler, rejectedHandler) {
    return new ToyPromise((resolve, reject) => {
      function newResolvedHandler(val) {
        let result = resolveHandler(val);

        if (result instanceof ToyPromise) {
          result.then(resolve, reject);
        } else {
          resolve(result);
        }
      }

      function newRejectedHandler(val) {
        let result = rejectedHandler();
        reject(result);
      }
      this.resolvedQueues.push(newResolvedHandler);
      this.rejectedQueues.push(newRejectedHandler);

    })
  }
}

export default ToyPromise